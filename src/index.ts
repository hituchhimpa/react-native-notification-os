import { RNNOSCore } from './core/RNNOSCore';
import { defaultChatEngine } from './engines/ChatEngine';
import { defaultCommerceEngine } from './engines/CommerceEngine';
import { defaultBadgeEngine } from './engines/BadgeEngine';
import { defaultRulesEngine } from './core/RulesEngine';
import { defaultSmartRouter } from './core/SmartRouter';
import { defaultPluginManager } from './plugins/PluginManager';

export * from './types';
export * from './hooks';
export * from './components/NotificationBanner';

export const RNNOS = {
  // Initialization & Permission
  initialize: RNNOSCore.initialize.bind(RNNOSCore),
  requestPermission: RNNOSCore.requestPermission.bind(RNNOSCore),
  checkPermissionStatus: RNNOSCore.checkPermissionStatus.bind(RNNOSCore),
  openNotificationSettings: RNNOSCore.openNotificationSettings.bind(RNNOSCore),
  getFCMToken: RNNOSCore.getFCMToken.bind(RNNOSCore),
  onTokenRefresh: RNNOSCore.onTokenRefresh.bind(RNNOSCore),

  // Notification Operations
  presentNotification: RNNOSCore.presentNotification.bind(RNNOSCore),
  scheduleNotification: RNNOSCore.scheduleNotification.bind(RNNOSCore),
  cancelScheduledNotification: RNNOSCore.cancelScheduledNotification.bind(RNNOSCore),
  cancelAllScheduledNotifications: RNNOSCore.cancelAllScheduledNotifications.bind(RNNOSCore),
  dismissNotification: RNNOSCore.dismissNotification.bind(RNNOSCore),
  dismissAllNotifications: RNNOSCore.dismissAllNotifications.bind(RNNOSCore),
  getDeliveredNotifications: RNNOSCore.getDeliveredNotifications.bind(RNNOSCore),

  // Cold Launch & Initial Notification
  getInitialNotification: RNNOSCore.getInitialNotification.bind(RNNOSCore),

  // In-App Toast & Banners
  showInAppBanner: RNNOSCore.showInAppBanner.bind(RNNOSCore),
  onInAppBanner: RNNOSCore.onInAppBanner.bind(RNNOSCore),

  // Event Listeners
  onNotificationReceived: RNNOSCore.onNotificationReceived.bind(RNNOSCore),
  onNotificationTapped: RNNOSCore.onNotificationTapped.bind(RNNOSCore),
  onInlineReply: RNNOSCore.onInlineReply.bind(RNNOSCore),
  setNavigationHandler: RNNOSCore.setNavigationHandler.bind(RNNOSCore),

  // Universal Payload Normalizer
  normalizePayload: RNNOSCore.normalizePayload.bind(RNNOSCore),

  // History & Inbox
  getNotificationHistory: RNNOSCore.getNotificationHistory.bind(RNNOSCore),
  clearNotificationHistory: RNNOSCore.clearNotificationHistory.bind(RNNOSCore),

  // Specialized Domain Engines
  Chat: defaultChatEngine,
  Commerce: defaultCommerceEngine,
  Badge: defaultBadgeEngine,
  Rules: defaultRulesEngine,
  Router: defaultSmartRouter,
  Plugins: defaultPluginManager,
};

export default RNNOS;
