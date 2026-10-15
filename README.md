# 🚀 React Native Notification OS (RNNOS)

[![npm version](https://img.shields.io/npm/v/react-native-notification-os.svg)](https://www.npmjs.com/package/react-native-notification-os)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-blue.svg)]()

> **The Next-Gen, Zero-Boilerplate Notification OS for React Native.**  
> Built for High-Performance Chat Apps, E-Commerce Live Order Tracking, Rich Media, and Push Notifications.

---

## ✨ Features

- **⚡ Zero Native Boilerplate**: No Java/Kotlin background services or `AppDelegate` swizzling code needed. Just install and drop credential files.
- **💬 Interactive Chat Engine**: Persistent inline reply text inputs, last-message-only display cards, and multi-action buttons ("Mark Read ✔", "Accept", "Reject").
- **📦 Live Commerce Order Tracking**: Real-time progress bars with in-place updates, ETA badges, and user alert sounds/vibrations on status changes.
- **🎨 Custom RemoteViews & Dynamic Theme Adaptation**: Auto-detects Android System Dark/Light Mode and dynamically switches background gradients and typography.
- **🔑 On-Demand & Deferred Permission Flow**: Quiet FCM Token retrieval for Login/Signup APIs, status checking (`checkPermissionStatus`), and 1-click System Settings redirection (`openNotificationSettings`).
- **📱 Ultra Compatible**: Android 6.0 to 14 (API 23-34) & iOS 13+. Built on React Native TurboModules & New Architecture.

---

## 🧪 Example App

A fully working demo app is included in the `example/` folder showcasing all features — Chat notifications with inline replies, Live Order tracking banners, FCM token inspector, and permission handling.

### Run Example on Android

```bash
# Step 1: Clone the repo
git clone https://github.com/hituchhimpa/react-native-notification-os.git
cd react-native-notification-os

# Step 2: Install root dependencies (builds the library)
npm install

# Step 3: Install example dependencies
cd example
npm install

# Step 4 (Optional): Add google-services.json for Firebase push testing
# Place your google-services.json inside example/android/app/

# Step 5: Run on Android
npx react-native run-android
```

### Run Example on iOS

```bash
# Step 1-3: Same as above, then:
cd example/ios && pod install && cd ..

# Step 4 (Optional): Add GoogleService-Info.plist to Xcode project

# Step 5: Run on iOS
npx react-native run-ios
```

### Example App Features

| Tab | What It Demos |
| :--- | :--- |
| **💬 Chat** | Persistent inline reply, multi-message thread, Mark Read action |
| **🛵 Order** | Live order progress bar, ETA badge, status updates |
| **🖼️ Image** | Media/rich notification |
| **🔍 Debug** | FCM Device Token display, permission status check |

---

## 📦 Installation


```bash
# npm
npm install react-native-notification-os

# yarn
yarn add react-native-notification-os
```

### iOS Setup
```bash
cd ios && pod install
```
*Drop `GoogleService-Info.plist` inside your Xcode project if using Firebase push notifications.*

### Android Setup
*Drop `google-services.json` inside `android/app/` if using Firebase push notifications. No `build.gradle` or `AndroidManifest.xml` edits required.*

---

## ⚡ Quick Start

Initialize `RNNOS` in your root application component:

```typescript
import React, { useEffect } from 'react';
import { RNNOS } from 'react-native-notification-os';

export default function App() {
  useEffect(() => {
    // 1. Initialize Notification OS Engine
    RNNOS.initialize({
      appId: 'com.mycompany.app',
      channels: [
        { id: 'chat_messages', name: 'Chat Messages', importance: 'HIGH' },
        { id: 'order_updates', name: 'Order Updates', importance: 'HIGH' },
      ],
    });

    // 2. Listen for Incoming Notifications
    const unsubReceived = RNNOS.onNotificationReceived((notif) => {
      console.log('Push Received:', notif.title, notif.body);
    });

    // 3. Listen for Notification Taps & Action Buttons
    const unsubTapped = RNNOS.onNotificationTapped((notif, actionId) => {
      console.log(`Notification Tapped: ${notif.id}, Action: ${actionId}`);
    });

    return () => {
      unsubReceived();
      unsubTapped();
    };
  }, []);

  return <YourAppNavigator />;
}
```

---

## 🧭 Navigation & Deep Linking Management (React Navigation Integration)

RNNOS includes a built-in **Smart Router** engine that automatically captures notification tap events and routes deep links (`app://chat/thread_101`, `app://orders/99182`) to React Navigation:

```typescript
import React, { useEffect } from 'react';
import { createNavigationContainerRef } from '@react-navigation/native';
import { RNNOS } from 'react-native-notification-os';

export const navigationRef = createNavigationContainerRef();

export default function App() {
  useEffect(() => {
    // 1. Configure Smart Router for Automatic Deep Link Navigation
    RNNOS.setNavigationHandler((deepLink, data) => {
      console.log(`[SmartRouter] Routing deep link: ${deepLink}`);

      if (navigationRef.isReady()) {
        if (deepLink.startsWith('app://chat/')) {
          const threadId = deepLink.replace('app://chat/', '');
          navigationRef.navigate('ChatScreen', { threadId, ...data });
        } else if (deepLink.startsWith('app://orders/')) {
          const orderId = deepLink.replace('app://orders/', '');
          navigationRef.navigate('OrderDetailsScreen', { orderId, ...data });
        }
      }
    });

    // 2. Direct Tap Listener (For Action Buttons or Custom Behavior)
    const unsubTapped = RNNOS.onNotificationTapped((notification, actionId) => {
      if (actionId === 'action_mark_read') {
        console.log(`User marked notification ${notification.id} as read`);
      } else if (actionId === 'action_accept') {
        console.log(`User accepted request from notification ${notification.id}`);
      }
    });

    return () => unsubTapped();
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <RootStack />
    </NavigationContainer>
  );
}
```

---

## 🔑 Production Login API & Permission Flow

Production apps (like Swiggy, Uber, Zomato) retrieve the FCM Token quietly for Backend Login APIs without forcing system permission popups on app startup:

```typescript
import { RNNOS } from 'react-native-notification-os';

const handleLogin = async (email: string, password: string) => {
  try {
    // 1. Retrieve FCM Device Token quietly for Backend (Works without UI permission)
    const deviceToken = await RNNOS.getFCMToken();

    // 2. Send Token in Login Request
    await api.post('/api/v1/login', {
      email,
      password,
      deviceToken,
      deviceOS: Platform.OS,
    });

    // 3. Request Notification Permission On-Demand (or handle denied state)
    const status = await RNNOS.checkPermissionStatus();

    if (status === 'DENIED') {
      Alert.alert(
        'Enable Notifications',
        'Enable notifications in Settings to get real-time chat & order updates.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => RNNOS.openNotificationSettings() },
        ]
      );
    } else {
      await RNNOS.requestPermission();
    }
  } catch (err) {
    console.error('Login error:', err);
  }
};
```

---

## 💬 Chat Engine & Persistent Inline Replies

Present rich chat notifications with persistent inline reply input and action buttons:

```typescript
import { RNNOS } from 'react-native-notification-os';

// Present Chat Notification
await RNNOS.presentNotification({
  id: 'chat_thread_101',
  messageId: `msg_${Date.now()}`,
  threadId: 'thread_alice_101',
  title: 'Alice Johnson',
  body: 'Hey! Are we meeting at 4 PM?',
  type: 'CHAT',
  category: 'chat_messages',
  priority: 'HIGH',
  actions: [
    {
      id: 'action_reply',
      title: 'Reply',
      type: 'TEXT_INPUT',
      placeholder: 'Type reply...',
    },
    {
      id: 'action_mark_read',
      title: 'Mark Read ✔',
      type: 'BUTTON',
    },
  ],
  chatMetadata: {
    threadId: 'thread_alice_101',
    senderId: 'user_alice',
    senderName: 'Alice Johnson',
    isGroup: false,
    messages: [
      {
        id: `msg_101`,
        text: 'Hey! Are we meeting at 4 PM?',
        timestamp: Date.now(),
        senderId: 'user_alice',
        senderName: 'Alice Johnson',
      },
    ],
  },
});
```

---

## 📦 Live E-Commerce Order Progress Tracking

Render real-time order tracking banners with green progress bars, ETA badges, and alert sounds:

```typescript
import { RNNOS } from 'react-native-notification-os';

// Present / Update Live Order Status Banner
await RNNOS.presentNotification({
  id: 'order_99182',
  messageId: `order_msg_${Date.now()}`,
  title: '🍕 Pepperoni Pizza Delivery',
  body: 'Driver is arriving in 5 minutes',
  type: 'COMMERCE',
  category: 'order_updates',
  priority: 'HIGH',
  color: '#22c55e', // Vivid Green Accent
  useCustomLayout: true,
  commerceMetadata: {
    orderId: 'order_99182',
    currentStep: 3,
    totalSteps: 4,
    stepName: 'Out for Delivery 🛵',
    progressPercent: 75,
    estimatedDelivery: '10 Mins',
    statusText: 'Driver is arriving in 5 minutes',
  },
});
```

---

## 🔔 In-App Heads-Up Toasts (`<NotificationBannerContainer />`)

Say goodbye to third-party flash message/toast libraries! RNNOS includes an interactive, gesture-driven Heads-Up In-App Toast banner component. It automatically animates down when a notification arrives while the user is using the app:

```tsx
import React from 'react';
import { RNNOS, NotificationBannerContainer } from 'react-native-notification-os';

export default function App() {
  return (
    <>
      <YourAppRoot />
      {/* 🚀 Zero-config, interactive in-app toast alerts with swipe-to-dismiss */}
      <NotificationBannerContainer
        durationMs={4500}
        onPress={(notification) => {
          console.log('User tapped in-app toast:', notification.title);
        }}
      />
    </>
  );
}
```

- **✨ Native Physics**: Smooth spring animations with swipe-up to dismiss gesture.
- **🛵 Type-Aware**: Renders live order progress bars for `COMMERCE`, sender avatars for `CHAT`, and media thumbnails for `MEDIA`.
- **🎨 Dark & Light Mode**: Auto-adapts contrast and typography.

---

## ⏰ Local Notification Scheduling

Schedule alarms and reminders at exact timestamps or recurring intervals:

```typescript
import { RNNOS } from 'react-native-notification-os';

// 1. Schedule for exact time (e.g. 10 minutes from now)
await RNNOS.scheduleNotification(
  {
    id: 'reminder_meeting',
    messageId: 'rem_1',
    title: '📅 Standup Meeting in 10 mins',
    body: 'Join the Google Meet team room',
    priority: 'HIGH',
    type: 'GENERIC',
    timestamp: Date.now(),
    data: { meetUrl: 'https://meet.google.com/xyz' },
  },
  {
    type: 'TIMESTAMP',
    timestamp: Date.now() + 10 * 60 * 1000,
  }
);

// 2. Schedule recurring interval (e.g. Every 2 hours)
await RNNOS.scheduleNotification(
  {
    id: 'water_reminder',
    messageId: 'water_1',
    title: '💧 Hydration Time',
    body: 'Time to drink a glass of water!',
    priority: 'DEFAULT',
    type: 'GENERIC',
    timestamp: Date.now(),
    data: {},
  },
  {
    type: 'INTERVAL',
    intervalSeconds: 7200,
    repeats: true,
  }
);

// 3. Cancel scheduled notification
await RNNOS.cancelScheduledNotification('water_reminder');
```

---

## 📬 In-App Notification Center & Inbox (`useNotificationHistory`)

Build a complete Notification Inbox / Activity Feed with a single hook:

```tsx
import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useNotificationHistory } from 'react-native-notification-os';

export function NotificationInboxScreen() {
  const { notifications, isLoading, refresh, clearHistory } = useNotificationHistory();

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity onPress={clearHistory}>
        <Text>Clear All</Text>
      </TouchableOpacity>

      <FlatList
        data={notifications}
        refreshing={isLoading}
        onRefresh={refresh}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ padding: 14, borderBottomWidth: 1 }}>
            <Text style={{ fontWeight: 'bold' }}>{item.title}</Text>
            <Text>{item.body}</Text>
          </View>
        )}
      />
    </View>
  );
}
```

---

## 🔄 Universal Push Payload Normalizer

Never write messy JSON conversion boilerplate for incoming background push messages:

```typescript
import { RNNOS } from 'react-native-notification-os';

// Works seamlessly with FCM, APNs, OneSignal, AWS SNS, or custom backends
const normalized = RNNOS.normalizePayload(rawRemoteMessage);
console.log(normalized.id, normalized.title, normalized.commerceMetadata);
```

---

## 📋 API Reference

### Core Methods

| Method | Return Type | Description |
| :--- | :--- | :--- |
| `RNNOS.initialize(config)` | `Promise<boolean>` | Initializes channels, engines, and notification listeners. |
| `RNNOS.getFCMToken()` | `Promise<string>` | Quietly retrieves Firebase FCM device token without prompt. |
| `RNNOS.requestPermission()` | `Promise<boolean>` | Requests notification permission dialog and awaits user choice. |
| `RNNOS.checkPermissionStatus()` | `Promise<'GRANTED' \| 'DENIED' \| 'NOT_DETERMINED'>` | Returns current notification permission state without showing dialog. |
| `RNNOS.openNotificationSettings()` | `Promise<boolean>` | Redirects user directly to System App Notification Settings. |
| `RNNOS.presentNotification(payload)` | `Promise<boolean>` | Renders local or remote notification card natively. |
| `RNNOS.getInitialNotification()` | `Promise<NormalizedNotification \| null>` | Returns the notification that opened the app from a cold/killed launch. |
| `RNNOS.scheduleNotification(payload, trigger)` | `Promise<boolean>` | Schedules a local notification at a future timestamp or recurring interval. |
| `RNNOS.cancelScheduledNotification(id)` | `Promise<boolean>` | Cancels a specific scheduled local notification. |
| `RNNOS.cancelAllScheduledNotifications()` | `Promise<boolean>` | Cancels all pending scheduled notifications. |
| `RNNOS.getDeliveredNotifications()` | `Promise<NormalizedNotification[]>` | Retrieves currently active notifications in the system notification shade. |
| `RNNOS.getNotificationHistory(limit, offset)` | `Promise<NormalizedNotification[]>` | Retrieves persistent notification history for building in-app Inbox. |
| `RNNOS.clearNotificationHistory()` | `Promise<boolean>` | Clears in-app persistent notification history. |
| `RNNOS.dismissNotification(id)` | `Promise<boolean>` | Dismisses a delivered notification card by ID. |
| `RNNOS.dismissAllNotifications()` | `Promise<boolean>` | Clears all delivered notification cards. |
| `RNNOS.normalizePayload(rawPayload)` | `NormalizedNotification` | Universal payload normalizer for FCM, APNs, OneSignal, or custom backends. |
| `RNNOS.showInAppBanner(payload)` | `void` | Triggers the heads-up in-app toast banner programmatically. |
| `RNNOS.onNotificationReceived(cb)` | `() => void` | Unsubscribe listener for incoming notifications in foreground & background. |
| `RNNOS.onNotificationTapped(cb)` | `() => void` | Unsubscribe listener for notification & action button taps. |
| `RNNOS.onInlineReply(cb)` | `() => void` | Unsubscribe listener for user inline text replies. |
| `RNNOS.onTokenRefresh(cb)` | `() => void` | Unsubscribe listener for FCM token refresh events. |
| `RNNOS.setNavigationHandler(handler)` | `void` | Registers a deep link navigation handler for automatic routing. |

### React Hooks & Components

| Export | Type | Description |
| :--- | :--- | :--- |
| `<NotificationBannerContainer />` | Component | Drop-in animated heads-up toast banner for in-app alerts. |
| `useNotificationListener(options)` | Hook | Subscribes to notification received, tapped, and inline reply events. |
| `useChatThread(threadId)` | Hook | Real-time chat thread state, automatic unread count, and reply dispatch. |
| `useCommerceOrder(orderId)` | Hook | Real-time order tracking progress state and ETA updates. |
| `useUnreadCount()` | Hook | Reactive app badge counter and badge management utilities. |
| `useNotificationHistory(limit, offset)` | Hook | Complete notification inbox manager with reactive refresh and clear. |
| `usePermissionStatus()` | Hook | Reactive permission status checking, request trigger, and settings opener. |
| `useInAppBanner()` | Hook | Programmatic controller for displaying custom in-app banners. |

---

## 🌐 Firebase Backend Push Payload Schema

When sending push notifications from your backend server via Firebase Cloud Messaging (FCM), always send a **`data` payload** (not `notification` key). This ensures `RNNOSMessagingService` handles the message in background and killed app states with proper heads-up banners and interactive actions.

### Chat Notification Payload
```bash
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_FIREBASE_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "DEVICE_FCM_TOKEN",
    "priority": "high",
    "data": {
      "id": "msg_1001",
      "messageId": "msg_id_1001",
      "threadId": "thread_alice_101",
      "title": "Alice Johnson",
      "body": "Hey! Are we meeting at 4 PM?",
      "type": "CHAT",
      "category": "chat_messages",
      "priority": "HIGH",
      "actions": "[{\"id\":\"action_reply\",\"title\":\"Reply\",\"type\":\"TEXT_INPUT\",\"placeholder\":\"Type reply...\"},{\"id\":\"action_mark_read\",\"title\":\"Mark Read ✔\",\"type\":\"BUTTON\"}]",
      "chatMetadata": "{\"threadId\":\"thread_alice_101\",\"senderId\":\"user_alice\",\"senderName\":\"Alice Johnson\",\"isGroup\":false,\"messages\":[{\"id\":\"msg_int_1001\",\"text\":\"Hey! Are we meeting at 4 PM?\",\"timestamp\":1700000000000,\"senderId\":\"user_alice\",\"senderName\":\"Alice Johnson\"}]}"
    }
  }'
```

### Order Progress Notification Payload
```bash
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_FIREBASE_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "DEVICE_FCM_TOKEN",
    "priority": "high",
    "data": {
      "id": "order_99182",
      "messageId": "order_msg_1",
      "title": "🍕 Pizza Delivery Update",
      "body": "Driver is arriving in 5 minutes",
      "type": "COMMERCE",
      "category": "order_updates",
      "priority": "HIGH",
      "color": "#22c55e",
      "useCustomLayout": "true",
      "commerceMetadata": "{\"orderId\":\"order_99182\",\"currentStep\":3,\"totalSteps\":4,\"stepName\":\"Out for Delivery\",\"progressPercent\":75,\"estimatedDelivery\":\"5 Mins\",\"statusText\":\"Driver is arriving in 5 minutes\"}"
    }
  }'
```

> **💡 Tip**: If using **Firebase Console Web GUI** to test, RNNOS also handles `notification` key pushes and automatically renders them as Generic high-priority pop-up banner notifications in all app states.

---

## 📱 App State Behavior

RNNOS overrides `handleIntent()` — FCM's internal entry point — to intercept **all payload types** before the system gets a chance to show its own generic banner:

### Payload Type 1: `data` only ✅

| App State | What Happens |
| :--- | :--- |
| **Foreground** | `onMessageReceived()` → RNNOS custom banner + JS event |
| **Background** | `onMessageReceived()` → RNNOS custom banner |
| **Killed** | `onMessageReceived()` → RNNOS custom banner |

### Payload Type 2: `notification` only ✅

| App State | What Happens |
| :--- | :--- |
| **Foreground** | `handleIntent()` intercepts → RNNOS custom banner + JS event |
| **Background** | `handleIntent()` intercepts → system banner suppressed → RNNOS custom banner |
| **Killed** | `handleIntent()` intercepts → system banner suppressed → RNNOS custom banner |

### Payload Type 3: `notification` + `data` both keys ✅

| App State | What Happens |
| :--- | :--- |
| **Foreground** | `handleIntent()` intercepts → `data` priority, `notification.title/body` as fallback → RNNOS banner |
| **Background** | `handleIntent()` intercepts → system banner suppressed → RNNOS custom banner |
| **Killed** | `handleIntent()` intercepts → system banner suppressed → RNNOS custom banner |

> **✅ All 3 payload types work in all 3 app states.** No backend changes needed — RNNOS handles everything.

---

## ✅ Platform Compatibility

| Platform | Version | Coverage |
| :--- | :--- | :--- |
| **Android** | 6.0 (API 23) → 14 (API 34) | 99.6%+ of all active Android devices |
| **iOS** | iOS 13.0 → iOS 18 | 99.8%+ of all active iPhones |
| **React Native** | 0.73+ (Old Arch & New Architecture / TurboModules) | ✅ Supported |

---

## 🛠️ Troubleshooting

### Android: Notification not showing pop-up banner?
1. Make sure `google-services.json` is inside `android/app/` directory.
2. In Firebase Console → `Additional Options` → **Android Notification Priority**: `High`.
3. Confirm that `google-services` classpath is in your project `android/build.gradle`:
   ```groovy
   classpath("com.google.gms:google-services:4.4.1")
   ```
4. Confirm plugin is applied in `android/app/build.gradle`:
   ```groovy
   apply plugin: "com.google.gms.google-services"
   ```

### Android: `POST_NOTIFICATIONS` permission dialog not showing?
On **Android 13+ (API 33)**, call `RNNOS.requestPermission()` after login:
```typescript
const granted = await RNNOS.requestPermission();
if (!granted) {
  // Permission denied — show custom UI banner or redirect to settings
  RNNOS.openNotificationSettings();
}
```

### iOS: Notification not appearing when app is in foreground?
RNNOS delegates `willPresent` to show banners in foreground automatically. No extra setup needed — this is handled internally via `NotificationRenderer`.

---

## 🧭 Notification Tap & Screen Navigation (All App States)

RNNOS provides a complete navigation pipeline that works across **Foreground**, **Background**, and **Killed/Terminated** states. Here's the full production-ready pattern:

### Step 1: Setup `navigationRef` in Root App

```typescript
// src/navigation/navigationRef.ts
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate(name: string, params?: object) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as never, params as never);
  }
}
```

---

### Step 2: Register RNNOS Navigation Handler in App.tsx

```typescript
// App.tsx
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { RNNOS } from 'react-native-notification-os';
import { navigationRef } from './navigation/navigationRef';

export default function App() {
  useEffect(() => {
    RNNOS.initialize({
      appId: 'com.mycompany.app',
      channels: [
        { id: 'chat_messages',  name: 'Chat Messages',  importance: 'HIGH' },
        { id: 'order_updates',  name: 'Order Updates',  importance: 'HIGH' },
        { id: 'general',        name: 'General',        importance: 'HIGH' },
      ],
    });

    // ✅ Smart Router: Handles navigation based on deepLink in notification payload
    RNNOS.setNavigationHandler((deepLink, data) => {
      if (!navigationRef.isReady()) return;

      // Chat Notification → Navigate to ChatScreen
      if (deepLink.startsWith('app://chat/')) {
        const threadId = deepLink.replace('app://chat/', '');
        navigationRef.navigate('ChatScreen', { threadId });

      // Order Notification → Navigate to OrderDetailsScreen
      } else if (deepLink.startsWith('app://orders/')) {
        const orderId = deepLink.replace('app://orders/', '');
        navigationRef.navigate('OrderDetailsScreen', { orderId });

      // Promo / General → Navigate to HomeScreen
      } else if (deepLink.startsWith('app://promo/')) {
        navigationRef.navigate('PromoScreen', { ...data });

      // Default Fallback → Go to Home
      } else {
        navigationRef.navigate('HomeScreen');
      }
    });

    // ✅ Action Button Taps (Mark Read, Accept, Reject)
    const unsubTapped = RNNOS.onNotificationTapped((notif, actionId) => {
      if (actionId === 'action_mark_read') {
        // Silently mark as read without navigation
        console.log(`Thread ${notif.threadId} marked as read`);

      } else if (actionId === 'action_accept') {
        // Accept friend/follow request
        navigationRef.navigate('RequestsScreen', { requestId: notif.id });

      } else if (actionId === 'action_reject') {
        // Reject — no navigation needed
        console.log(`Request ${notif.id} rejected`);

      } else {
        // Default full tap with no actionId → Smart Router handles navigation above
      }
    });

    return () => unsubTapped();
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <RootStack />
    </NavigationContainer>
  );
}
```

---

### Step 3: Add `deepLink` to Notification Payload

Set the `deepLink` field in your `presentNotification()` or FCM backend data payload:

```typescript
await RNNOS.presentNotification({
  id: 'msg_1001',
  title: 'Alice Johnson',
  body: 'Hey! Are we meeting at 4 PM?',
  type: 'CHAT',
  category: 'chat_messages',
  priority: 'HIGH',
  data: {
    deepLink: 'app://chat/thread_alice_101',  // ← Smart Router uses this
  },
  actions: [
    { id: 'action_reply',     title: 'Reply',        type: 'TEXT_INPUT', placeholder: 'Type reply...' },
    { id: 'action_mark_read', title: 'Mark Read ✔',  type: 'BUTTON' },
  ],
  // ...chatMetadata
});
```

---

### App State Navigation Behavior

| App State | User Taps Notification | What Happens |
| :--- | :--- | :--- |
| **Foreground** | Taps banner | `onNotificationTapped` fires immediately → `setNavigationHandler` routes to correct screen. |
| **Background** | Taps banner from status bar | App comes to foreground → `setNavigationHandler` fires → navigates to correct screen. |
| **Killed / Terminated** | Taps notification to open app | App launches → after `RNNOS.initialize()` completes → `setNavigationHandler` fires → navigates to correct screen. |

> **💡 Tip**: In Killed state, React Navigation might not be ready immediately. The `navigationRef.isReady()` guard inside `setNavigationHandler` ensures navigation only fires after the Navigator is fully mounted.

---

### 🔀 Full Navigation Fallback Chain (No deepLink? No Problem!)

`deepLink` is **optional**. RNNOS checks 3 fallback levels in order — so navigation always works even if your backend doesn't send a `deepLink`:

```typescript
RNNOS.setNavigationHandler((deepLink, data) => {
  if (!navigationRef.isReady()) return;

  // ─────────────────────────────────────────────────────────────
  // PRIORITY 1: Use deepLink if present (most flexible)
  // e.g. data: { deepLink: 'app://chat/thread_alice_101' }
  // ─────────────────────────────────────────────────────────────
  if (deepLink) {
    if (deepLink.startsWith('app://chat/')) {
      const threadId = deepLink.replace('app://chat/', '');
      navigationRef.navigate('ChatScreen', { threadId });
      return;
    }
    if (deepLink.startsWith('app://orders/')) {
      const orderId = deepLink.replace('app://orders/', '');
      navigationRef.navigate('OrderDetailsScreen', { orderId });
      return;
    }
    if (deepLink.startsWith('app://promo/')) {
      navigationRef.navigate('PromoScreen', { ...data });
      return;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // PRIORITY 2: Use notification `type` field (no deepLink needed)
  // e.g. backend sends: data: { type: 'CHAT', threadId: 'xyz' }
  // ─────────────────────────────────────────────────────────────
  if (data?.type) {
    switch (data.type) {
      case 'CHAT':
        navigationRef.navigate('ChatScreen', { threadId: data.threadId });
        return;

      case 'COMMERCE':
        navigationRef.navigate('OrderDetailsScreen', { orderId: data.orderId });
        return;

      case 'MEDIA':
        navigationRef.navigate('MediaPlayerScreen', { mediaUrl: data.mediaUrl });
        return;

      case 'SOCIAL':
        navigationRef.navigate('ProfileScreen', { userId: data.userId });
        return;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // PRIORITY 3: Absolute fallback → Open Home Screen
  // When neither deepLink nor type is present
  // ─────────────────────────────────────────────────────────────
  navigationRef.navigate('HomeScreen');
});
```

---

### Priority Resolution Summary

| Priority | Condition | Example Payload | Result |
| :--- | :--- | :--- | :--- |
| **1 — deepLink** | `data.deepLink` is set | `{ deepLink: 'app://chat/thread_101' }` | Navigates to `ChatScreen` with `threadId` |
| **2 — type field** | `data.type` is set, no deepLink | `{ type: 'COMMERCE', orderId: '99182' }` | Navigates to `OrderDetailsScreen` with `orderId` |
| **3 — Fallback** | Neither deepLink nor type | `{ title: 'Welcome!' }` | Navigates to `HomeScreen` |

> **💡 Backend Team Note**: Priority 2 (`type` field) is the most common production pattern. Your backend's existing `/api/v1/notifications` response almost certainly already has a `type` field — just map it to the switch-case above and navigation works out of the box.

---

## 📄 License

MIT © [Hitesh Chhimpa](https://github.com/hituchhimpa)
