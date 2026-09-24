export type NotificationPriority = 'MIN' | 'LOW' | 'DEFAULT' | 'HIGH' | 'MAX';

export type NotificationType = 'GENERIC' | 'CHAT' | 'COMMERCE' | 'MEDIA' | 'PROGRESS';

export interface NotificationAction {
  id: string;
  title: string;
  type: 'BUTTON' | 'TEXT_INPUT' | 'DESTRUCTIVE';
  placeholder?: string;
  authenticationRequired?: boolean;
}

export interface ChatMessage {
  id: string;
  text: string;
  timestamp: number;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
}

export interface ChatConversation {
  threadId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  isGroup: boolean;
  groupName?: string;
  messages: ChatMessage[];
  unreadCount?: number;
}

export interface CommerceProgress {
  orderId: string;
  currentStep: number;
  totalSteps: number;
  stepName: string;
  progressPercent: number;
  estimatedDelivery?: string;
  statusText?: string;
  trackerUrl?: string;
  silentUpdate?: boolean;
}

export interface MediaMetadata {
  title?: string;
  artist?: string;
  album?: string;
  artworkUrl?: string;
  isPlaying?: boolean;
  durationSeconds?: number;
  playbackPositionSeconds?: number;
}

export interface NormalizedNotification {
  id: string;
  messageId: string;
  collapseKey?: string;
  threadId?: string;
  category?: string;
  title: string;
  body: string;
  subtitle?: string;
  badge?: number;
  sound?: string;
  priority: NotificationPriority;
  avatar?: string;
  imageUrl?: string;
  color?: string;
  useCustomLayout?: boolean;
  gradientColors?: string[];
  deepLink?: string;
  data: Record<string, any>;
  actions?: NotificationAction[];
  timestamp: number;
  type: NotificationType;
  commerceMetadata?: CommerceProgress;
  chatMetadata?: ChatConversation;
  mediaMetadata?: MediaMetadata;
  isRead?: boolean;
  isSuppressed?: boolean;
  silentUpdate?: boolean;
}

export interface NotificationChannel {
  id: string;
  name: string;
  description?: string;
  importance?: 'NONE' | 'MIN' | 'LOW' | 'DEFAULT' | 'HIGH' | 'MAX';
  sound?: string;
  enableVibration?: boolean;
  showBadge?: boolean;
}

export interface NotificationCategory {
  id: string;
  actions: NotificationAction[];
  hiddenPreviewsBodyPlaceholder?: string;
}

export interface RuleResult {
  action: 'PRESENT' | 'SUPPRESS' | 'SUPPRESS_AND_INJECT' | 'SILENT_UPDATE';
  modifiedNotification?: NormalizedNotification;
  reason?: string;
}

export interface NotificationRule {
  id: string;
  description?: string;
  condition: (
    notification: NormalizedNotification,
    appState: { activeChatId?: string; isForeground: boolean }
  ) => boolean;
  action: RuleResult['action'];
}

export interface RNNOSPlugin {
  name: string;
  onInitialize?: () => void;
  onPushReceived?: (notification: NormalizedNotification) => Promise<NormalizedNotification | null>;
  onNotificationTapped?: (notification: NormalizedNotification, actionId?: string) => void;
  onNotificationDismissed?: (notificationId: string) => void;
}

export interface TimestampTrigger {
  type: 'TIMESTAMP';
  timestamp: number;
}

export interface IntervalTrigger {
  type: 'INTERVAL';
  intervalSeconds: number;
  repeats?: boolean;
}

export type NotificationTrigger = TimestampTrigger | IntervalTrigger;

export interface ScheduledNotification {
  id: string;
  notification: NormalizedNotification;
  trigger: NotificationTrigger;
}

export interface InAppBannerConfig {
  enabled?: boolean;
  durationMs?: number;
  slideFrom?: 'top' | 'bottom';
  showInForeground?: boolean;
}

export interface RNNOSConfig {
  appId: string;
  channels?: NotificationChannel[];
  categories?: NotificationCategory[];
  rules?: NotificationRule[];
  plugins?: RNNOSPlugin[];
  autoMarkReadOnScreenFocus?: boolean;
  badgeSyncEnabled?: boolean;
  inAppBanner?: InAppBannerConfig;
}
