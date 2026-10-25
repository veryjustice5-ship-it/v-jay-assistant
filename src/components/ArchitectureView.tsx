import React, { useState } from 'react';
import { 
  Smartphone, 
  ShieldCheck, 
  AlertTriangle, 
  Code2, 
  CheckCircle2, 
  XCircle,
  HelpCircle,
  FileCode,
  Layers
} from 'lucide-react';
import { GeminiSparkle } from './GeminiSparkle';

export const ArchitectureView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'sms' | 'android_code'>('whatsapp');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Title Card */}
      <div className="bg-[#1e1f20] rounded-2xl border border-[#2d2f31] p-5 shadow-xs">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#131314] border border-[#282a2c] flex items-center justify-center font-bold">
            <GeminiSparkle size={20} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#e3e3e3]">
              Android SMS & Personal WhatsApp Integration Feasibility
            </h2>
            <p className="text-xs sm:text-sm text-[#8e918f]">
              Architectural evaluation of permissions, OS boundaries, privacy models, and technical trade-offs.
            </p>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1 p-0.5 bg-[#131314] rounded-full border border-[#282a2c] text-xs mt-4">
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex-1 py-1.5 rounded-full font-medium transition-colors ${
              activeTab === 'whatsapp' ? 'bg-[#282a2c] text-[#e3e3e3]' : 'text-[#8e918f] hover:text-[#e3e3e3]'
            }`}
          >
            Personal WhatsApp Feasibility
          </button>
          <button
            onClick={() => setActiveTab('sms')}
            className={`flex-1 py-1.5 rounded-full font-medium transition-colors ${
              activeTab === 'sms' ? 'bg-[#282a2c] text-[#e3e3e3]' : 'text-[#8e918f] hover:text-[#e3e3e3]'
            }`}
          >
            Android SMS Permissions
          </button>
          <button
            onClick={() => setActiveTab('android_code')}
            className={`flex-1 py-1.5 rounded-full font-medium transition-colors ${
              activeTab === 'android_code' ? 'bg-[#282a2c] text-[#e3e3e3]' : 'text-[#8e918f] hover:text-[#e3e3e3]'
            }`}
          >
            Android Kotlin Specs
          </button>
        </div>
      </div>

      {/* WhatsApp Deep Dive */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6">
          <div className="bg-[#1e1f20] border border-[#34a853]/30 rounded-2xl p-4 text-xs text-[#c4c7c5] space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-[#81c995]">
              <ShieldCheck className="w-4 h-4 text-[#81c995]" />
              <span>Core Principle: Personal WhatsApp Account Retention</span>
            </div>
            <p className="leading-relaxed text-[#8e918f]">
              The official WhatsApp Business Cloud API cannot access chats in your existing consumer WhatsApp app. It requires deleting your account and migrating the number to Meta's servers.
              Therefore, the <strong>Android NotificationListenerService + RemoteInput</strong> architecture is the only supported, non-invasive method for personal accounts.
            </p>
          </div>

          {/* Comparison Matrix */}
          <div className="bg-[#1e1f20] rounded-2xl border border-[#2d2f31] overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#2d2f31] bg-[#18191a]">
              <h3 className="font-bold text-[#e3e3e3] text-sm">
                Evaluation of 4 WhatsApp Integration Approaches
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#18191a] text-[#8e918f] font-semibold border-b border-[#2d2f31]">
                  <tr>
                    <th className="py-2.5 px-3.5">Approach</th>
                    <th className="py-2.5 px-3">Personal App Kept?</th>
                    <th className="py-2.5 px-3">Account Ban Risk</th>
                    <th className="py-2.5 px-3">History Access</th>
                    <th className="py-2.5 px-3.5">Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#282a2c]">
                  <tr className="bg-[#34a853]/5">
                    <td className="py-3 px-3.5 font-bold text-[#e3e3e3]">
                      1. Android NotificationListenerService + RemoteInput
                    </td>
                    <td className="py-3 px-3 text-[#81c995] font-semibold">
                      YES (100% Native)
                    </td>
                    <td className="py-3 px-3 text-[#81c995] font-semibold">
                      Zero (Standard OS API)
                    </td>
                    <td className="py-3 px-3 text-[#8e918f]">
                      Previews only (Notifications)
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#34a853]/20 text-[#81c995] font-mono border border-[#34a853]/30">
                        RECOMMENDED
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-3.5 font-semibold text-[#e3e3e3]">
                      2. Official WhatsApp Business Cloud API
                    </td>
                    <td className="py-3 px-3 text-[#f28b82] font-semibold">
                      NO (Must surrender consumer app)
                    </td>
                    <td className="py-3 px-3 text-[#81c995] font-semibold">
                      Zero (Official)
                    </td>
                    <td className="py-3 px-3 text-[#8e918f]">
                      Full (Server Webhooks)
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#282a2c] text-[#8e918f] font-mono">
                        INCOMPATIBLE
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-3.5 font-semibold text-[#e3e3e3]">
                      3. AccessibilityService Automation
                    </td>
                    <td className="py-3 px-3 text-[#81c995] font-semibold">
                      YES
                    </td>
                    <td className="py-3 px-3 text-[#fdd663] font-semibold">
                      Medium (Play policy violation)
                    </td>
                    <td className="py-3 px-3 text-[#8e918f]">
                      Screenscrapes active screen
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#ea4335]/20 text-[#f28b82] font-mono">
                        HAZARDOUS
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-3.5 font-semibold text-[#e3e3e3]">
                      4. Web Reverse-Engineering (Baileys / Puppeteer)
                    </td>
                    <td className="py-3 px-3 text-[#fdd663] font-semibold">
                      Linked web session
                    </td>
                    <td className="py-3 px-3 text-[#f28b82] font-bold">
                      VERY HIGH (Instant ban)
                    </td>
                    <td className="py-3 px-3 text-[#8e918f]">
                      Full Web Client sync
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#ea4335] text-white font-mono">
                        DISQUALIFIED
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-[#1e1f20] rounded-2xl border border-[#2d2f31] p-4 shadow-xs space-y-2">
              <h4 className="font-bold text-[#81c995] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>What NotificationListener CAN Do:</span>
              </h4>
              <ul className="space-y-1.5 text-[#8e918f]">
                <li>• Intercept real-time incoming notification events from <code>com.whatsapp</code></li>
                <li>• Extract sender name and preview text</li>
                <li>• Dispatch replies using native <code>RemoteInput</code> without opening WhatsApp UI</li>
                <li>• Operates on-device with zero account compromise risk</li>
              </ul>
            </div>

            <div className="bg-[#1e1f20] rounded-2xl border border-[#2d2f31] p-4 shadow-xs space-y-2">
              <h4 className="font-bold text-[#fdd663] flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Known Technical Boundaries:</span>
              </h4>
              <ul className="space-y-1.5 text-[#8e918f]">
                <li>• <strong>No past history:</strong> WhatsApp's SQLite is hardware-encrypted.</li>
                <li>• <strong>Muted chats:</strong> No banner is posted if chat is muted or in foreground.</li>
                <li>• <strong>No media payload:</strong> Audio or photos require extra file permissions.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SMS Deep Dive */}
      {activeTab === 'sms' && (
        <div className="space-y-4 text-xs">
          <div className="bg-[#1e1f20] rounded-2xl border border-[#2d2f31] p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-[#e3e3e3] text-sm">
              Android SMS Architecture & Default Handler Role
            </h3>
            <p className="text-[#8e918f] leading-relaxed">
              Android protects the SMS database to prevent toll fraud. A remote server cannot read SMS directly without an Android Companion app installed on the device.
            </p>

            <div className="space-y-1.5 pt-2">
              <h4 className="font-bold text-[#e3e3e3]">Required Permissions:</h4>
              <div className="p-3 bg-[#131314] rounded-xl font-mono text-[11px] text-[#a8c7fa] border border-[#282a2c] space-y-1">
                <div>&lt;uses-permission android:name="android.permission.RECEIVE_SMS" /&gt;</div>
                <div>&lt;uses-permission android:name="android.permission.READ_SMS" /&gt;</div>
                <div>&lt;uses-permission android:name="android.permission.SEND_SMS" /&gt;</div>
              </div>
            </div>

            <div className="p-3.5 bg-[#fbbc04]/10 border border-[#fbbc04]/30 rounded-xl text-[#fdd663] space-y-1">
              <span className="font-bold block">Default SMS App Requirement (Android 10+):</span>
              <p className="leading-relaxed opacity-90">
                To write to the telephony provider or send in background without prompts, holding the <code>RoleManager.ROLE_SMS</code> role or granting explicit runtime <code>SEND_SMS</code> is required.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Android Companion Code Specs */}
      {activeTab === 'android_code' && (
        <div className="space-y-4 text-xs">
          <div className="bg-[#1e1f20] rounded-2xl border border-[#2d2f31] p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-[#e3e3e3] text-sm">
              Production-Ready Kotlin Specification for Companion App
            </h3>
            <div className="rounded-xl bg-[#131314] text-[#c4c7c5] p-4 font-mono text-[11px] overflow-x-auto space-y-2 border border-[#282a2c]">
              <div className="text-[#8e918f]">// WhatsAppNotificationListener.kt</div>
              <div className="text-[#a8c7fa]">class WhatsAppNotificationListener : NotificationListenerService() &#123;</div>
              <div className="pl-4">override fun onNotificationPosted(sbn: StatusBarNotification?) &#123;</div>
              <div className="pl-8">if (sbn == null || sbn.packageName != "com.whatsapp") return</div>
              <div className="pl-8 text-[#8e918f]">// 1. Extract notification text</div>
              <div className="pl-8">val extras = sbn.notification.extras</div>
              <div className="pl-8">val title = extras.getString(Notification.EXTRA_TITLE) ?: return</div>
              <div className="pl-8">val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: return</div>
              <div className="pl-8 text-[#8e918f]">// 2. Locate wearable / quick-reply action with RemoteInput</div>
              <div className="pl-8">val wearAction = findQuickReplyAction(sbn.notification)</div>
              <div className="pl-8 text-[#8e918f]">// 3. Forward to Assistant Engine</div>
              <div className="pl-8">AssistantBridge.dispatchIncoming(channel = "whatsapp", sender = title, body = text)</div>
              <div className="pl-4">&#125;</div>
              <div className="text-[#a8c7fa]">&#125;</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
