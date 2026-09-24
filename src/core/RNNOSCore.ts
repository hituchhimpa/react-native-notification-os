import { DeviceEventEmitter, NativeEventEmitter, Platform } from 'react-native';
import {
  NormalizedNotification,
  RNNOSConfig,
  NotificationTrigger,
} from '../types/NormalizedNotification';
import NativeRNNOSModule from '../native/NativeRNNOSModule';
import { defaultRulesEngine, RulesEngine } from './RulesEngine';
import { defaultSmartRouter, SmartRouter } from './SmartRouter';
import { defaultPluginManager, PluginManager } from '../plugins/PluginManager';
import { defaultChatEngine } from '../engines/ChatEngine';
import { defaultCommerceEngine } from '../engines/CommerceEngine';
import { defaultBadgeEngine } from '../engines/BadgeEngine';

export class RNNOSCoreClass {
  private isInitialized = false;
  private config: RNNOSConfig | null = null;
  private rulesEngine: RulesEngine = defaultRulesEngine;
  private smartRouter: SmartRouter = defaultSmartRouter;
  private pluginManager: PluginManager = defaultPluginManager;

  private receivedListeners: Array<(notification: NormalizedNotification) => void> = [];
  private tappedListeners: Array<(notification: NormalizedNotification, actionId?: string) => void> = [];
  private bannerListeners: Array<(notification: NormalizedNotification) => void> = [];
  private tokenRefreshListeners: Array<(token: string) => void> = [];
  private inlineReplyListeners: Array<(threadId: string, replyText: string) => void> = [];

  private eventEmitter: any = null;

  constructor() {
    this.setupNativeEventListeners();
  }

  private setupNativeEventListeners(): void {
    try {
      this.eventEmitter = Platform.OS === 'ios'
        ? new NativeEventEmitter(NativeRNNOSModule as any)
        : DeviceEventEmitter;

      // 1. Notification Received Event
      this.eventEmitter.addListener('RNNOS_NotificationReceived', (payload: any) => {
        try {
          const notification = payload.notificationJson
            ? this.normalizePayload(JSON.parse(payload.notificationJson))
            : this.normalizePayload(payload);

          this.handleIncomingNotification(notification);
        } catch (e) {
          console.warn('[RNNOS Core] Error processing RNNOS_NotificationReceived', e);
        }
      });

      // 2. Action / Notification Tapped Event
      this.eventEmitter.addListener('RNNOS_ActionTapped', (payload: any) => {
        try {
          const notif = payload.notificationJson
            ? this.normalizePayload(JSON.parse(payload.notificationJson))
            : this.normalizePayload({
                id: payload.notificationId,
                deepLink: payload.deepLink,
                title: payload.title || '',
                body: payload.body || '',
                data: payload,
              });

          this.handleNotificationTap(notif, payload.actionId);
        } catch (e) {
          console.warn('[RNNOS Core] Error processing RNNOS_ActionTapped', e);
        }
      });

      // 3. Inline Reply Event
      this.eventEmitter.addListener('RNNOS_InlineReply', ({ threadId, replyText }: any) => {
        if (threadId && replyText) {
          defaultChatEngine.appendUserReply(threadId, replyText);
          this.inlineReplyListeners.forEach((cb) => cb(threadId, replyText));
        }
      });

      // 4. Token Refresh Event
      this.eventEmitter.addListener('RNNOS_FCMTokenRefresh', ({ token }: any) => {
        if (token) {
          this.tokenRefreshListeners.forEach((cb) => cb(token));
        }
      });
    } catch (e) {
      console.warn('[RNNOS Core] Native event listeners setup fallback', e);
    }
  }

  public async initialize(config: RNNOSConfig): Promise<boolean> {
    if (this.isInitialized) return true;
    this.config = config;

    // Automatic zero-config permission request & FCM Token retrieval
    try {
      await this.requestPermission();
      const token = await this.getFCMToken();
      if (token && __DEV__) {
        console.log('[RNNOS Core] FCM Token retrieved:', token);
      }
    } catch (_e) {}

    if (config.rules) {
      config.rules.forEach((rule) => this.rulesEngine.registerRule(rule));
    }

    if (config.plugins) {
      config.plugins.forEach((plugin) => this.pluginManager.registerPlugin(plugin));
    }

    if (config.channels) {
      for (const ch of config.channels) {
        await NativeRNNOSModule.createChannel(JSON.stringify(ch));
      }
    }

    // Check cold start initial notification
    this.getInitialNotification().catch(() => {});

    try {
      const res = await NativeRNNOSModule.initialize(JSON.stringify(config));
      this.isInitialized = res;
      return res;
    } catch (e) {
      console.warn('[RNNOS Core] Initialize fallback', e);
      this.isInitialized = true;
      return true;
    }
  }

  public async getInitialNotification(): Promise<NormalizedNotification | null> {
    try {
      const raw = await NativeRNNOSModule.getInitialNotification();
      if (!raw) return null;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const notification = this.normalizePayload(parsed);

      if (notification) {
        this.smartRouter.handleNotificationTap(notification);
        this.tappedListeners.forEach((cb) => cb(notification));
      }
      return notification;
    } catch (e) {
      return null;
    }
  }

  public async presentNotification(rawNotification: NormalizedNotification): Promise<boolean> {
    // 1. Plugin Hook: Push Received
    const notification = await this.pluginManager.notifyPushReceived(rawNotification);

    // 2. Evaluate Rules Engine
    const activeChatId = defaultChatEngine.getActiveThreadId() || undefined;
    const ruleResult = this.rulesEngine.evaluate(notification, {
      activeChatId,
      isForeground: true,
    });

    if (ruleResult.action === 'SUPPRESS' || ruleResult.action === 'SUPPRESS_AND_INJECT') {
      if (notification.type === 'CHAT') {
        defaultChatEngine.handleIncomingChatMessage(notification);
      }
      this.notifyReceivedListeners(notification);
      return false;
    }

    // 3. Dispatch to Specialized Domain Engines
    if (notification.type === 'CHAT') {
      defaultChatEngine.handleIncomingChatMessage(notification);
    } else if (notification.type === 'COMMERCE') {
      defaultCommerceEngine.handleOrderUpdate(notification);
    }

    // 4. Update Badge
    if (notification.badge !== undefined) {
      defaultBadgeEngine.setBadgeCount(notification.badge);
    } else {
      defaultBadgeEngine.incrementBadge(1);
    }

    // 5. Present natively via TurboModule
    try {
      const success = await NativeRNNOSModule.presentNotification(JSON.stringify(notification));
      this.notifyReceivedListeners(notification);
      this.triggerInAppBannerIfEligible(notification);
      return success;
    } catch (e) {
      console.warn('[RNNOS Core] Failed native presentNotification', e);
      this.notifyReceivedListeners(notification);
      this.triggerInAppBannerIfEligible(notification);
      return false;
    }
  }

  public async scheduleNotification(
    rawNotification: NormalizedNotification,
    trigger: NotificationTrigger
  ): Promise<boolean> {
    const notification = this.normalizePayload(rawNotification);
    const delaySeconds =
      trigger.type === 'TIMESTAMP'
        ? Math.max(1, Math.round((trigger.timestamp - Date.now()) / 1000))
        : Math.max(1, trigger.intervalSeconds);
    const repeats = trigger.type === 'INTERVAL' ? (trigger.repeats ?? false) : false;

    try {
      return await NativeRNNOSModule.scheduleNotification(
        JSON.stringify(notification),
        delaySeconds,
        repeats
      );
    } catch (e) {
      console.warn('[RNNOS Core] Failed scheduleNotification', e);
      return false;
    }
  }

  public async cancelScheduledNotification(id: string): Promise<boolean> {
    try {
      return await NativeRNNOSModule.cancelScheduledNotification(id);
    } catch (e) {
      return false;
    }
  }

  public async cancelAllScheduledNotifications(): Promise<boolean> {
    try {
      return await NativeRNNOSModule.cancelAllScheduledNotifications();
    } catch (e) {
      return false;
    }
  }

  public async dismissNotification(id: string): Promise<boolean> {
    try {
      const res = await NativeRNNOSModule.dismissNotification(id);
      this.pluginManager.notifyNotificationDismissed(id);
      return res;
    } catch (e) {
      return false;
    }
  }

  public async dismissAllNotifications(): Promise<boolean> {
    try {
      return await NativeRNNOSModule.dismissAllNotifications();
    } catch (e) {
      return false;
    }
  }

  public async getDeliveredNotifications(): Promise<NormalizedNotification[]> {
    try {
      const json = await NativeRNNOSModule.getDeliveredNotifications();
      return json ? JSON.parse(json) : [];
    } catch (e) {
      return [];
    }
  }

  public async getNotificationHistory(limit = 50, offset = 0): Promise<NormalizedNotification[]> {
    try {
      const json = await NativeRNNOSModule.getNotificationHistory(limit, offset);
      return json ? JSON.parse(json) : [];
    } catch (e) {
      return [];
    }
  }

  public async clearNotificationHistory(): Promise<boolean> {
    try {
      return await NativeRNNOSModule.clearNotificationHistory();
    } catch (e) {
      return false;
    }
  }

  public async requestPermission(): Promise<boolean> {
    try {
      return await NativeRNNOSModule.requestNotificationPermission();
    } catch (e) {
      return false;
    }
  }

  public async checkPermissionStatus(): Promise<'GRANTED' | 'DENIED' | 'NOT_DETERMINED'> {
    try {
      return await NativeRNNOSModule.checkPermissionStatus();
    } catch (e) {
      return 'DENIED';
    }
  }

  public async openNotificationSettings(): Promise<boolean> {
    try {
      return await NativeRNNOSModule.openNotificationSettings();
    } catch (e) {
      return false;
    }
  }

  public async getFCMToken(): Promise<string> {
    try {
      return await NativeRNNOSModule.getFCMToken();
    } catch (e) {
      return '';
    }
  }

  public onTokenRefresh(callback: (token: string) => void): () => void {
    this.tokenRefreshListeners.push(callback);
    return () => {
      this.tokenRefreshListeners = this.tokenRefreshListeners.filter((cb) => cb !== callback);
    };
  }

  public onInlineReply(callback: (threadId: string, replyText: string) => void): () => void {
    this.inlineReplyListeners.push(callback);
    return () => {
      this.inlineReplyListeners = this.inlineReplyListeners.filter((cb) => cb !== callback);
    };
  }

  public handleNotificationTap(notification: NormalizedNotification, actionId?: string): void {
    this.pluginManager.notifyNotificationTapped(notification, actionId);
    this.smartRouter.handleNotificationTap(notification, actionId);
    this.tappedListeners.forEach((cb) => cb(notification, actionId));
  }

  public setNavigationHandler(handler: (deepLink: string, data: Record<string, any>) => void): void {
    this.smartRouter.setNavigationHandler(handler);
  }

  public onNotificationReceived(callback: (notification: NormalizedNotification) => void): () => void {
    this.receivedListeners.push(callback);
    return () => {
      this.receivedListeners = this.receivedListeners.filter((cb) => cb !== callback);
    };
  }

  public onNotificationTapped(
    callback: (notification: NormalizedNotification, actionId?: string) => void
  ): () => void {
    this.tappedListeners.push(callback);
    return () => {
      this.tappedListeners = this.tappedListeners.filter((cb) => cb !== callback);
    };
  }

  public onInAppBanner(callback: (notification: NormalizedNotification) => void): () => void {
    this.bannerListeners.push(callback);
    return () => {
      this.bannerListeners = this.bannerListeners.filter((cb) => cb !== callback);
    };
  }

  public showInAppBanner(notification: NormalizedNotification): void {
    this.bannerListeners.forEach((cb) => cb(notification));
  }

  private handleIncomingNotification(notification: NormalizedNotification): void {
    if (notification.type === 'CHAT') {
      defaultChatEngine.handleIncomingChatMessage(notification);
    } else if (notification.type === 'COMMERCE') {
      defaultCommerceEngine.handleOrderUpdate(notification);
    }
    this.notifyReceivedListeners(notification);
    this.triggerInAppBannerIfEligible(notification);
  }

  private triggerInAppBannerIfEligible(notification: NormalizedNotification): void {
    const bannerConfig = this.config?.inAppBanner;
    if (bannerConfig?.enabled !== false) {
      this.bannerListeners.forEach((cb) => cb(notification));
    }
  }

  private notifyReceivedListeners(notification: NormalizedNotification): void {
    this.receivedListeners.forEach((cb) => cb(notification));
  }

  /**
   * Universal Payload Normalizer:
   * Accepts FCM RemoteMessage, APNs payload, OneSignal payload, or custom backend JSON
   * and normalizes it into a strongly-typed NormalizedNotification.
   */
  public normalizePayload(raw: any): NormalizedNotification {
    if (!raw) {
      throw new Error('[RNNOS] Cannot normalize null or undefined payload');
    }

    const data = raw.data || raw.custom?.a || {};
    const notification = raw.notification || raw.aps?.alert || {};

    const id =
      raw.id ||
      data.id ||
      raw.messageId ||
      data.messageId ||
      `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const messageId = raw.messageId || data.messageId || id;
    const title =
      raw.title ||
      notification.title ||
      data.title ||
      (typeof raw.aps?.alert === 'string' ? raw.aps.alert : '') ||
      '';
    const body =
      raw.body ||
      notification.body ||
      data.body ||
      raw.aps?.alert?.body ||
      '';

    const deepLink =
      raw.deepLink ||
      data.deepLink ||
      data.url ||
      data.link ||
      raw.url ||
      undefined;

    const threadId = raw.threadId || data.threadId || raw.aps?.['thread-id'] || undefined;
    const category = raw.category || data.category || raw.aps?.category || undefined;

    // Parse commerce metadata if stringified
    let commerceMetadata = raw.commerceMetadata || data.commerceMetadata;
    if (typeof commerceMetadata === 'string') {
      try {
        commerceMetadata = JSON.parse(commerceMetadata);
      } catch (_e) {}
    }

    // Parse chat metadata if stringified
    let chatMetadata = raw.chatMetadata || data.chatMetadata;
    if (typeof chatMetadata === 'string') {
      try {
        chatMetadata = JSON.parse(chatMetadata);
      } catch (_e) {}
    }

    // Parse actions if stringified
    let actions = raw.actions || data.actions;
    if (typeof actions === 'string') {
      try {
        actions = JSON.parse(actions);
      } catch (_e) {}
    }

    const type = (raw.type || data.type || (commerceMetadata ? 'COMMERCE' : chatMetadata ? 'CHAT' : 'GENERIC')).toUpperCase();
    const priority = (raw.priority || data.priority || 'DEFAULT').toUpperCase();

    return {
      id: String(id),
      messageId: String(messageId),
      collapseKey: raw.collapseKey || data.collapseKey,
      threadId: threadId ? String(threadId) : undefined,
      category: category ? String(category) : undefined,
      title: String(title),
      body: String(body),
      subtitle: raw.subtitle || notification.subtitle || data.subtitle,
      badge: raw.badge !== undefined ? Number(raw.badge) : raw.aps?.badge,
      sound: raw.sound || notification.sound || data.sound || raw.aps?.sound,
      priority: ['MIN', 'LOW', 'DEFAULT', 'HIGH', 'MAX'].includes(priority) ? priority : 'DEFAULT',
      avatar: raw.avatar || data.avatar,
      imageUrl: raw.imageUrl || data.imageUrl || notification.imageUrl || notification.android?.imageUrl,
      color: raw.color || data.color,
      useCustomLayout: Boolean(raw.useCustomLayout || data.useCustomLayout),
      gradientColors: raw.gradientColors || data.gradientColors,
      deepLink: deepLink ? String(deepLink) : undefined,
      data: typeof data === 'object' ? data : {},
      actions: Array.isArray(actions) ? actions : undefined,
      timestamp: raw.timestamp ? Number(raw.timestamp) : Date.now(),
      type: ['GENERIC', 'CHAT', 'COMMERCE', 'MEDIA', 'PROGRESS'].includes(type) ? type : 'GENERIC',
      commerceMetadata,
      chatMetadata,
      mediaMetadata: raw.mediaMetadata || data.mediaMetadata,
      isRead: Boolean(raw.isRead),
      isSuppressed: Boolean(raw.isSuppressed),
      silentUpdate: Boolean(raw.silentUpdate || data.silentUpdate),
    };
  }
}

export const RNNOSCore = new RNNOSCoreClass();
