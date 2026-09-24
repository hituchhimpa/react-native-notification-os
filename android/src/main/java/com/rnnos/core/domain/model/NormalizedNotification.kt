package com.rnnos.core.domain.model

import org.json.JSONArray
import org.json.JSONObject

enum class NotificationPriority {
    MIN, LOW, DEFAULT, HIGH, MAX
}

enum class NotificationType {
    GENERIC, CHAT, COMMERCE, MEDIA, PROGRESS
}

data class NotificationAction(
    val id: String,
    val title: String,
    val type: String, // BUTTON, TEXT_INPUT, DESTRUCTIVE
    val placeholder: String? = null,
    val authenticationRequired: Boolean = false
) {
    fun toJsonObject(): JSONObject = JSONObject().apply {
        put("id", id)
        put("title", title)
        put("type", type)
        placeholder?.let { put("placeholder", it) }
        put("authenticationRequired", authenticationRequired)
    }

    companion object {
        fun fromJsonObject(json: JSONObject): NotificationAction = NotificationAction(
            id = json.getString("id"),
            title = json.getString("title"),
            type = json.optString("type", "BUTTON"),
            placeholder = json.optString("placeholder", null),
            authenticationRequired = json.optBoolean("authenticationRequired", false)
        )
    }
}

data class ChatMessage(
    val id: String,
    val text: String,
    val timestamp: Long,
    val senderId: String,
    val senderName: String,
    val senderAvatar: String? = null
) {
    fun toJsonObject(): JSONObject = JSONObject().apply {
        put("id", id)
        put("text", text)
        put("timestamp", timestamp)
        put("senderId", senderId)
        put("senderName", senderName)
        senderAvatar?.let { put("senderAvatar", it) }
    }

    companion object {
        fun fromJsonObject(json: JSONObject): ChatMessage = ChatMessage(
            id = json.optString("id", System.currentTimeMillis().toString()),
            text = json.getString("text"),
            timestamp = json.optLong("timestamp", System.currentTimeMillis()),
            senderId = json.optString("senderId", ""),
            senderName = json.optString("senderName", "Sender"),
            senderAvatar = json.optString("senderAvatar", null)
        )
    }
}

data class ChatConversation(
    val threadId: String,
    val senderId: String,
    val senderName: String,
    val senderAvatar: String? = null,
    val isGroup: Boolean = false,
    val groupName: String? = null,
    val messages: List<ChatMessage> = emptyList(),
    val unreadCount: Int = 0
) {
    fun toJsonObject(): JSONObject = JSONObject().apply {
        put("threadId", threadId)
        put("senderId", senderId)
        put("senderName", senderName)
        senderAvatar?.let { put("senderAvatar", it) }
        put("isGroup", isGroup)
        groupName?.let { put("groupName", it) }
        val msgArr = JSONArray()
        messages.forEach { msgArr.put(it.toJsonObject()) }
        put("messages", msgArr)
        put("unreadCount", unreadCount)
    }

    companion object {
        fun fromJsonObject(json: JSONObject): ChatConversation {
            var msgArr = json.optJSONArray("messages")
            if (msgArr == null) {
                val str = json.optString("messages", null)
                if (!str.isNullOrEmpty() && str.startsWith("[")) {
                    msgArr = try { JSONArray(str) } catch (_: Exception) { null }
                }
            }
            val list = mutableListOf<ChatMessage>()
            if (msgArr != null) {
                for (i in 0 until msgArr.length()) {
                    list.add(ChatMessage.fromJsonObject(msgArr.getJSONObject(i)))
                }
            }
            return ChatConversation(
                threadId = json.optString("threadId", ""),
                senderId = json.optString("senderId", ""),
                senderName = json.optString("senderName", "Sender"),
                senderAvatar = json.optString("senderAvatar", null),
                isGroup = json.optBoolean("isGroup", json.optString("isGroup") == "true"),
                groupName = json.optString("groupName", null),
                messages = list,
                unreadCount = json.optInt("unreadCount", 0)
            )
        }
    }
}

data class CommerceProgress(
    val orderId: String,
    val currentStep: Int,
    val totalSteps: Int,
    val stepName: String,
    val progressPercent: Int,
    val estimatedDelivery: String? = null,
    val statusText: String? = null,
    val trackerUrl: String? = null,
    val silentUpdate: Boolean = false
) {
    fun toJsonObject(): JSONObject = JSONObject().apply {
        put("orderId", orderId)
        put("currentStep", currentStep)
        put("totalSteps", totalSteps)
        put("stepName", stepName)
        put("progressPercent", progressPercent)
        estimatedDelivery?.let { put("estimatedDelivery", it) }
        statusText?.let { put("statusText", it) }
        trackerUrl?.let { put("trackerUrl", it) }
        put("silentUpdate", silentUpdate)
    }

    companion object {
        fun fromJsonObject(json: JSONObject): CommerceProgress = CommerceProgress(
            orderId = json.getString("orderId"),
            currentStep = json.optInt("currentStep", 1),
            totalSteps = json.optInt("totalSteps", 4),
            stepName = json.optString("stepName", "Processing"),
            progressPercent = json.optInt("progressPercent", 25),
            estimatedDelivery = json.optString("estimatedDelivery", null),
            statusText = json.optString("statusText", null),
            trackerUrl = json.optString("trackerUrl", null),
            silentUpdate = json.optBoolean("silentUpdate", json.optString("silentUpdate") == "true")
        )
    }
}

data class NormalizedNotification(
    val id: String,
    val messageId: String,
    val collapseKey: String? = null,
    val threadId: String? = null,
    val category: String? = null,
    val title: String,
    val body: String,
    val subtitle: String? = null,
    val badge: Int? = null,
    val sound: String? = null,
    val priority: NotificationPriority = NotificationPriority.DEFAULT,
    val avatar: String? = null,
    val imageUrl: String? = null,
    val color: String? = null,
    val useCustomLayout: Boolean = false,
    val gradientColors: List<String> = emptyList(),
    val deepLink: String? = null,
    val data: Map<String, Any> = emptyMap(),
    val actions: List<NotificationAction> = emptyList(),
    val timestamp: Long = System.currentTimeMillis(),
    val type: NotificationType = NotificationType.GENERIC,
    val commerceMetadata: CommerceProgress? = null,
    val chatMetadata: ChatConversation? = null,
    val isRead: Boolean = false,
    val isSuppressed: Boolean = false,
    val silentUpdate: Boolean = false
) {
    fun toJsonString(): String {
        val json = JSONObject()
        json.put("id", id)
        json.put("messageId", messageId)
        collapseKey?.let { json.put("collapseKey", it) }
        threadId?.let { json.put("threadId", it) }
        category?.let { json.put("category", it) }
        json.put("title", title)
        json.put("body", body)
        subtitle?.let { json.put("subtitle", it) }
        badge?.let { json.put("badge", it) }
        sound?.let { json.put("sound", it) }
        json.put("priority", priority.name)
        avatar?.let { json.put("avatar", it) }
        imageUrl?.let { json.put("imageUrl", it) }
        color?.let { json.put("color", it) }
        json.put("useCustomLayout", useCustomLayout)
        val gradArr = JSONArray()
        gradientColors.forEach { gradArr.put(it) }
        json.put("gradientColors", gradArr)
        deepLink?.let { json.put("deepLink", it) }
        
        val dataObj = JSONObject()
        data.forEach { (k, v) -> dataObj.put(k, v) }
        json.put("data", dataObj)

        val actionArr = JSONArray()
        actions.forEach { actionArr.put(it.toJsonObject()) }
        json.put("actions", actionArr)

        json.put("timestamp", timestamp)
        json.put("type", type.name)
        commerceMetadata?.let { json.put("commerceMetadata", it.toJsonObject()) }
        chatMetadata?.let { json.put("chatMetadata", it.toJsonObject()) }
        json.put("isRead", isRead)
        json.put("isSuppressed", isSuppressed)
        json.put("silentUpdate", silentUpdate)

        return json.toString()
    }

    companion object {
        fun fromJsonString(jsonStr: String): NormalizedNotification {
            val json = JSONObject(jsonStr)
            val dataMap = mutableMapOf<String, Any>()
            
            var dataObj = json.optJSONObject("data")
            if (dataObj == null) {
                val str = json.optString("data", null)
                if (!str.isNullOrEmpty() && str.startsWith("{")) {
                    dataObj = try { JSONObject(str) } catch (_: Exception) { null }
                }
            }
            dataObj?.keys()?.forEach { key ->
                dataMap[key] = dataObj.get(key)
            }

            var actionArr = json.optJSONArray("actions")
            if (actionArr == null) {
                val str = json.optString("actions", null)
                if (!str.isNullOrEmpty() && str.startsWith("[")) {
                    actionArr = try { JSONArray(str) } catch (_: Exception) { null }
                }
            }
            val actionList = mutableListOf<NotificationAction>()
            if (actionArr != null) {
                for (i in 0 until actionArr.length()) {
                    val item = actionArr.optJSONObject(i)
                    if (item != null) {
                        actionList.add(NotificationAction.fromJsonObject(item))
                    }
                }
            }

            val gradArr = json.optJSONArray("gradientColors") ?: JSONArray()
            val gradList = mutableListOf<String>()
            for (i in 0 until gradArr.length()) {
                gradList.add(gradArr.getString(i))
            }

            val typeStr = json.optString("type", "GENERIC").uppercase()
            val priorityStr = json.optString("priority", "DEFAULT").uppercase()

            val commerceObj = json.optJSONObject("commerceMetadata")
                ?: run {
                    val str = json.optString("commerceMetadata", null)
                    if (!str.isNullOrEmpty() && str.startsWith("{")) {
                        try { JSONObject(str) } catch (_: Exception) { null }
                    } else null
                }

            val chatObj = json.optJSONObject("chatMetadata")
                ?: run {
                    val str = json.optString("chatMetadata", null)
                    if (!str.isNullOrEmpty() && str.startsWith("{")) {
                        try { JSONObject(str) } catch (_: Exception) { null }
                    } else null
                }

            val badgeVal = if (json.has("badge")) {
                try { json.getInt("badge") } catch (_: Exception) { json.optString("badge").toIntOrNull() }
            } else null

            return NormalizedNotification(
                id = json.optString("id", System.currentTimeMillis().toString()),
                messageId = json.optString("messageId", json.optString("id", System.currentTimeMillis().toString())),
                collapseKey = json.optString("collapseKey", null),
                threadId = json.optString("threadId", null),
                category = json.optString("category", null),
                title = json.optString("title", ""),
                body = json.optString("body", ""),
                subtitle = json.optString("subtitle", null),
                badge = badgeVal,
                sound = json.optString("sound", null),
                priority = try { NotificationPriority.valueOf(priorityStr) } catch (_: Exception) { NotificationPriority.DEFAULT },
                avatar = json.optString("avatar", null),
                imageUrl = json.optString("imageUrl", null),
                color = json.optString("color", null),
                useCustomLayout = json.optBoolean("useCustomLayout", json.optString("useCustomLayout") == "true"),
                gradientColors = gradList,
                deepLink = json.optString("deepLink", null),
                data = dataMap,
                actions = actionList,
                timestamp = json.optLong("timestamp", System.currentTimeMillis()),
                type = try { NotificationType.valueOf(typeStr) } catch (_: Exception) { NotificationType.GENERIC },
                commerceMetadata = commerceObj?.let { CommerceProgress.fromJsonObject(it) },
                chatMetadata = chatObj?.let { ChatConversation.fromJsonObject(it) },
                isRead = json.optBoolean("isRead", false),
                isSuppressed = json.optBoolean("isSuppressed", false),
                silentUpdate = json.optBoolean("silentUpdate", json.optString("silentUpdate") == "true")
            )
        }
    }
}
