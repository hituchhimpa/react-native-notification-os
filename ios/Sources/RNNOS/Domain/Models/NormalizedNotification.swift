import Foundation

public enum NotificationPriority: String, Codable {
    case MIN, LOW, DEFAULT, HIGH, MAX
}

public enum NotificationType: String, Codable {
    case GENERIC, CHAT, COMMERCE, MEDIA, PROGRESS
}

public struct NotificationAction: Codable {
    public let id: String
    public let title: String
    public let type: String // BUTTON, TEXT_INPUT, DESTRUCTIVE
    public let placeholder: String?
    public let authenticationRequired: Bool?
}

public struct ChatMessage: Codable {
    public let id: String
    public let text: String
    public let timestamp: Double
    public let senderId: String
    public let senderName: String
    public let senderAvatar: String?
}

public struct ChatConversation: Codable {
    public let threadId: String
    public let senderId: String
    public let senderName: String
    public let senderAvatar: String?
    public let isGroup: Bool
    public let groupName: String?
    public let messages: [ChatMessage]
    public let unreadCount: Int?
}

public struct CommerceProgress: Codable {
    public let orderId: String
    public let currentStep: Int
    public let totalSteps: Int
    public let stepName: String
    public let progressPercent: Int
    public let estimatedDelivery: String?
    public let statusText: String?
    public let trackerUrl: String?
}

public struct NormalizedNotification: Codable {
    public let id: String
    public let messageId: String
    public let collapseKey: String?
    public let threadId: String?
    public let category: String?
    public let title: String
    public let body: String
    public let subtitle: String?
    public let badge: Int?
    public let sound: String?
    public let priority: NotificationPriority
    public let avatar: String?
    public let imageUrl: String?
    public let deepLink: String?
    public let data: [String: String]
    public let actions: [NotificationAction]
    public let timestamp: Double
    public let type: NotificationType
    public let commerceMetadata: CommerceProgress?
    public let chatMetadata: ChatConversation?
    public let isRead: Bool?
    public let isSuppressed: Bool?

    public static func parse(jsonString: String) -> NormalizedNotification? {
        guard let data = jsonString.data(using: .utf8) else { return nil }
        let decoder = JSONDecoder()
        return try? decoder.decode(NormalizedNotification.self, from: data)
    }

    public func toJsonString() -> String? {
        let encoder = JSONEncoder()
        guard let data = try? encoder.encode(self) else { return nil }
        return String(data: data, encoding: .utf8)
    }
}
