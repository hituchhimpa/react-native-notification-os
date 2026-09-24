import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { RNNOS, NotificationBannerContainer } from "react-native-notification-os";
import { ChatDemoScreen } from "./screens/ChatDemoScreen";
import { CommerceDemoScreen } from "./screens/CommerceDemoScreen";
import { InspectorDemoScreen } from "./screens/InspectorDemoScreen";
import { MediaDemoScreen } from "./screens/MediaDemoScreen";

export default function App() {
  const [activeTab, setActiveTab] = useState<
    "chat" | "commerce" | "media" | "inspector"
  >("chat");

  useEffect(() => {
    // Built-in Notification Permission Request & Firebase Initialization
    RNNOS.requestPermission().then((granted) => {
      console.log("[RNNOS] Notification Permission Granted:", granted);
      if (granted) {
        RNNOS.getFCMToken()
          .then((token) => {
            if (token) {
              console.log("[RNNOS] Device FCM Token:", token);
            }
          })
          .catch(() => {});
      }
    });

    // Initialize React Native Notification OS
    RNNOS.initialize({
      appId: "com.rnnos.showcase",
      channels: [
        { id: "chat_messages", name: "Chat Messages", importance: "HIGH" },
        { id: "order_updates", name: "Order Updates", importance: "HIGH" },
      ],
      autoMarkReadOnScreenFocus: true,
      badgeSyncEnabled: true,
    });
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0f19" />

      {/* App Navigation Bar */}
      <View style={styles.topHeader}>
        <Text style={styles.logoText}>RNNOS</Text>
        <Text style={styles.subtitleText}>React Native Notification OS</Text>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "chat" && styles.tabActive]}
          onPress={() => setActiveTab("chat")}
        >
          <Text
            style={[
              styles.tabLabel,
              activeTab === "chat" && styles.tabLabelActive,
            ]}
          >
            💬 Chat
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "commerce" && styles.tabActive,
          ]}
          onPress={() => setActiveTab("commerce")}
        >
          <Text
            style={[
              styles.tabLabel,
              activeTab === "commerce" && styles.tabLabelActive,
            ]}
          >
            🛵 Order
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === "media" && styles.tabActive]}
          onPress={() => setActiveTab("media")}
        >
          <Text
            style={[
              styles.tabLabel,
              activeTab === "media" && styles.tabLabelActive,
            ]}
          >
            🖼️ Image
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "inspector" && styles.tabActive,
          ]}
          onPress={() => setActiveTab("inspector")}
        >
          <Text
            style={[
              styles.tabLabel,
              activeTab === "inspector" && styles.tabLabelActive,
            ]}
          >
            🔍 Debug
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Body */}
      <View style={styles.body}>
        {activeTab === "chat" && <ChatDemoScreen />}
        {activeTab === "commerce" && <CommerceDemoScreen />}
        {activeTab === "media" && <MediaDemoScreen />}
        {activeTab === "inspector" && <InspectorDemoScreen />}
      </View>

      {/* Real-time In-App Notification Toast */}
      <NotificationBannerContainer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0b0f19" },
  topHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#0f172a",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  logoText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#38bdf8",
    letterSpacing: 1,
  },
  subtitleText: { fontSize: 11, color: "#94a3b8", fontWeight: "500" },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    padding: 6,
    gap: 6,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#1e293b",
  },
  tabActive: { backgroundColor: "#2563eb" },
  tabLabel: { color: "#94a3b8", fontWeight: "700", fontSize: 13 },
  tabLabelActive: { color: "#ffffff" },
  body: { flex: 1 },
});
