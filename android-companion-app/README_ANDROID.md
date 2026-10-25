# Android Companion App for Personal AI Messaging Assistant

This companion app bridges your physical Android phone with the Personal AI Messaging Assistant to:
1. **Read & Receive Real Incoming SMS** via Android `BroadcastReceiver`.
2. **Intercept Real Incoming WhatsApp Messages** via Android `NotificationListenerService`.
3. **Sync Real Phone Contacts** into the Assistant database.
4. **Dispatch Approved Replies** to SMS (via `SmsManager`) and WhatsApp (via `RemoteInput`).

---

## Method 1: Build & Install Native Companion APK

### Prerequisites:
- Android device running Android 8.0 (API 26) or newer.
- Android Studio or Android SDK command line tools.

### Step-by-Step Setup:
1. **Open the project in Android Studio**:
   Open the `/android-companion-app` folder.
2. **Build the APK**:
   ```bash
   ./gradlew assembleDebug
   ```
3. **Install on your Android Phone**:
   Connect phone via USB (with USB Debugging enabled):
   ```bash
   adb install app/build/outputs/apk/debug/app-debug.apk
   ```
4. **Grant Runtime Permissions**:
   - Open **AI Assistant Companion** on your phone.
   - Tap **"Request SMS & Contacts Permissions"** and select **Allow**.
   - Tap **"Grant Notification Access"** -> Toggle ON **"WhatsApp Assistant Bridge"** (Required for reading WhatsApp notifications and sending replies without opening the app).
5. **Pair with Assistant Server**:
   - Enter your Assistant URL (e.g. `https://your-cloud-run-url` or `http://192.168.1.xxx:3000` if on local WiFi).
   - Enter the pairing token shown on the Assistant web dashboard.
   - Tap **"Sync Contacts"** to push your address book.

---

## Method 2: Termux Zero-Compile Bridge (No Android Studio Needed!)

If you do not want to compile an APK, you can run the bridge directly on your Android phone using **Termux** (free on F-Droid):

1. Install **Termux** and **Termux:API** from F-Droid on your phone.
2. In Termux, run:
   ```bash
   pkg update && pkg install python termux-api -y
   curl -O https://raw.githubusercontent.com/.../termux_bridge.py
   python termux_bridge.py --server https://your-app-url --key YOUR_PAIRING_KEY
   ```
3. Termux will automatically sync your contacts and stream incoming SMS to your assistant dashboard in real time!

---

## Method 3: Instant vCard (.vcf) Contact Import

You can immediately import all your real contacts into the web dashboard right now:
1. On your Android phone, open the **Contacts** app.
2. Tap **Settings** (or Fix & manage) -> **Export to file** (`contacts.vcf`).
3. Send that `.vcf` file to your computer or phone browser.
4. Click **"Phone Link & Contacts"** in the Assistant dashboard and drop your `contacts.vcf` file!
All your real friends, family, and colleagues will load immediately with their real names and phone numbers.
