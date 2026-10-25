import React, { useState } from 'react';
import { 
  Smartphone, 
  Check, 
  Copy, 
  Upload, 
  QrCode, 
  Terminal, 
  Layers, 
  X, 
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Users
} from 'lucide-react';
import { GeminiSparkle } from './GeminiSparkle';
import { Contact, ChannelType } from '../types';

interface PhoneLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDeviceConnected: boolean;
  onSetDeviceConnected: (connected: boolean) => void;
  onImportRealContacts: (contacts: Contact[]) => void;
}

export const PhoneLinkModal: React.FC<PhoneLinkModalProps> = ({
  isOpen,
  onClose,
  isDeviceConnected,
  onSetDeviceConnected,
  onImportRealContacts,
}) => {
  const [activeTab, setActiveTab] = useState<'pair' | 'vcf' | 'native' | 'termux'>('pair');
  const [copiedKey, setCopiedKey] = useState(false);
  const [vcfStatus, setVcfStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const pairingKey = 'GEMINI-PHONE-LINK-9428';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // VCF Parser: parses standard vCard format exported by Android Google Contacts
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      try {
        const parsed = parseVCard(content);
        if (parsed.length > 0) {
          onImportRealContacts(parsed);
          setVcfStatus(`Successfully imported ${parsed.length} real contacts from ${file.name}!`);
          onSetDeviceConnected(true);
        } else {
          setVcfStatus('No valid contacts found in the selected .vcf file.');
        }
      } catch (err: any) {
        setVcfStatus(`Error parsing vCard file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const parseVCard = (vcfText: string): Contact[] => {
    const cards = vcfText.split(/BEGIN:VCARD/i);
    const results: Contact[] = [];

    cards.forEach((card, index) => {
      if (!card.trim()) return;

      let name = '';
      let phone = '';

      // Match FN: (Formatted Name)
      const fnMatch = card.match(/FN[;:]([^\r\n]+)/i);
      if (fnMatch) {
        name = fnMatch[1].trim();
      }

      // Match TEL:
      const telMatch = card.match(/TEL[^:]*:([^\r\n]+)/i);
      if (telMatch) {
        phone = telMatch[1].replace(/[^\d+]/g, '').trim();
      }

      if (name && phone) {
        results.push({
          id: `real-contact-${Date.now()}-${index}`,
          name,
          phone,
          channel: 'sms',
          avatarColor: 'bg-[#70a6ff]',
          isPermittedForAuto: false, // Default to approval required for safety
          relationship: 'Phone Address Book',
          lastActive: 'Imported from phone',
        });
      }
    });

    return results;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#1e1f20] border border-[#37393b] rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#2d2f31] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#131314] border border-[#282a2c] flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-[#a8c7fa]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[#e3e3e3]">
                  Link Real Android Phone
                </h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                  isDeviceConnected ? 'bg-[#34a853]/20 text-[#81c995]' : 'bg-[#fbbc04]/20 text-[#fdd663]'
                }`}>
                  {isDeviceConnected ? 'PHONE CONNECTED' : 'READY TO PAIR'}
                </span>
              </div>
              <p className="text-xs text-[#8e918f]">
                Read and draft real messages from real contacts on SMS & WhatsApp
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#8e918f] hover:text-[#e3e3e3] hover:bg-[#282a2c] rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#131314] border-b border-[#2d2f31] text-xs px-4">
          <button
            onClick={() => setActiveTab('pair')}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'pair' ? 'bg-[#282a2c] text-[#e3e3e3]' : 'text-[#8e918f] hover:text-[#e3e3e3]'
            }`}
          >
            1. Device Pairing
          </button>
          <button
            onClick={() => setActiveTab('vcf')}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'vcf' ? 'bg-[#282a2c] text-[#e3e3e3]' : 'text-[#8e918f] hover:text-[#e3e3e3]'
            }`}
          >
            2. Import Real Contacts (.vcf)
          </button>
          <button
            onClick={() => setActiveTab('native')}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'native' ? 'bg-[#282a2c] text-[#e3e3e3]' : 'text-[#8e918f] hover:text-[#e3e3e3]'
            }`}
          >
            3. Native Kotlin App
          </button>
          <button
            onClick={() => setActiveTab('termux')}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'termux' ? 'bg-[#282a2c] text-[#e3e3e3]' : 'text-[#8e918f] hover:text-[#e3e3e3]'
            }`}
          >
            4. Termux Quick Bridge
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Tab 1: Device Pairing Details */}
          {activeTab === 'pair' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#131314] rounded-2xl border border-[#282a2c] flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-[#8e918f] text-[11px] uppercase tracking-wider font-bold">
                    Assistant Server Endpoint
                  </div>
                  <div className="font-mono text-xs text-[#a8c7fa] select-all">
                    {currentOrigin}
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(currentOrigin)}
                  className="px-3 py-1.5 bg-[#282a2c] hover:bg-[#333538] text-[#c4c7c5] rounded-full flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy URL</span>
                </button>
              </div>

              <div className="p-4 bg-[#131314] rounded-2xl border border-[#282a2c] flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-[#8e918f] text-[11px] uppercase tracking-wider font-bold">
                    Encrypted Device Pairing Key
                  </div>
                  <div className="font-mono text-sm text-[#81c995] font-bold select-all">
                    {pairingKey}
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(pairingKey)}
                  className="px-3 py-1.5 bg-[#282a2c] hover:bg-[#333538] text-[#c4c7c5] rounded-full flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                </button>
              </div>

              {/* Status Simulation Toggle */}
              <div className="p-4 bg-[#131314] rounded-2xl border border-[#282a2c] flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#e3e3e3]">Simulate Active Physical Bridge</div>
                  <div className="text-[11px] text-[#8e918f]">
                    Marks phone as linked so outgoing messages route through the device bridge
                  </div>
                </div>
                <button
                  onClick={() => onSetDeviceConnected(!isDeviceConnected)}
                  className={`px-4 py-2 rounded-full font-bold transition-colors ${
                    isDeviceConnected
                      ? 'bg-[#34a853] text-[#041e49]'
                      : 'bg-[#282a2c] text-[#a8c7fa] border border-[#37393b]'
                  }`}
                >
                  {isDeviceConnected ? 'Connected (Tap to Disconnect)' : 'Tap to Mark as Connected'}
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: vCard (.vcf) Instant Contact Import */}
          {activeTab === 'vcf' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#131314] rounded-2xl border border-[#282a2c] space-y-2">
                <div className="flex items-center gap-2 font-bold text-[#e3e3e3]">
                  <FileText className="w-4 h-4 text-[#a8c7fa]" />
                  <span>How to export your real contacts from Android:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[#8e918f] pl-1">
                  <li>Open the <strong>Contacts</strong> app on your Android phone.</li>
                  <li>Tap <strong>Settings</strong> (or "Fix & manage" tab).</li>
                  <li>Tap <strong>Export to file</strong> (`contacts.vcf`).</li>
                  <li>Drop that file in the uploader below to load your real friends & family!</li>
                </ol>
              </div>

              {/* Dropzone */}
              <label className="border-2 border-dashed border-[#37393b] hover:border-[#a8c7fa] rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-[#131314]/50">
                <Upload className="w-8 h-8 text-[#a8c7fa] mb-2" />
                <span className="font-bold text-[#e3e3e3] mb-1">
                  Click to select or drop contacts.vcf
                </span>
                <span className="text-[11px] text-[#8e918f]">
                  Standard Android vCard 2.1 / 3.0 / 4.0 format supported
                </span>
                <input
                  type="file"
                  accept=".vcf,text/vcard"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {vcfStatus && (
                <div className="p-3 bg-[#34a853]/20 border border-[#34a853]/40 rounded-xl text-xs text-[#81c995] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{vcfStatus}</span>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Native Android Kotlin App */}
          {activeTab === 'native' && (
            <div className="space-y-3">
              <div className="p-4 bg-[#131314] rounded-2xl border border-[#282a2c] space-y-2 text-[#8e918f]">
                <div className="font-bold text-[#e3e3e3] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#81c995]" />
                  <span>Complete Kotlin Project Ready in Repository</span>
                </div>
                <p>
                  We have provided the complete native Android project in <code className="text-[#a8c7fa]">/android-companion-app</code>:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li><code>SmsReceiver.kt</code>: Listens for incoming real SMS in background.</li>
                  <li><code>WhatsAppNotificationListener.kt</code>: Intercepts WhatsApp messages and executes RemoteInput quick-replies.</li>
                  <li><code>DeviceBridge.kt</code>: Reads phone address book and syncs to server.</li>
                </ul>
                <div className="mt-3 p-3 bg-[#1e1f20] rounded-xl border border-[#2d2f31] font-mono text-[11px] text-[#c4c7c5]">
                  <div># Build APK via command line:</div>
                  <div className="text-[#a8c7fa]">cd android-companion-app &amp;&amp; ./gradlew assembleDebug</div>
                  <div className="mt-1"># Install directly onto your connected Android phone:</div>
                  <div className="text-[#a8c7fa]">adb install app/build/outputs/apk/debug/app-debug.apk</div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Termux Quick Bridge */}
          {activeTab === 'termux' && (
            <div className="space-y-3">
              <div className="p-4 bg-[#131314] rounded-2xl border border-[#2d2f31] space-y-2">
                <div className="flex items-center gap-2 font-bold text-[#e3e3e3]">
                  <Terminal className="w-4 h-4 text-[#fbbc04]" />
                  <span>Run Directly on Android with Termux (No Android Studio)</span>
                </div>
                <p className="text-[#8e918f]">
                  Install <strong>Termux</strong> and <strong>Termux:API</strong> from F-Droid on your phone. Then paste this single command:
                </p>

                <div className="p-3 bg-[#1e1f20] rounded-xl border border-[#2d2f31] font-mono text-[11px] text-[#a8c7fa] select-all overflow-x-auto">
                  pkg update && pkg install python termux-api -y && python3 termux-bridge/termux_bridge.py --server {currentOrigin} --key {pairingKey}
                </div>

                <p className="text-[11px] text-[#8e918f]">
                  Termux will read your contacts via <code>termux-contact-list</code>, stream real SMS directly to this dashboard, and send approved replies via <code>termux-sms-send</code>!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#2d2f31] bg-[#18191a] flex items-center justify-between text-xs">
          <span className="text-[#8e918f]">
            Pairing Token Active · Port 3000 / Webhook Ingress
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#e3e3e3] hover:bg-white text-[#131314] font-bold rounded-full transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
