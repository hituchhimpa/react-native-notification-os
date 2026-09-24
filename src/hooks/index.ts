import { useEffect, useState, useCallback } from 'react';
import {
  NormalizedNotification,
  ChatConversation,
  CommerceProgress,
} from '../types/NormalizedNotification';
import { defaultChatEngine } from '../engines/ChatEngine';
import { defaultCommerceEngine } from '../engines/CommerceEngine';
import { defaultBadgeEngine } from '../engines/BadgeEngine';
import { RNNOSCore } from '../core/RNNOSCore';

export interface NotificationListenerOptions {
  onReceived?: (notification: NormalizedNotification) => void;
  onTapped?: (notification: NormalizedNotification, actionId?: string) => void;
  onInlineReply?: (threadId: string, replyText: string) => void;
}

/**
 * Listen for notification events: received, tapped, or inline reply submitted.
 */
export function useNotificationListener(
  onReceivedOrOptions?: ((notification: NormalizedNotification) => void) | NotificationListenerOptions,
  onTapped?: (notification: NormalizedNotification, actionId?: string) => void
) {
  useEffect(() => {
    let unsubReceived: (() => void) | undefined;
    let unsubTapped: (() => void) | undefined;
    let unsubReply: (() => void) | undefined;

    if (typeof onReceivedOrOptions === 'function') {
      unsubReceived = RNNOSCore.onNotificationReceived(onReceivedOrOptions);
      if (onTapped) {
        unsubTapped = RNNOSCore.onNotificationTapped(onTapped);
      }
    } else if (onReceivedOrOptions) {
      if (onReceivedOrOptions.onReceived) {
        unsubReceived = RNNOSCore.onNotificationReceived(onReceivedOrOptions.onReceived);
      }
      if (onReceivedOrOptions.onTapped) {
        unsubTapped = RNNOSCore.onNotificationTapped(onReceivedOrOptions.onTapped);
      }
      if (onReceivedOrOptions.onInlineReply) {
        unsubReply = RNNOSCore.onInlineReply(onReceivedOrOptions.onInlineReply);
      }
    }

    return () => {
      if (unsubReceived) unsubReceived();
      if (unsubTapped) unsubTapped();
      if (unsubReply) unsubReply();
    };
  }, [onReceivedOrOptions, onTapped]);
}

/**
 * Manage and subscribe to real-time chat thread state and auto mark-as-read.
 */
export function useChatThread(threadId: string) {
  const [conversation, setConversation] = useState<ChatConversation | null>(null);

  useEffect(() => {
    defaultChatEngine.setActiveThread(threadId);

    const unsubscribe = defaultChatEngine.subscribeThread(threadId, (conv) => {
      setConversation(conv);
    });

    return () => {
      defaultChatEngine.setActiveThread(null);
      unsubscribe();
    };
  }, [threadId]);

  const markRead = useCallback(() => {
    defaultChatEngine.markThreadAsRead(threadId);
  }, [threadId]);

  const sendReply = useCallback(
    (text: string) => {
      defaultChatEngine.appendUserReply(threadId, text);
    },
    [threadId]
  );

  return { conversation, markRead, sendReply };
}

/**
 * Track live commerce order progress and real-time step updates.
 */
export function useCommerceOrder(orderId: string) {
  const [progress, setProgress] = useState<CommerceProgress | undefined>(
    defaultCommerceEngine.getOrderProgress(orderId)
  );

  useEffect(() => {
    const unsubscribe = defaultCommerceEngine.subscribeOrder(orderId, (newProgress) => {
      setProgress(newProgress);
    });

    return () => {
      unsubscribe();
    };
  }, [orderId]);

  return { progress };
}

/**
 * Manage and subscribe to app unread count / badge number.
 */
export function useUnreadCount() {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    const unsubscribe = defaultBadgeEngine.subscribeBadge((newCount) => {
      setCount(newCount);
    });

    defaultBadgeEngine.getBadgeCount().then(setCount);

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    unreadCount: count,
    setBadgeCount: (c: number) => defaultBadgeEngine.setBadgeCount(c),
    incrementBadge: (amt = 1) => defaultBadgeEngine.incrementBadge(amt),
    decrementBadge: (amt = 1) => defaultBadgeEngine.decrementBadge(amt),
  };
}

/**
 * Notification History / Inbox Hook:
 * Retrieve and manage past delivered notifications in the app.
 */
export function useNotificationHistory(limit = 50, offset = 0) {
  const [notifications, setNotifications] = useState<NormalizedNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await RNNOSCore.getNotificationHistory(limit, offset);
      setNotifications(items);
    } catch (_e) {
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [limit, offset]);

  useEffect(() => {
    refresh();

    // Refresh when a new notification is received
    const unsub = RNNOSCore.onNotificationReceived(() => {
      refresh();
    });
    return () => unsub();
  }, [refresh]);

  const clearHistory = useCallback(async () => {
    await RNNOSCore.clearNotificationHistory();
    setNotifications([]);
  }, []);

  return {
    notifications,
    isLoading,
    refresh,
    clearHistory,
  };
}

/**
 * Manage notification permissions with current status checking and deep linking to system settings.
 */
export function usePermissionStatus() {
  const [status, setStatus] = useState<'GRANTED' | 'DENIED' | 'NOT_DETERMINED'>('NOT_DETERMINED');

  const checkStatus = useCallback(async () => {
    const s = await RNNOSCore.checkPermissionStatus();
    setStatus(s);
    return s;
  }, []);

  const requestPermission = useCallback(async () => {
    const granted = await RNNOSCore.requestPermission();
    await checkStatus();
    return granted;
  }, [checkStatus]);

  const openSettings = useCallback(async () => {
    return await RNNOSCore.openNotificationSettings();
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    status,
    isGranted: status === 'GRANTED',
    requestPermission,
    checkStatus,
    openSettings,
  };
}

/**
 * Programmatic controller for displaying in-app heads-up banners.
 */
export function useInAppBanner() {
  const showBanner = useCallback((notification: NormalizedNotification) => {
    RNNOSCore.showInAppBanner(notification);
  }, []);

  return { showBanner };
}
