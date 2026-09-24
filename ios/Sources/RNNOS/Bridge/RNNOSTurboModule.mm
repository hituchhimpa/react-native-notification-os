#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <UserNotifications/UserNotifications.h>
#import "rnnos-Swift.h"

@interface RNNOSTurboModule : RCTEventEmitter <RCTBridgeModule>
@end

static __weak RNNOSTurboModule *weakSharedModule = nil;

@implementation RNNOSTurboModule

RCT_EXPORT_MODULE(RNNOSTurboModule)

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

- (instancetype)init {
    if (self = [super init]) {
        weakSharedModule = self;
        [[NotificationRenderer shared] setEventEmitterHandler:^(NSString * _Nonnull eventName, NSDictionary<NSString *,id> * _Nonnull body) {
            RNNOSTurboModule *strongSelf = weakSharedModule;
            if (strongSelf && strongSelf.bridge) {
                [strongSelf sendEventWithName:eventName body:body];
            }
        }];
    }
    return self;
}

- (NSArray<NSString *> *)supportedEvents {
    return @[
        @"RNNOS_NotificationReceived",
        @"RNNOS_ActionTapped",
        @"RNNOS_InlineReply",
        @"RNNOS_FCMTokenRefresh"
    ];
}

RCT_EXPORT_METHOD(initialize:(NSString *)configJson
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [[NotificationRenderer shared] requestPermissions:^(BOOL granted) {
        resolve(@(granted));
    }];
}

RCT_EXPORT_METHOD(checkPermissionStatus:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [[UNUserNotificationCenter currentNotificationCenter] getNotificationSettingsWithCompletionHandler:^(UNNotificationSettings * _Nonnull settings) {
        if (settings.authorizationStatus == UNAuthorizationStatusAuthorized) {
            resolve(@"GRANTED");
        } else if (settings.authorizationStatus == UNAuthorizationStatusDenied) {
            resolve(@"DENIED");
        } else {
            resolve(@"NOT_DETERMINED");
        }
    }];
}

RCT_EXPORT_METHOD(openNotificationSettings:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        NSURL *url = [NSURL URLWithString:UIApplicationOpenSettingsURLString];
        if ([[UIApplication sharedApplication] canOpenURL:url]) {
            [[UIApplication sharedApplication] openURL:url options:@{} completionHandler:^(BOOL success) {
                resolve(@(success));
            }];
        } else {
            resolve(@(NO));
        }
    });
}

RCT_EXPORT_METHOD(requestNotificationPermission:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [[NotificationRenderer shared] requestPermissions:^(BOOL granted) {
        resolve(@(granted));
    }];
}

RCT_EXPORT_METHOD(getFCMToken:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    resolve(@"");
}

RCT_EXPORT_METHOD(getInitialNotification:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSString *initialJson = [NotificationRenderer shared].initialNotificationJson;
    [NotificationRenderer shared].initialNotificationJson = nil;
    resolve(initialJson ?: [NSNull null]);
}

RCT_EXPORT_METHOD(presentNotification:(NSString *)notificationJson
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [[NotificationRenderer shared] presentNotificationWithJsonString:notificationJson completion:^(BOOL success, NSString * _Nullable error) {
        if (success) {
            resolve(@(YES));
        } else {
            if (error) {
                reject(@"PRESENT_ERROR", error, nil);
            } else {
                resolve(@(NO));
            }
        }
    }];
}

RCT_EXPORT_METHOD(scheduleNotification:(NSString *)notificationJson
                  delaySeconds:(double)delaySeconds
                  repeats:(BOOL)repeats
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [[NotificationRenderer shared] scheduleNotificationWithJsonString:notificationJson delaySeconds:delaySeconds repeats:repeats completion:^(BOOL success, NSString * _Nullable error) {
        if (success) {
            resolve(@(YES));
        } else {
            reject(@"SCHEDULE_ERROR", error ?: @"Failed to schedule notification", nil);
        }
    }];
}

RCT_EXPORT_METHOD(cancelScheduledNotification:(NSString *)notificationId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [[NotificationRenderer shared] cancelScheduledNotificationWithId:notificationId];
    resolve(@(YES));
}

RCT_EXPORT_METHOD(cancelAllScheduledNotifications:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [[NotificationRenderer shared] cancelAllScheduledNotifications];
    resolve(@(YES));
}

RCT_EXPORT_METHOD(dismissNotification:(NSString *)notificationId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [[UNUserNotificationCenter currentNotificationCenter] removeDeliveredNotificationsWithIdentifiers:@[notificationId]];
    resolve(@(YES));
}

RCT_EXPORT_METHOD(dismissAllNotifications:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [[UNUserNotificationCenter currentNotificationCenter] removeAllDeliveredNotifications];
    resolve(@(YES));
}

RCT_EXPORT_METHOD(setBadgeCount:(double)count
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        [UIApplication sharedApplication].applicationIconBadgeNumber = (NSInteger)count;
        resolve(@(YES));
    });
}

RCT_EXPORT_METHOD(getBadgeCount:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        NSInteger badge = [UIApplication sharedApplication].applicationIconBadgeNumber;
        resolve(@(badge));
    });
}

RCT_EXPORT_METHOD(getDeliveredNotifications:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [[UNUserNotificationCenter currentNotificationCenter] getDeliveredNotificationsWithCompletionHandler:^(NSArray<UNNotification *> * _Nonnull notifications) {
        NSMutableArray *list = [NSMutableArray array];
        for (UNNotification *notif in notifications) {
            NSMutableDictionary *dict = [NSMutableDictionary dictionary];
            dict[@"id"] = notif.request.identifier;
            dict[@"title"] = notif.request.content.title;
            dict[@"body"] = notif.request.content.body;
            dict[@"date"] = @([notif.date timeIntervalSince1970] * 1000);
            if (notif.request.content.userInfo) {
                dict[@"data"] = notif.request.content.userInfo;
            }
            [list addObject:dict];
        }
        NSData *data = [NSJSONSerialization dataWithJSONObject:list options:0 error:nil];
        NSString *jsonStr = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
        resolve(jsonStr ?: @"[]");
    }];
}

RCT_EXPORT_METHOD(createChannel:(NSString *)channelJson
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    resolve(@(YES));
}

RCT_EXPORT_METHOD(getNotificationHistory:(double)limit
                  offset:(double)offset
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSString *jsonStr = [[NotificationRenderer shared] getNotificationHistoryWithLimit:(NSInteger)limit offset:(NSInteger)offset];
    resolve(jsonStr ?: @"[]");
}

RCT_EXPORT_METHOD(clearNotificationHistory:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [[NotificationRenderer shared] clearNotificationHistory];
    resolve(@(YES));
}

@end
