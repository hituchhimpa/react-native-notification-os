import { NativeModules, TurboModuleRegistry, Platform } from 'react-native';
import type { TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  // Initialization & Configuration
  initialize(configJson: string): Promise<boolean>;
  requestNotificationPermission(): Promise<boolean>;
  checkPermissionStatus(): Promise<'GRANTED' | 'DENIED' | 'NOT_DETERMINED'>;
  openNotificationSettings(): Promise<boolean>;
  getFCMToken(): Promise<string>;
  getInitialNotification(): Promise<string | null>;

  // Notification Management
  presentNotification(notificationJson: string): Promise<boolean>;
  scheduleNotification(notificationJson: string, delaySeconds: number, repeats: boolean): Promise<boolean>;
  cancelScheduledNotification(id: string): Promise<boolean>;
  cancelAllScheduledNotifications(): Promise<boolean>;
  dismissNotification(id: string): Promise<boolean>;
  dismissAllNotifications(): Promise<boolean>;
  getDeliveredNotifications(): Promise<string>; // JSON array of NormalizedNotification

  // Channels (Android)
  createChannel(channelJson: string): Promise<boolean>;

  // Badge Operations
  setBadgeCount(count: number): Promise<boolean>;
  getBadgeCount(): Promise<number>;

  // Storage & History
  getNotificationHistory(limit: number, offset: number): Promise<string>;
  clearNotificationHistory(): Promise<boolean>;

  // Event Emitter Support
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

const createFallbackModule = (): Spec => {
  return {
    initialize: async () => true,
    requestNotificationPermission: async () => false,
    checkPermissionStatus: async () => 'NOT_DETERMINED',
    openNotificationSettings: async () => false,
    getFCMToken: async () => '',
    getInitialNotification: async () => null,
    presentNotification: async () => false,
    scheduleNotification: async () => false,
    cancelScheduledNotification: async () => false,
    cancelAllScheduledNotifications: async () => false,
    dismissNotification: async () => false,
    dismissAllNotifications: async () => false,
    getDeliveredNotifications: async () => '[]',
    createChannel: async () => true,
    setBadgeCount: async () => false,
    getBadgeCount: async () => 0,
    getNotificationHistory: async () => '[]',
    clearNotificationHistory: async () => true,
    addListener: () => {},
    removeListeners: () => {},
  };
};

let nativeModule: Spec = createFallbackModule();

try {
  // 1. Try TurboModule Registry (New Architecture)
  const turbo = TurboModuleRegistry.get<Spec>('RNNOSTurboModule');
  if (turbo) {
    nativeModule = turbo;
  } else if (NativeModules.RNNOSTurboModule) {
    // 2. Try classic NativeModules (Old Architecture / Bridge)
    nativeModule = NativeModules.RNNOSTurboModule as Spec;
  } else if (__DEV__) {
    console.warn(
      `[RNNOS] Native RNNOSTurboModule not found on ${Platform.OS}. ` +
      'Using mock fallback. Ensure native dependencies are installed and built (e.g. pod install).'
    );
  }
} catch (_e) {
  if (NativeModules.RNNOSTurboModule) {
    nativeModule = NativeModules.RNNOSTurboModule as Spec;
  }
}

export default nativeModule;
