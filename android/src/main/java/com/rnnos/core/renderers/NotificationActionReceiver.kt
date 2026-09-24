package com.rnnos.core.renderers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.RemoteInput
import com.rnnos.core.engines.ChatEngine

class NotificationActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val actionId = intent.getStringExtra("actionId")
        val threadId = intent.getStringExtra("threadId")
        val notificationId = intent.getStringExtra("notificationId")
        val notifJson = intent.getStringExtra("notification_json")
        val deepLink = intent.getStringExtra("deepLink")

        if ("com.rnnos.ACTION_INLINE_REPLY" == intent.action) {
            val remoteInputResults = RemoteInput.getResultsFromIntent(intent)
            if (remoteInputResults != null) {
                val replyText = remoteInputResults.getCharSequence(NotificationRenderer.KEY_TEXT_REPLY)?.toString()

                if (!replyText.isNullOrEmpty() && !threadId.isNullOrEmpty()) {
                    ChatEngine.appendUserReply(context, threadId, replyText)
                    com.rnnos.RNNOSTurboModule.sendInlineReplyEvent(threadId, replyText)
                }
            }
        } else if ("com.rnnos.ACTION_BUTTON_CLICK" == intent.action) {
            if (!actionId.isNullOrEmpty()) {
                if (actionId.contains("read") && !threadId.isNullOrEmpty()) {
                    ChatEngine.markThreadAsRead(context, threadId)
                } else {
                    // Open app on non-silent button click
                    val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                        putExtra("notification_id", notificationId)
                        putExtra("action_id", actionId)
                        putExtra("deep_link", deepLink)
                        putExtra("notification_json", notifJson)
                    }
                    if (launchIntent != null) {
                        context.startActivity(launchIntent)
                    }
                }

                if (!notificationId.isNullOrEmpty()) {
                    com.rnnos.RNNOSTurboModule.sendNotificationTappedEvent(notificationId, actionId, deepLink, notifJson)
                }
            }
        }
    }
}
