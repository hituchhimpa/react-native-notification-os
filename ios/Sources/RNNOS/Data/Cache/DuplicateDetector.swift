import Foundation

public final class DuplicateDetector {
    public static let shared = DuplicateDetector()
    
    private var seenMessageIds: [String: Date] = [:]
    private var collapseKeys: [String: String] = [:]
    private let lock = NSLock()
    private let defaultTtlSeconds: TimeInterval = 60.0

    private init() {}

    public func isDuplicate(notification: NormalizedNotification) -> Bool {
        lock.lock()
        defer { lock.unlock() }

        let now = Date()
        if let previousDate = seenMessageIds[notification.messageId] {
            if now.timeIntervalSince(previousDate) < defaultTtlSeconds {
                return true
            }
        }

        seenMessageIds[notification.messageId] = now
        return false
    }

    public func recordCollapseKey(collapseKey: String?, notificationId: String) {
        guard let collapseKey = collapseKey, !collapseKey.isEmpty else { return }
        lock.lock()
        defer { lock.unlock() }
        collapseKeys[collapseKey] = notificationId
    }

    public func getNotificationId(for collapseKey: String?) -> String? {
        guard let collapseKey = collapseKey, !collapseKey.isEmpty else { return nil }
        lock.lock()
        defer { lock.unlock() }
        return collapseKeys[collapseKey]
    }
}
