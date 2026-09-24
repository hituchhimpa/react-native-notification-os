import Foundation
import UserNotifications
import UIKit

@objc public final class NotificationRenderer: NSObject, UNUserNotificationCenterDelegate {
    @objc public static let shared = NotificationRenderer()

    public typealias EventEmitterBlock = (String, [String: Any]) -> Void
    public var eventEmitter: EventEmitterBlock?

    @objc public func setEventEmitterHandler(_ handler: @escaping (String, [String: Any]) -> Void) {
        self.eventEmitter = handler
    }

    @objc public var initialNotificationJson: String? = nil

    private let lock = NSLock()
    private let historyKey = "rnnos_notification_history"
    private let maxHistoryCount = 200

    private override init() {
        super.init()
        UNUserNotificationCenter.current().delegate = self
    }

    // MARK: - Permissions

    @objc public func requestPermissions(completion: @escaping (Bool) -> Void) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound, .provisional]) { granted, error in
            if granted {
                DispatchQueue.main.async {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            }
            completion(granted)
        }
    }

    // MARK: - Presentation

    @objc public func presentNotification(jsonString: String, completion: @escaping (Bool, String?) -> Void) {
        guard let notification = NormalizedNotification.parse(jsonString: jsonString) else {
            completion(false, "Invalid JSON payload")
            return
        }

        if DuplicateDetector.shared.isDuplicate(notification: notification) {
            completion(false, "Duplicate notification suppressed")
            return
        }

        // Record into history
        recordToHistory(notification: notification)

        // Dispatch domain-specific handling
        switch notification.type {
        case .CHAT:
            ChatEngine.shared.processChatMessage(notification: notification)
            completion(true, nil)
            return
        case .COMMERCE:
            CommerceEngine.shared.updateOrderProgress(notification: notification)
            completion(true, nil)
            return
        default:
            break
        }

        render(notification: notification) { success in
            completion(success, success ? nil : "Failed to post notification")
        }
    }

    public func render(notification: NormalizedNotification, completion: ((Bool) -> Void)? = nil) {
        let content = UNMutableNotificationContent()
        content.title = notification.title
        content.body = notification.body
        if let subtitle = notification.subtitle {
            content.subtitle = subtitle
        }
        if let badge = notification.badge {
            content.badge = NSNumber(value: badge)
        }
        if let soundName = notification.sound, !soundName.isEmpty {
            content.sound = UNNotificationSound(named: UNNotificationSoundName(rawValue: soundName))
        } else {
            content.sound = .default
        }
        if let threadId = notification.threadId {
            content.threadIdentifier = threadId
        }

        // Category Identifier & Action buttons registration
        let categoryId = notification.category ?? "rnnos_category_\(notification.id)"
        content.categoryIdentifier = categoryId
        registerCategory(categoryId: categoryId, actions: notification.actions)

        // Store full metadata in userInfo
        var userInfo: [String: Any] = notification.data
        userInfo["id"] = notification.id
        userInfo["messageId"] = notification.messageId
        userInfo["type"] = notification.type.rawValue
        if let threadId = notification.threadId { userInfo["threadId"] = threadId }
        if let deepLink = notification.deepLink { userInfo["deepLink"] = deepLink }
        if let jsonStr = notification.toJsonString() { userInfo["rnnos_payload"] = jsonStr }
        content.userInfo = userInfo

        // Handle Image Attachment
        if let imageUrlStr = notification.imageUrl, let url = URL(string: imageUrlStr) {
            downloadImage(url: url) { [weak self] localUrl in
                if let localUrl = localUrl, let attachment = try? UNNotificationAttachment(identifier: "image", url: localUrl, options: nil) {
                    content.attachments = [attachment]
                }
                self?.postNotificationRequest(id: notification.id, content: content, trigger: nil, completion: completion)
            }
        } else {
            postNotificationRequest(id: notification.id, content: content, trigger: nil, completion: completion)
        }
    }

    // MARK: - Local Notification Scheduling

    @objc public func scheduleNotification(jsonString: String, delaySeconds: Double, repeats: Bool, completion: @escaping (Bool, String?) -> Void) {
        guard let notification = NormalizedNotification.parse(jsonString: jsonString) else {
            completion(false, "Invalid JSON payload")
            return
        }

        let content = UNMutableNotificationContent()
        content.title = notification.title
        content.body = notification.body
        if let subtitle = notification.subtitle { content.subtitle = subtitle }
        if let badge = notification.badge { content.badge = NSNumber(value: badge) }
        content.sound = .default
        if let threadId = notification.threadId { content.threadIdentifier = threadId }

        let categoryId = notification.category ?? "rnnos_category_\(notification.id)"
        content.categoryIdentifier = categoryId
        registerCategory(categoryId: categoryId, actions: notification.actions)

        var userInfo: [String: Any] = notification.data
        userInfo["id"] = notification.id
        if let deepLink = notification.deepLink { userInfo["deepLink"] = deepLink }
        if let jsonStr = notification.toJsonString() { userInfo["rnnos_payload"] = jsonStr }
        content.userInfo = userInfo

        let triggerTime = max(1.0, delaySeconds)
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: triggerTime, repeats: repeats)

        postNotificationRequest(id: notification.id, content: content, trigger: trigger) { success in
            completion(success, success ? nil : "Failed to schedule notification")
        }
    }

    @objc public func cancelScheduledNotification(id: String) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [id])
    }

    @objc public func cancelAllScheduledNotifications() {
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
    }

    // MARK: - Dynamic Category & Actions Setup

    private func registerCategory(categoryId: String, actions: [NotificationAction]) {
        guard !actions.isEmpty else { return }

        var categoryActions: [UNNotificationAction] = []
        for action in actions {
            if action.type == "TEXT_INPUT" {
                let inputAction = UNTextInputNotificationAction(
                    identifier: action.id,
                    title: action.title,
                    options: [],
                    textInputButtonTitle: "Send",
                    textInputPlaceholder: action.placeholder ?? "Reply..."
                )
                categoryActions.append(inputAction)
            } else {
                var options: UNNotificationActionOptions = []
                if action.type == "DESTRUCTIVE" {
                    options.insert(.destructive)
                }
                if action.authenticationRequired == true {
                    options.insert(.authenticationRequired)
                } else {
                    options.insert(.foreground)
                }
                let buttonAction = UNNotificationAction(identifier: action.id, title: action.title, options: options)
                categoryActions.append(buttonAction)
            }
        }

        let category = UNNotificationCategory(
            identifier: categoryId,
            actions: categoryActions,
            intentIdentifiers: [],
            options: [.customDismissAction]
        )

        UNUserNotificationCenter.current().getNotificationCategories { existing in
            var updated = existing
            updated.insert(category)
            UNUserNotificationCenter.current().setNotificationCategories(updated)
        }
    }

    private func postNotificationRequest(id: String, content: UNMutableNotificationContent, trigger: UNNotificationTrigger?, completion: ((Bool) -> Void)?) {
        let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("[RNNOS] iOS Notification Post Error: \(error.localizedDescription)")
                completion?(false)
            } else {
                completion?(true)
            }
        }
    }

    private func downloadImage(url: URL, completion: @escaping (URL?) -> Void) {
        let task = URLSession.shared.downloadTask(with: url) { location, _, error in
            guard let location = location, error == nil else {
                completion(nil)
                return
            }
            let tmpDirectory = FileManager.default.temporaryDirectory
            let targetUrl = tmpDirectory.appendingPathComponent(UUID().uuidString + ".jpg")
            do {
                try FileManager.default.moveItem(at: location, to: targetUrl)
                completion(targetUrl)
            } catch {
                completion(nil)
            }
        }
        task.resume()
    }

    // MARK: - UNUserNotificationCenterDelegate

    public func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        let userInfo = notification.request.content.userInfo

        var eventPayload: [String: Any] = [
            "id": notification.request.identifier,
            "title": notification.request.content.title,
            "body": notification.request.content.body,
        ]
        if let deepLink = userInfo["deepLink"] as? String {
            eventPayload["deepLink"] = deepLink
        }
        if let category = userInfo["category"] as? String {
            eventPayload["category"] = category
        }
        if let type = userInfo["type"] as? String {
            eventPayload["type"] = type
        }

        eventEmitter?("RNNOS_NotificationReceived", eventPayload)

        // Show banner, play sound and badge in foreground
        if #available(iOS 14.0, *) {
            completionHandler([.banner, .sound, .badge])
        } else {
            completionHandler([.alert, .sound, .badge])
        }
    }

    public func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        let notificationId = response.notification.request.identifier
        let actionId = response.actionIdentifier == UNNotificationDefaultActionIdentifier ? nil : response.actionIdentifier

        // 1. Handle Inline Text Reply
        if let textResponse = response as? UNTextInputNotificationResponse {
            let replyText = textResponse.userText
            let threadId = (userInfo["threadId"] as? String) ?? notificationId
            ChatEngine.shared.appendUserReply(threadId: threadId, text: replyText)
            eventEmitter?("RNNOS_InlineReply", ["threadId": threadId, "replyText": replyText])
            completionHandler()
            return
        }

        // 2. Save for Cold Start Initial Notification
        if let payloadStr = userInfo["rnnos_payload"] as? String {
            initialNotificationJson = payloadStr
        } else {
            let dict: [String: Any] = [
                "id": notificationId,
                "title": response.notification.request.content.title,
                "body": response.notification.request.content.body,
                "deepLink": userInfo["deepLink"] ?? "",
                "data": userInfo
            ]
            if let data = try? JSONSerialization.data(withJSONObject: dict),
               let str = String(data: data, encoding: .utf8) {
                initialNotificationJson = str
            }
        }

        // 3. Emit Tap Event
        var eventParams: [String: Any] = [
            "notificationId": notificationId,
        ]
        if let actionId = actionId {
            eventParams["actionId"] = actionId
        }
        if let deepLink = userInfo["deepLink"] as? String {
            eventParams["deepLink"] = deepLink
        }
        if let payloadStr = initialNotificationJson {
            eventParams["notificationJson"] = payloadStr
        }

        eventEmitter?("RNNOS_ActionTapped", eventParams)
        completionHandler()
    }

    // MARK: - Notification History Store

    private func recordToHistory(notification: NormalizedNotification) {
        lock.lock()
        defer { lock.unlock() }

        guard let jsonStr = notification.toJsonString() else { return }
        var list = UserDefaults.standard.stringArray(forKey: historyKey) ?? []
        list.insert(jsonStr, at: 0)
        if list.count > maxHistoryCount {
            list = Array(list.prefix(maxHistoryCount))
        }
        UserDefaults.standard.set(list, forKey: historyKey)
    }

    @objc public func getNotificationHistory(limit: Int, offset: Int) -> String {
        lock.lock()
        defer { lock.unlock() }

        let list = UserDefaults.standard.stringArray(forKey: historyKey) ?? []
        let startIndex = min(offset, list.count)
        let endIndex = min(startIndex + limit, list.count)
        let slice = list[startIndex..<endIndex]
        return "[\(slice.joined(separator: ","))]"
    }

    @objc public func clearNotificationHistory() {
        lock.lock()
        defer { lock.unlock() }
        UserDefaults.standard.removeObject(forKey: historyKey)
    }
}
