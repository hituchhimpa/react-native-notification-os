package com.rnnos.core.renderers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.rnnos.core.domain.model.NormalizedNotification
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class NotificationScheduleReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val jsonStr = intent.getStringExtra("notification_json") ?: return
        try {
            val notification = NormalizedNotification.fromJsonString(jsonStr)
            CoroutineScope(Dispatchers.IO).launch {
                NotificationRenderer.render(context, notification, isSilentUpdate = false)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
