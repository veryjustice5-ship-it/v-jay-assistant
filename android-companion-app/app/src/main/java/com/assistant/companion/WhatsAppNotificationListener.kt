package com.assistant.companion

import android.app.Notification
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.RemoteInput
import java.util.concurrent.ConcurrentHashMap

class WhatsAppNotificationListener : NotificationListenerService() {

    companion object {
        private const val TAG = "AssistantWAListener"
        private const val WHATSAPP_PACKAGE = "com.whatsapp"

        // Cache active wearable quick-reply actions keyed by sender title
        val activeReplyActions = ConcurrentHashMap<String, NotificationCompat.Action>()

        /**
         * Sends an approved reply directly back to WhatsApp through Android's RemoteInput
         */
        fun sendReplyToWhatsApp(context: Context, senderKey: String, replyText: String): Boolean {
            val action = activeReplyActions[senderKey]
            if (action == null) {
                Log.w(TAG, "No active RemoteInput action cached for sender: $senderKey (Notification may have been dismissed)")
                return false
            }

            try {
                val intent = Intent()
                val bundle = Bundle()

                action.remoteInputs?.forEach { remoteInput ->
                    bundle.putCharSequence(remoteInput.resultKey, replyText)
                }

                RemoteInput.addResultsToIntent(action.remoteInputs, intent, bundle)
                action.actionIntent.send(context, 0, intent)
                Log.i(TAG, "Successfully dispatched quick-reply to WhatsApp for $senderKey")
                return true
            } catch (e: Exception) {
                Log.e(TAG, "Failed to send WhatsApp quick-reply", e)
                return false
            }
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null || sbn.packageName != WHATSAPP_PACKAGE) return

        val notification = sbn.notification ?: return
        val extras = notification.extras ?: return

        // 1. Extract sender name / group title
        val title = extras.getString(Notification.EXTRA_TITLE) ?: return
        // 2. Extract message body
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: return

        // Ignore summary headers or "Checking for messages..." status
        if (text.isBlank() || text.contains("new messages", ignoreCase = true)) return

        Log.d(TAG, "WhatsApp message intercepted from: '$title': '$text'")

        // 3. Extract Wearable Extender Quick Reply Action
        val quickReplyAction = findWearableQuickReplyAction(notification)
        if (quickReplyAction != null) {
            activeReplyActions[title] = quickReplyAction
            Log.d(TAG, "Cached RemoteInput quick-reply action for $title")
        }

        // 4. Forward message to Assistant Server
        DeviceBridge.postIncomingMessage(
            context = applicationContext,
            channel = "whatsapp",
            senderNumber = title,
            messageBody = text,
            timestamp = sbn.postTime
        )
    }

    private fun findWearableQuickReplyAction(notification: Notification): NotificationCompat.Action? {
        val wearableExtender = NotificationCompat.WearableExtender(notification)
        for (action in wearableExtender.actions) {
            if (action.remoteInputs != null && action.remoteInputs!!.isNotEmpty()) {
                return action
            }
        }

        // Fallback to standard notification actions
        val wearableActionCount = NotificationCompat.getActionCount(notification)
        for (i in 0 until wearableActionCount) {
            val action = NotificationCompat.getAction(notification, i)
            if (action?.remoteInputs != null && action.remoteInputs!!.isNotEmpty()) {
                return action
            }
        }

        return null
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        // Notification dismissed by user or WhatsApp
    }
}
