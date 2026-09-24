package com.rnnos

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import com.rnnos.core.data.cache.DuplicateDetector
import com.rnnos.core.domain.model.NormalizedNotification
import com.rnnos.core.domain.model.NotificationType
import com.rnnos.core.engines.ChatEngine
import com.rnnos.core.engines.CommerceEngine
import com.rnnos.core.renderers.NotificationRenderer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

class RNNOSTurboModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    init {
        instance = this
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = "RNNOSTurboModule"

    override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
        // No-op
    }

    override fun onNewIntent(intent: Intent?) {
        if (intent == null) return
        val notifJson = intent.getStringExtra("notification_json") ?: intent.getStringExtra("notification_payload")
        val notifId = intent.getStringExtra("notification_id")
        val actionId = intent.getStringExtra("action_id")
        val deepLink = intent.getStringExtra("deep_link")

        if (!notifJson.isNullOrEmpty() || !notifId.isNullOrEmpty()) {
            initialNotificationJson = notifJson
            sendNotificationTappedEvent(notifId ?: "", actionId, deepLink, notifJson)
        }
    }

    companion object {
        private var instance: RNNOSTurboModule? = null
        var initialNotificationJson: String? = null

        fun sendInlineReplyEvent(threadId: String, replyText: String) {
            try {
                val params = Arguments.createMap().apply {
                    putString("threadId", threadId)
                    putString("replyText", replyText)
                }
                instance?.reactContext
                    ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit("RNNOS_InlineReply", params)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        fun sendNotificationTappedEvent(
            notificationId: String,
            actionId: String?,
            deepLink: String? = null,
            notificationJson: String? = null
        ) {
            try {
                val params = Arguments.createMap().apply {
                    putString("notificationId", notificationId)
                    actionId?.let { putString("actionId", it) }
                    deepLink?.let { putString("deepLink", it) }
                    notificationJson?.let { putString("notificationJson", it) }
                }
                instance?.reactContext
                    ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit("RNNOS_ActionTapped", params)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        fun sendTokenRefreshEvent(token: String) {
            try {
                val params = Arguments.createMap().apply {
                    putString("token", token)
                }
                instance?.reactContext
                    ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit("RNNOS_FCMTokenRefresh", params)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        fun sendNotificationReceivedEvent(notification: NormalizedNotification) {
            try {
                val params = Arguments.createMap().apply {
                    putString("id", notification.id)
                    putString("title", notification.title)
                    putString("body", notification.body)
                    putString("type", notification.type.name)
                    notification.category?.let { putString("category", it) }
                    notification.deepLink?.let { putString("deepLink", it) }
                    putString("notificationJson", notification.toJsonString())
                }
                instance?.reactContext
                    ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit("RNNOS_NotificationReceived", params)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    @ReactMethod
    fun initialize(configJson: String, promise: Promise) {
        try {
            NotificationRenderer.ensureChannel(reactContext, null, null)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("INIT_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun checkPermissionStatus(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                val granted = ContextCompat.checkSelfPermission(
                    reactContext,
                    android.Manifest.permission.POST_NOTIFICATIONS
                ) == android.content.pm.PackageManager.PERMISSION_GRANTED
                promise.resolve(if (granted) "GRANTED" else "DENIED")
            } else {
                val enabled = androidx.core.app.NotificationManagerCompat.from(reactContext).areNotificationsEnabled()
                promise.resolve(if (enabled) "GRANTED" else "DENIED")
            }
        } catch (e: Exception) {
            promise.resolve("DENIED")
        }
    }

    @ReactMethod
    fun openNotificationSettings(promise: Promise) {
        try {
            val intent = android.content.Intent().apply {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    action = android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS
                    putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, reactContext.packageName)
                } else {
                    action = "android.settings.APP_NOTIFICATION_SETTINGS"
                    putExtra("app_package", reactContext.packageName)
                    putExtra("app_uid", reactContext.applicationInfo.uid)
                }
                flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun requestNotificationPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                val granted = ContextCompat.checkSelfPermission(
                    reactContext,
                    android.Manifest.permission.POST_NOTIFICATIONS
                ) == android.content.pm.PackageManager.PERMISSION_GRANTED

                if (granted) {
                    promise.resolve(true)
                    return
                }

                val activity = currentActivity
                if (activity is PermissionAwareActivity) {
                    activity.requestPermissions(
                        arrayOf(android.Manifest.permission.POST_NOTIFICATIONS),
                        1001,
                        PermissionListener { requestCode, _, grantResults ->
                            if (requestCode == 1001) {
                                val isGranted = grantResults.isNotEmpty() && grantResults[0] == android.content.pm.PackageManager.PERMISSION_GRANTED
                                promise.resolve(isGranted)
                                true
                            } else {
                                false
                            }
                        }
                    )
                } else if (activity != null) {
                    androidx.core.app.ActivityCompat.requestPermissions(
                        activity,
                        arrayOf(android.Manifest.permission.POST_NOTIFICATIONS),
                        1001
                    )
                    promise.resolve(false)
                } else {
                    promise.resolve(false)
                }
            } else {
                val enabled = androidx.core.app.NotificationManagerCompat.from(reactContext).areNotificationsEnabled()
                promise.resolve(enabled)
            }
        } catch (e: Exception) {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun getFCMToken(promise: Promise) {
        try {
            if (com.google.firebase.FirebaseApp.getApps(reactContext).isEmpty()) {
                promise.resolve("")
                return
            }
            com.google.firebase.messaging.FirebaseMessaging.getInstance().token
                .addOnCompleteListener { task ->
                    if (task.isSuccessful && task.result != null) {
                        promise.resolve(task.result)
                    } else {
                        promise.resolve("")
                    }
                }
        } catch (e: Exception) {
            promise.resolve("")
        }
    }

    @ReactMethod
    fun getInitialNotification(promise: Promise) {
        try {
            if (initialNotificationJson != null) {
                val json = initialNotificationJson
                initialNotificationJson = null
                promise.resolve(json)
                return
            }

            val activity = currentActivity
            val intent = activity?.intent
            val json = intent?.getStringExtra("notification_json") ?: intent?.getStringExtra("notification_payload")
            if (json != null) {
                intent?.removeExtra("notification_json")
                intent?.removeExtra("notification_payload")
                promise.resolve(json)
                return
            }

            val notifId = intent?.getStringExtra("notification_id")
            if (notifId != null) {
                val obj = JSONObject().apply {
                    put("id", notifId)
                    put("threadId", intent.getStringExtra("thread_id"))
                    put("deepLink", intent.getStringExtra("deep_link"))
                }
                intent.removeExtra("notification_id")
                promise.resolve(obj.toString())
                return
            }

            promise.resolve(null)
        } catch (e: Exception) {
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun presentNotification(notificationJson: String, promise: Promise) {
        try {
            val notification = NormalizedNotification.fromJsonString(notificationJson)

            if (DuplicateDetector.isDuplicate(notification)) {
                promise.resolve(false)
                return
            }

            when (notification.type) {
                NotificationType.CHAT -> {
                    ChatEngine.processChatMessage(reactContext, notification)
                }
                NotificationType.COMMERCE -> {
                    CommerceEngine.updateOrderProgress(reactContext, notification)
                }
                else -> {
                    CoroutineScope(Dispatchers.IO).launch {
                        NotificationRenderer.render(reactContext, notification, isSilentUpdate = false)
                    }
                }
            }

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("PRESENT_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun scheduleNotification(notificationJson: String, delaySeconds: Double, repeats: Boolean, promise: Promise) {
        try {
            val notification = NormalizedNotification.fromJsonString(notificationJson)
            NotificationRenderer.scheduleNotification(reactContext, notification, delaySeconds.toLong())
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SCHEDULE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun cancelScheduledNotification(id: String, promise: Promise) {
        try {
            NotificationRenderer.cancelScheduledNotification(reactContext, id)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun cancelAllScheduledNotifications(promise: Promise) {
        promise.resolve(true)
    }

    @ReactMethod
    fun dismissNotification(id: String, promise: Promise) {
        try {
            val manager = androidx.core.app.NotificationManagerCompat.from(reactContext)
            manager.cancel(id.hashCode())
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("DISMISS_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun dismissAllNotifications(promise: Promise) {
        try {
            val manager = androidx.core.app.NotificationManagerCompat.from(reactContext)
            manager.cancelAll()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("DISMISS_ALL_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getDeliveredNotifications(promise: Promise) {
        try {
            val manager = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
            val activeNotifs = manager.activeNotifications
            val result = JSONArray()
            for (sbn in activeNotifs) {
                val extras = sbn.notification.extras
                val obj = JSONObject().apply {
                    put("id", sbn.id.toString())
                    put("tag", sbn.tag ?: "")
                    put("packageName", sbn.packageName)
                    put("postTime", sbn.postTime)
                    put("title", extras.getCharSequence(android.app.Notification.EXTRA_TITLE)?.toString() ?: "")
                    put("body", extras.getCharSequence(android.app.Notification.EXTRA_TEXT)?.toString() ?: "")
                    put("subText", extras.getCharSequence(android.app.Notification.EXTRA_SUB_TEXT)?.toString() ?: "")
                }
                result.put(obj)
            }
            promise.resolve(result.toString())
        } catch (e: Exception) {
            promise.resolve("[]")
        }
    }

    @ReactMethod
    fun createChannel(channelJson: String, promise: Promise) {
        try {
            val json = JSONObject(channelJson)
            val id = json.getString("id")
            val name = json.getString("name")
            val importanceStr = json.optString("importance", "HIGH")
            val importance = when (importanceStr.uppercase()) {
                "NONE" -> android.app.NotificationManager.IMPORTANCE_NONE
                "MIN" -> android.app.NotificationManager.IMPORTANCE_MIN
                "LOW" -> android.app.NotificationManager.IMPORTANCE_LOW
                "HIGH" -> android.app.NotificationManager.IMPORTANCE_HIGH
                "MAX" -> android.app.NotificationManager.IMPORTANCE_MAX
                else -> android.app.NotificationManager.IMPORTANCE_DEFAULT
            }
            NotificationRenderer.ensureChannel(reactContext, id, name, importance)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CHANNEL_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun setBadgeCount(count: Int, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("rnnos_prefs", Context.MODE_PRIVATE)
            prefs.edit().putInt("badge_count", count).apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun getBadgeCount(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("rnnos_prefs", Context.MODE_PRIVATE)
            val count = prefs.getInt("badge_count", 0)
            promise.resolve(count)
        } catch (e: Exception) {
            promise.resolve(0)
        }
    }

    @ReactMethod
    fun getNotificationHistory(limit: Int, offset: Int, promise: Promise) {
        val history = NotificationRenderer.getNotificationHistory(reactContext, limit, offset)
        promise.resolve(history)
    }

    @ReactMethod
    fun clearNotificationHistory(promise: Promise) {
        NotificationRenderer.clearNotificationHistory(reactContext)
        promise.resolve(true)
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Handled by RN Event Emitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Handled by RN Event Emitter
    }
}
