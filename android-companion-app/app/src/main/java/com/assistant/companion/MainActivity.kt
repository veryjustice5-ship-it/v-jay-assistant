package com.assistant.companion

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private lateinit var etServerUrl: EditText
    private lateinit var etPairingKey: EditText
    private lateinit var btnPair: Button
    private lateinit var btnRequestPermissions: Button
    private lateinit var btnGrantNotificationAccess: Button
    private lateinit var btnSyncContacts: Button
    private lateinit var tvStatus: TextView

    companion object {
        private const val PERMISSION_REQUEST_CODE = 101
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        etServerUrl = findViewById(R.id.etServerUrl)
        etPairingKey = findViewById(R.id.etPairingKey)
        btnPair = findViewById(R.id.btnPair)
        btnRequestPermissions = findViewById(R.id.btnRequestPermissions)
        btnGrantNotificationAccess = findViewById(R.id.btnGrantNotificationAccess)
        btnSyncContacts = findViewById(R.id.btnSyncContacts)
        tvStatus = findViewById(R.id.tvStatus)

        btnPair.setOnClickListener {
            val url = etServerUrl.text.toString().trim()
            val key = etPairingKey.text.toString().trim()
            if (url.isNotEmpty()) {
                DeviceBridge.serverBaseUrl = url
                DeviceBridge.pairingKey = key
                tvStatus.text = "Connected to $url (Pairing Key configured)"
                Toast.makeText(this, "Paired with Assistant Server!", Toast.LENGTH_SHORT).show()
            }
        }

        btnRequestPermissions.setOnClickListener {
            requestPhonePermissions()
        }

        btnGrantNotificationAccess.setOnClickListener {
            // Open Android Notification Access settings for WhatsApp listener
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
            startActivity(intent)
            Toast.makeText(this, "Enable 'WhatsApp Assistant Bridge' in the list", Toast.LENGTH_LONG).show()
        }

        btnSyncContacts.setOnClickListener {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED) {
                tvStatus.text = "Reading contacts from phone..."
                DeviceBridge.syncContactsToServer(this) { count ->
                    runOnUiThread {
                        tvStatus.text = "Synced $count real contacts to Assistant!"
                        Toast.makeText(this, "Synced $count contacts!", Toast.LENGTH_SHORT).show()
                    }
                }
            } else {
                requestPhonePermissions()
            }
        }
    }

    private fun requestPhonePermissions() {
        val permissions = mutableListOf(
            Manifest.permission.RECEIVE_SMS,
            Manifest.permission.READ_SMS,
            Manifest.permission.SEND_SMS,
            Manifest.permission.READ_CONTACTS
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        ActivityCompat.requestPermissions(this, permissions.toTypedArray(), PERMISSION_REQUEST_CODE)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQUEST_CODE) {
            val allGranted = grantResults.all { it == PackageManager.PERMISSION_GRANTED }
            if (allGranted) {
                tvStatus.text = "All SMS & Contacts permissions granted!"
            } else {
                tvStatus.text = "Some permissions were denied. SMS/Contacts may be limited."
            }
        }
    }
}
