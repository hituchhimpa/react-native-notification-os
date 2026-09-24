import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { RNNOS, NormalizedNotification, useUnreadCount } from 'react-native-notification-os';

export const InspectorDemoScreen: React.FC = () => {
  const [logs, setLogs] = useState<Array<{ id: string; time: string; type: string; details: string }>>([]);
  const [fcmToken, setFcmToken] = useState<string>('Fetching FCM Token...');
  const { unreadCount, setBadgeCount } = useUnreadCount();

  useEffect(() => {
    const addLog = (type: string, details: string) => {
      setLogs((prev) => [
        {
          id: String(Date.now() + Math.random()),
          time: new Date().toLocaleTimeString(),
          type,
          details,
        },
        ...prev.slice(0, 50),
      ]);
    };

    RNNOS.getFCMToken().then((token) => {
      if (token) {
        setFcmToken(token);
        addLog('FCM_TOKEN', `Device Token: ${token}`);
      } else {
        setFcmToken('No FCM Token (Local Mode)');
      }
    }).catch(() => {
      setFcmToken('FCM Token Fetch Error');
    });

    const unsubToken = RNNOS.onTokenRefresh((token) => {
      setFcmToken(token);
      addLog('TOKEN_REFRESH', `New Token: ${token}`);
    });

    const unsubReceived = RNNOS.onNotificationReceived((notif: NormalizedNotification) => {
      addLog('PUSH_RECEIVED', `[${notif.type}] ${notif.title} - ${notif.body}`);
    });

    const unsubTapped = RNNOS.onNotificationTapped((notif: NormalizedNotification, actionId?: string) => {
      addLog('NOTIFICATION_TAPPED', `Action: ${actionId || 'DEFAULT_TAP'} | Link: ${notif.deepLink || 'None'}`);
    });

    RNNOS.setNavigationHandler((deepLink, data) => {
      addLog('SMART_ROUTER', `Navigating to: ${deepLink} with data: ${JSON.stringify(data)}`);
    });

    return () => {
      unsubReceived();
      unsubTapped();
      unsubToken();
    };
  }, []);

  const triggerTestNotification = async () => {
    await RNNOS.presentNotification({
      id: `test_${Date.now()}`,
      messageId: `msg_test_${Date.now()}`,
      title: 'Inspector Test Notification',
      body: 'Testing RNNOS Inspector Engine lifecycle dispatch.',
      category: 'chat_messages',
      priority: 'HIGH',
      type: 'GENERIC',
      actions: [],
      data: {
        deepLink: 'app://inspector/test',
        environment: 'production',
      },
      timestamp: Date.now(),
    });
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>🔍 RNNOS Developer Inspector & Timeline</Text>
      
      {/* FCM Device Token Display */}
      <View style={styles.tokenCard}>
        <Text style={styles.tokenTitle}>🔑 Real FCM Device Token:</Text>
        <Text style={styles.tokenText} selectable>{fcmToken}</Text>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>System Badge</Text>
          <Text style={styles.metricValue}>{unreadCount}</Text>
        </View>
        <TouchableOpacity style={styles.metricCard} onPress={() => setBadgeCount(0)}>
          <Text style={styles.metricLabel}>Clear Badge</Text>
          <Text style={[styles.metricValue, { color: '#ef4444' }]}>Reset</Text>
        </TouchableOpacity>
      </View>

      {/* Control Buttons */}
      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.triggerBtn} onPress={triggerTestNotification}>
          <Text style={styles.btnText}>⚡ Present Now</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.triggerBtn, { backgroundColor: '#8b5cf6' }]}
          onPress={async () => {
            await RNNOS.scheduleNotification(
              {
                id: `scheduled_${Date.now()}`,
                messageId: `msg_sched_${Date.now()}`,
                title: '⏰ Scheduled Alarm Triggered!',
                body: 'This notification was scheduled 5 seconds ago by RNNOS.',
                priority: 'HIGH',
                type: 'GENERIC',
                timestamp: Date.now(),
                data: { source: 'scheduler' },
              },
              { type: 'INTERVAL', intervalSeconds: 5 }
            );
          }}
        >
          <Text style={styles.btnText}>⏰ Schedule (5s)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.triggerBtn, styles.clearBtn]} onPress={clearLogs}>
          <Text style={styles.btnText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Timeline Stream */}
      <Text style={styles.sectionTitle}>Real-time Event Log Timeline</Text>
      <ScrollView style={styles.logContainer}>
        {logs.map((log) => (
          <View key={log.id} style={styles.logItem}>
            <View style={styles.logHeader}>
              <Text style={styles.logType}>{log.type}</Text>
              <Text style={styles.logTime}>{log.time}</Text>
            </View>
            <Text style={styles.logDetails}>{log.details}</Text>
          </View>
        ))}
        {logs.length === 0 && (
          <Text style={styles.emptyText}>No events logged yet. Trigger an action above!</Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#f8fafc', marginBottom: 12 },
  tokenCard: { backgroundColor: '#1e293b', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  tokenTitle: { color: '#38bdf8', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  tokenText: { color: '#f8fafc', fontSize: 11, fontFamily: 'monospace' },
  metricsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  metricCard: { flex: 1, backgroundColor: '#1e293b', borderRadius: 10, padding: 12, alignItems: 'center' },
  metricLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
  metricValue: { color: '#10b981', fontSize: 22, fontWeight: '800', marginTop: 2 },
  btnRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  triggerBtn: { flex: 1, backgroundColor: '#2563eb', padding: 12, borderRadius: 8, alignItems: 'center' },
  clearBtn: { backgroundColor: '#475569' },
  btnText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  sectionTitle: { color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  logContainer: { flex: 1, backgroundColor: '#1e293b', borderRadius: 10, padding: 12 },
  logItem: { borderBottomWidth: 1, borderBottomColor: '#334155', paddingBottom: 8, marginBottom: 8 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  logType: { color: '#38bdf8', fontSize: 11, fontWeight: '700' },
  logTime: { color: '#64748b', fontSize: 10 },
  logDetails: { color: '#f8fafc', fontSize: 12 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 40, fontStyle: 'italic' },
});
