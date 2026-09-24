import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { NormalizedNotification } from '../types/NormalizedNotification';
import { RNNOSCore } from '../core/RNNOSCore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface NotificationBannerProps {
  /** Optional custom banner render prop */
  renderCustomBanner?: (
    notification: NormalizedNotification,
    dismiss: () => void
  ) => React.ReactNode;
  /** Auto-dismiss delay in ms. Default 4000. Set 0 to disable auto-dismiss. */
  durationMs?: number;
  /** Disable in-app banners */
  disabled?: boolean;
  /** Top offset (useful for custom headers or notch adjustment). Default 0. */
  topOffset?: number;
  /** Callback when banner is tapped */
  onPress?: (notification: NormalizedNotification) => void;
}

export const NotificationBannerContainer: React.FC<NotificationBannerProps> = ({
  renderCustomBanner,
  durationMs = 4500,
  disabled = false,
  topOffset = 0,
  onPress,
}) => {
  const [currentNotification, setCurrentNotification] = useState<NormalizedNotification | null>(null);
  const translateY = useRef(new Animated.Value(-160)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -160,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentNotification(null);
    });
  }, [translateY, opacity]);

  const showNotification = useCallback(
    (notification: NormalizedNotification) => {
      if (disabled) return;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setCurrentNotification(notification);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: topOffset + (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 10),
          tension: 65,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      if (durationMs > 0) {
        timerRef.current = setTimeout(() => {
          dismiss();
        }, durationMs);
      }
    },
    [disabled, durationMs, topOffset, translateY, opacity, dismiss]
  );

  useEffect(() => {
    const unsubscribe = RNNOSCore.onInAppBanner((notif) => {
      showNotification(notif);
    });
    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [showNotification]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy < 0) {
          translateY.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -30 || gesture.vy < -0.5) {
          dismiss();
        } else {
          Animated.spring(translateY, {
            toValue: topOffset + (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 10),
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!currentNotification) return null;

  const handlePress = () => {
    if (onPress) {
      onPress(currentNotification);
    }
    RNNOSCore.handleNotificationTap(currentNotification);
    dismiss();
  };

  const handleActionPress = (actionId: string) => {
    RNNOSCore.handleNotificationTap(currentNotification, actionId);
    dismiss();
  };

  return (
    <SafeAreaView pointerEvents="box-none" style={styles.overlayContainer}>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.animatedCardWrapper,
          {
            transform: [{ translateY }],
            opacity,
          },
        ]}
      >
        {renderCustomBanner ? (
          renderCustomBanner(currentNotification, dismiss)
        ) : (
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={handlePress}
            style={[
              styles.cardContainer,
              currentNotification.color ? { borderColor: currentNotification.color } : null,
            ]}
          >
            {/* Header: Icon, Title, and Type Chip */}
            <View style={styles.cardHeader}>
              {currentNotification.avatar ? (
                <Image source={{ uri: currentNotification.avatar }} style={styles.avatarImage} />
              ) : (
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: currentNotification.color || '#2563eb' },
                  ]}
                >
                  <Text style={styles.iconCircleText}>
                    {currentNotification.type === 'CHAT'
                      ? '💬'
                      : currentNotification.type === 'COMMERCE'
                      ? '🛵'
                      : currentNotification.type === 'MEDIA'
                      ? '🖼️'
                      : '🔔'}
                  </Text>
                </View>
              )}

              <View style={styles.textColumn}>
                <View style={styles.titleRow}>
                  <Text style={styles.titleText} numberOfLines={1}>
                    {currentNotification.title}
                  </Text>
                  <Text style={styles.timeText}>Just now</Text>
                </View>
                <Text style={styles.bodyText} numberOfLines={2}>
                  {currentNotification.body}
                </Text>
              </View>

              {currentNotification.imageUrl ? (
                <Image
                  source={{ uri: currentNotification.imageUrl }}
                  style={styles.thumbnailImage}
                />
              ) : null}
            </View>

            {/* Commerce Order Progress Sub-view */}
            {currentNotification.type === 'COMMERCE' && currentNotification.commerceMetadata && (
              <View style={styles.commerceSection}>
                <View style={styles.commerceRow}>
                  <Text style={styles.stepNameText}>
                    {currentNotification.commerceMetadata.stepName}
                  </Text>
                  {currentNotification.commerceMetadata.estimatedDelivery && (
                    <View style={styles.etaBadge}>
                      <Text style={styles.etaText}>
                        ETA: {currentNotification.commerceMetadata.estimatedDelivery}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(
                          100,
                          Math.max(5, currentNotification.commerceMetadata.progressPercent)
                        )}%`,
                        backgroundColor: currentNotification.color || '#22c55e',
                      },
                    ]}
                  />
                </View>
              </View>
            )}

            {/* Quick Action Button Pills */}
            {currentNotification.actions && currentNotification.actions.length > 0 && (
              <View style={styles.actionsRow}>
                {currentNotification.actions.map((act) => (
                  <TouchableOpacity
                    key={act.id}
                    style={styles.actionPill}
                    onPress={() => handleActionPress(act.id)}
                  >
                    <Text style={styles.actionPillText}>{act.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Bottom Swipe Indicator */}
            <View style={styles.swipeIndicator} />
          </TouchableOpacity>
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    alignItems: 'center',
  },
  animatedCardWrapper: {
    width: Math.min(SCREEN_WIDTH - 24, 420),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 12,
  },
  cardContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 10,
    backgroundColor: '#334155',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconCircleText: {
    fontSize: 18,
  },
  textColumn: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  bodyText: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 18,
  },
  thumbnailImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginLeft: 8,
    backgroundColor: '#1e293b',
  },
  commerceSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#334155',
  },
  commerceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  etaBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#475569',
  },
  etaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38bdf8',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#1e293b',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  actionPill: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  actionPillText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  swipeIndicator: {
    width: 32,
    height: 3,
    backgroundColor: '#475569',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
  },
});
