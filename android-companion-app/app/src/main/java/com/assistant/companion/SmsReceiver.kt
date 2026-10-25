package com.assistant.companion

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log

class SmsReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "AssistantSmsReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
            if (messages.isNullOrEmpty()) return

            val sender = messages[0].displayOriginatingAddress ?: "Unknown"
            val fullBody = buildString {
                for (sms in messages) {
                    append(sms.displayMessageBody)
                }
            }

            Log.d(TAG, "Real incoming SMS detected from: $sender (length: ${fullBody.length})")

            // Forward to Assistant Sync Service / REST API
            DeviceBridge.postIncomingMessage(
                context = context,
                channel = "sms",
                senderNumber = sender,
                messageBody = fullBody,
                timestamp = System.currentTimeMillis()
            )
        }
    }
}
