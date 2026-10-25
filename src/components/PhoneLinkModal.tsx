import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Check, 
  Copy, 
  Upload, 
  Terminal, 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  FileText, 
  RefreshCw, 
  KeyRound,
  Radio,
  Lock,
  Layers,
  Send
} from 'lucide-react';
import { Contact, DeviceRegistration, PairingSession } from '../types';

interface PhoneLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectedDevice: DeviceRegistration | null;
  onRefreshState: () => void;
}

export const PhoneLinkModal: React.FC<PhoneLinkModalProps> = ({
  isOpen,
  onClose,
  connectedDevice,
  onRefreshState,
}) => {
  const [activeTab, setActiveTab] = useState<'pair' | 'vcf' | 'native' | 'termux'>('pair');
  const [pairingData, setPairingData] = useState<PairingSession | null>(null);
  const [isLoadingPairing, setIsLoadingPairing] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [vcfStatus, setVcfStatus] = useState<string | null>(null);
  const [isSimulatingPair, setIsSimulatingPair] = useState<boolean>(false);
  const [pairingError, setPairingError] = useState<string | null>(null);

  const serverOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  useEffect(() => {
    if (isOpen) {
      requestNewPairing();
    }
  }, [isOpen]);

  const requestNewPairing = async () => {
    setIsLoadingPairing(true);
    setPairingError(null);
    try {
      const res = await fetch('/api/device/pair-request', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setPairingData({
          pin: data.pin,
          token: data.token,
          expiresAt: data.expiresAt,
          qrPayload: data.qrPayload,
        });
      } else {
        setPairingError('Failed to generate pairing session');
      }
    } catch (err: any) {
      setPairingError(err.message || 'Error connecting to backend');
    } finally {
      setIsLoadingPairing(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSimulateDevicePair = async () => {
    if (!pairingData) return;
    setIsSimulatingPair(true);
    setPairingError(null);
    try {
      const res = await fetch('/api/device/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: pairingData.pin,
          deviceName: 'Pixel 8 Pro (Companion App)',
          platform: 'android',
        }),
      });
      const data = await res.json();
      if (data.success) {
        onRefreshState();
      } else {
        setPairingError(data.error || 'Pairing rejected');
      }
    } catch (err: any) {
      setPairingError(err.message);
    } finally {
      setIsSimulatingPair(false);
    }
  };

  const handleDisconnectDevice = async () => {
    try {
      await fetch('/api/device/disconnect', { method: 'POST' });
      onRefreshState();
      requestNewPairing();
    } catch (err) {
      console.error(err);
    }
  };

  // VCF Parser uploaded to backend
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      try {
        const res = await fetch('/api/contacts/vcf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vcfText: content }),
        });
        const data = await res.json();
        if (data.success) {
          setVcfStatus(`Successfully imported ${data.count} contacts to backend!`);
          onRefreshState();
        } else {
          setVcfStatus(`Import failed: ${data.error}`);
        }
      } catch (err: any) {
        setVcfStatus(`Error importing vCard: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
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
                  Android Phone Link &amp; Device Bridge
                </h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                  connectedDevice 
                    ? 'bg-[#34a853]/20 text-[#81c995] border border-[#34a853]/40' 
                    : 'bg-[#fbbc04]/20 text-[#fdd663] border border-[#fbbc04]/40'
                }`}>
                  <Radio className={`w-2.5 h-2.5 ${connectedDevice ? 'animate-pulse text-[#81c995]' : ''}`} />
                  {connectedDevice ? 'PHONE CONNECTED' : 'AWAITING PAIRING'}
                </span>
              </div>
              <p className="text-xs text-[#8e918f]">
                Authenticated hardware bridge for real SMS and WhatsApp RemoteInput
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
            1. Authenticated Pairing
          </button>
          <button
            onClick={() => setActiveTab('vcf')}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'vcf' ? 'bg-[#282a2c] text-[#e3e3e3]' : 'text-[#8e918f] hover:text-[#e3e3e3]'
            }`}
          >
            2. Sync Contacts (.vcf)
          </button>
          <button
            onClick={() => setActiveTab('native')}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'native' ? 'bg-[#282a2c] text-[#e3e3e3]' : 'text-[#8e918f] hover:text-[#e3e3e3]'
            }`}
          >
            3. Android Companion App
          </button>
          <button
            onClick={() => setActiveTab('termux')}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'termux' ? 'bg-[#282a2c] text-[#e3e3e3]' : 'text-[#8e918f] hover:text-[#e3e3e3]'
            }`}
          >
            4. Real-Device Bridge (CLI)
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Tab 1: Authenticated Pairing */}
          {activeTab === 'pair' && (
            <div className="space-y-4">
              {connectedDevice ? (
                /* Connected State View */
                <div className="p-4 bg-[#131314] rounded-2xl border border-[#34a853]/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-[#81c995]" />
                      <span className="font-bold text-sm text-[#81c995]">
                        Device Authenticated &amp; Active
                      </span>
                    </div>
                    <button
                      onClick={handleDisconnectDevice}
                      className="px-3 py-1 bg-[#ea4335]/20 hover:bg-[#ea4335]/30 text-[#f28b82] border border-[#ea4335]/40 rounded-full font-semibold transition-colors"
                    >
                      Disconnect Device
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#8e918f] pt-1">
                    <div>
                      <span className="text-[#c4c7c5] font-semibold">Device Name: </span>
                      {connectedDevice.name}
                    </div>
                    <div>
                      <span className="text-[#c4c7c5] font-semibold">Platform: </span>
                      {connectedDevice.platform.toUpperCase()}
                    </div>
                    <div>
                      <span className="text-[#c4c7c5] font-semibold">Paired Since: </span>
                      {new Date(connectedDevice.pairedAt).toLocaleTimeString()}
                    </div>
                    <div>
                      <span className="text-[#c4c7c5] font-semibold">Last Heartbeat: </span>
                      {new Date(connectedDevice.lastSeen).toLocaleTimeString()}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#282a2c] text-[11px] text-[#8e918f]">
                    <span className="font-bold text-[#c4c7c5]">Active Capabilities: </span>
                    SMS Read/Send, WhatsApp RemoteInput Quick-Replies, Contact Address Book Sync.
                  </div>
                </div>
              ) : (
                /* Pairing Challenge View */
                <div className="space-y-4">
                  <div className="p-4 bg-[#131314] rounded-2xl border border-[#282a2c] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-[#e3e3e3]">
                        <KeyRound className="w-4 h-4 text-[#a8c7fa]" />
                        <span>Dynamic Cryptographic Pairing Code</span>
                      </div>
                      <button
                        onClick={requestNewPairing}
                        disabled={isLoadingPairing}
                        className="text-[#8e918f] hover:text-[#e3e3e3] flex items-center gap-1 font-mono text-[11px]"
                      >
                        <RefreshCw className={`w-3 h-3 ${isLoadingPairing ? 'animate-spin' : ''}`} />
                        <span>Regenerate PIN</span>
                      </button>
                    </div>

                    <p className="text-[#8e918f]">
                      Enter this 6-digit one-time PIN in the Android Companion app or CLI bridge. Static public secrets have been removed for end-to-end security.
                    </p>

                    {pairingData ? (
                      <div className="pt-2 flex flex-col sm:flex-row items-center gap-4 justify-between bg-[#1e1f20] p-4 rounded-xl border border-[#2d2f31]">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-[#8e918f] tracking-wider mb-0.5">
                            One-Time PIN (Expires in 15 mins)
                          </div>
                          <div className="text-3xl font-mono font-bold tracking-widest text-[#a8c7fa]">
                            {pairingData.pin}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyToClipboard(pairingData.pin, 'pin')}
                            className="px-3.5 py-1.5 bg-[#282a2c] hover:bg-[#333538] text-[#e3e3e3] rounded-full flex items-center gap-1 font-medium transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5 text-[#a8c7fa]" />
                            <span>{copiedKey === 'pin' ? 'Copied' : 'Copy PIN'}</span>
                          </button>

                          <button
                            onClick={handleSimulateDevicePair}
                            disabled={isSimulatingPair}
                            className="px-4 py-1.5 bg-[#a8c7fa] hover:bg-[#8ab4f8] text-[#041e49] font-bold rounded-full transition-colors flex items-center gap-1.5 shadow-xs"
                          >
                            <Radio className="w-3.5 h-3.5" />
                            <span>{isSimulatingPair ? 'Connecting...' : 'Connect Simulated Device'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-[#8e918f]">Generating pairing token...</div>
                    )}

                    {pairingError && (
                      <div className="text-xs text-[#f28b82] font-mono pt-1">
                        Error: {pairingError}
                      </div>
                    )}
                  </div>

                  {/* Server Endpoint URL */}
                  <div className="p-3.5 bg-[#131314] rounded-2xl border border-[#282a2c] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-[#8e918f]">Server Endpoint</div>
                      <div className="font-mono text-xs text-[#c4c7c5]">{serverOrigin}</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(serverOrigin, 'url')}
                      className="px-3 py-1 bg-[#282a2c] hover:bg-[#333538] text-[#c4c7c5] rounded-full flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3 text-[#a8c7fa]" />
                      <span>{copiedKey === 'url' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: vCard (.vcf) Instant Contact Import */}
          {activeTab === 'vcf' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#131314] rounded-2xl border border-[#282a2c] space-y-2">
                <div className="flex items-center gap-2 font-bold text-[#e3e3e3]">
                  <FileText className="w-4 h-4 text-[#a8c7fa]" />
                  <span>How to export your contacts from Android:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[#8e918f] pl-1">
                  <li>Open the <strong>Contacts</strong> app on your Android device.</li>
                  <li>Tap <strong>Settings / Fix &amp; Manage</strong> &rarr; <strong>Export to file (.vcf)</strong>.</li>
                  <li>Select or drop the file below. Contacts are parsed securely on the server with default manual approval.</li>
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
                  <span>Android Companion Architecture (`/android-companion-app`)</span>
                </div>
                <p>
                  The companion app bridges Android system broadcasts to your assistant server:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li><code>SmsReceiver.kt</code>: Listens for incoming SMS via <code>android.provider.Telephony.SMS_RECEIVED</code> and posts to <code>/api/device/message-ingress</code>.</li>
                  <li><code>WhatsAppNotificationListener.kt</code>: Intercepts WhatsApp notification events and executes Wearable <code>RemoteInput</code> quick-replies.</li>
                  <li><code>DeviceBridge.kt</code>: Periodically polls <code>/api/device/pending-dispatches</code> and fires <code>/api/device/confirm-dispatch</code> after dispatch.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Tab 4: Termux Real-Device Bridge */}
          {activeTab === 'termux' && (
            <div className="space-y-3">
              <div className="p-4 bg-[#131314] rounded-2xl border border-[#2d2f31] space-y-2">
                <div className="flex items-center gap-2 font-bold text-[#e3e3e3]">
                  <Terminal className="w-4 h-4 text-[#fbbc04]" />
                  <span>Run Directly on Android with Termux</span>
                </div>
                <p className="text-[#8e918f]">
                  Open <strong>Termux</strong> on your phone. Pair with your assistant in one command:
                </p>

                <div className="p-3 bg-[#131314] rounded-xl border border-[#282a2c] font-mono text-[11px] text-[#a8c7fa] select-all overflow-x-auto space-y-1">
                  <div># 1. Pair your device:</div>
                  <div className="text-[#81c995]">
                    curl -X POST "{serverOrigin}/api/device/pair" -H "Content-Type: application/json" -d '{`{"pin": "${pairingData?.pin || '123456'}", "deviceName": "My Android Phone"}`}'
                  </div>
                  <div className="mt-2 text-[#8e918f]"># 2. Receive dispatch notifications &amp; report confirmations:</div>
                  <div className="text-[#c4c7c5]">
                    curl -s "{serverOrigin}/api/device/pending-dispatches" -H "Authorization: Bearer &lt;YOUR_TOKEN&gt;"
                  </div>
                </div>

                <p className="text-[11px] text-[#8e918f]">
                  Approved SMS will be dispatched via <code>termux-sms-send</code>, and success is acknowledged back to <code>/api/device/confirm-dispatch</code>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#2d2f31] bg-[#18191a] flex items-center justify-between text-xs">
          <span className="text-[#8e918f]">
            {connectedDevice ? `Linked: ${connectedDevice.name}` : 'Encrypted Token Challenge Active'}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#e3e3e3] hover:bg-white text-[#131314] font-bold rounded-full transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
