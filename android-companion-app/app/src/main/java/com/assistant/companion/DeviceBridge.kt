package com.assistant.companion

import android.content.Context
import android.database.Cursor
import android.provider.ContactsContract
import android.telephony.SmsManager
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

object DeviceBridge {
    private const val TAG = "AssistantDeviceBridge"
    
    var serverBaseUrl: String = "http://10.0.2.2:3000" // Default for Android Emulator or LAN IP
    var pairingKey: String = ""

    /**
     * Reads real phone contacts from Android ContactsContract and sends them to the Assistant server
     */
    fun syncContactsToServer(context: Context, onComplete: (Int) -> Unit) {
        thread {
            val contactsList = JSONArray()
            val resolver = context.contentResolver
            val cursor: Cursor? = resolver.query(
                ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                arrayOf(
                    ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                    ContactsContract.CommonDataKinds.Phone.NUMBER
                ),
                null,
                null,
                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " ASC"
            )

            cursor?.use {
                val nameIdx = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
                val numIdx = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)

                while (it.moveToNext()) {
                    val name = it.getString(nameIdx) ?: continue
                    val phone = it.getString(numIdx) ?: continue

                    val item = JSONObject()
                    item.put("name", name)
                    item.put("phone", phone)
                    contactsList.put(item)
                }
            }

            Log.i(TAG, "Extracted ${contactsList.length()} contacts from Android address book")

            // Transmit to Assistant server
            try {
                val url = URL("$serverBaseUrl/api/device/sync-contacts")
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                conn.setRequestProperty("X-Device-Pairing-Key", pairingKey)
                conn.doOutput = true

                val payload = JSONObject()
                payload.put("contacts", contactsList)

                OutputStreamWriter(conn.outputStream).use { it.write(payload.toString()) }
                val code = conn.responseCode
                Log.d(TAG, "Contacts sync HTTP response: $code")
                onComplete(contactsList.length())
            } catch (e: Exception) {
                Log.e(TAG, "Failed to upload contacts to server", e)
                onComplete(0)
            }
        }
    }

    /**
     * Posts real incoming SMS or WhatsApp message to the Assistant server
     */
    fun postIncomingMessage(
        context: Context,
        channel: String,
        senderNumber: String,
        messageBody: String,
        timestamp: Long
    ) {
        thread {
            try {
                val url = URL("$serverBaseUrl/api/device/message-ingress")
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                conn.setRequestProperty("X-Device-Pairing-Key", pairingKey)
                conn.doOutput = true

                val payload = JSONObject().apply {
                    put("channel", channel)
                    put("sender", senderNumber)
                    put("body", messageBody)
                    put("timestamp", timestamp)
                }

                OutputStreamWriter(conn.outputStream).use { it.write(payload.toString()) }
                Log.d(TAG, "Posted incoming $channel to server. HTTP ${conn.responseCode}")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to post incoming message to server", e)
            }
        }
    }

    /**
     * Executes real sending when user approves a message on the Assistant dashboard
     */
    fun executeRealSend(context: Context, channel: String, recipient: String, messageText: String): Boolean {
        return if (channel.equals("sms", ignoreCase = true)) {
            try {
                val smsManager = context.getSystemService(SmsManager::class.java) ?: SmsManager.getDefault()
                val parts = smsManager.divideMessage(messageText)
                if (parts.size > 1) {
                    smsManager.sendMultipartTextMessage(recipient, null, parts, null, null)
                } else {
                    smsManager.sendTextMessage(recipient, null, messageText, null, null)
                }
                Log.i(TAG, "Real SMS dispatched to $recipient: $messageText")
                true
            } catch (e: Exception) {
                Log.e(TAG, "Failed to send real SMS", e)
                false
            }
        } else if (channel.equals("whatsapp", ignoreCase = true)) {
            WhatsAppNotificationListener.sendReplyToWhatsApp(context, recipient, messageText)
        } else {
            false
        }
    }
}
