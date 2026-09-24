import Foundation

public final class CommerceEngine {
    public static let shared = CommerceEngine()

    private var activeOrders: [String: CommerceProgress] = [:]
    private let lock = NSLock()

    private init() {}

    public func updateOrderProgress(notification: NormalizedNotification) {
        guard let commerce = notification.commerceMetadata else { return }

        lock.lock()
        activeOrders[commerce.orderId] = commerce
        lock.unlock()

        // Render updated status with continuous single ID
        NotificationRenderer.shared.render(notification: notification)
    }

    public func getOrderProgress(orderId: String) -> CommerceProgress? {
        lock.lock()
        defer { lock.unlock() }
        return activeOrders[orderId]
    }
}
