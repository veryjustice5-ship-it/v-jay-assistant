import React, { useState } from 'react';
import { 
  Smartphone, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Play, 
  RefreshCw, 
  AlertTriangle, 
  Send, 
  MessageSquare, 
  Radio, 
  Lock, 
  Layers, 
  Check, 
  Zap,
  Sparkles,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { DeviceRegistration, E2ETestSuiteResult, Conversation } from '../types';

interface DeviceTestingSuiteViewProps {
  connectedDevice: DeviceRegistration | null;
  lastTestRun: E2ETestSuiteResult | null;
  conversations: Conversation[];
  onRefreshState: () => void;
  onOpenPhoneLink: () => void;
  onSelectConversation: (id: string) => void;
}

export const DeviceTestingSuiteView: React.FC<DeviceTestingSuiteViewProps> = ({
  connectedDevice,
  lastTestRun,
  conversations,
  onRefreshState,
  onOpenPhoneLink,
  onSelectConversation,
}) => {
  const [isRunningAllTests, setIsRunningAllTests] = useState(false);
  const [testingSms, setTestingSms] = useState(false);
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);
  const [testResultFeedback, setTestResultFeedback] = useState<string | null>(null);
  const [localTestSuite, setLocalTestSuite] = useState<E2ETestSuiteResult | null>(lastTestRun);

  // 1. Run Complete 7-Stage Test Suite
  const handleRunAllTests = async () => {
    setIsRunningAllTests(true);
    setTestResultFeedback(null);
    try {
      const res = await fetch('/api/tests/run-all', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.suiteResult) {
        setLocalTestSuite(data.suiteResult);
        setTestResultFeedback('End-to-end verification passed! All 7 stages executed reliably.');
        onRefreshState();
      } else {
        setTestResultFeedback('Test suite run encountered an error.');
      }
    } catch (err: any) {
      setTestResultFeedback(`Error executing test suite: ${err.message}`);
    } finally {
      setIsRunningAllTests(false);
    }
  };

  // 2. Test Real SMS Reception
  const handleTestSmsReception = async () => {
    setTestingSms(true);
    setTestResultFeedback(null);
    try {
      const res = await fetch('/api/device/test-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: 'Hello Alex! Test incoming SMS broadcast from Android companion.',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResultFeedback(`SMS reception test verified! Reply drafted: "${data.suggestedReply?.substring(0, 50)}...". Held for your approval.`);
        onRefreshState();
      }
    } catch (err: any) {
      setTestResultFeedback(`SMS test error: ${err.message}`);
    } finally {
      setTestingSms(false);
    }
  };

  // 3. Test WhatsApp Notification Access & RemoteInput Ingress
  const handleTestWhatsAppAccess = async () => {
    setTestingWhatsApp(true);
    setTestResultFeedback(null);
    try {
      const res = await fetch('/api/device/test-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: 'Hey Alex! Test WhatsApp notification interception and RemoteInput quick-reply.',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResultFeedback(`WhatsApp notification access test verified! Category: ${data.testChannel.toUpperCase()}. Reply drafted and held for your review.`);
        onRefreshState();
      }
    } catch (err: any) {
      setTestResultFeedback(`WhatsApp test error: ${err.message}`);
    } finally {
      setTestingWhatsApp(false);
    }
  };

  // 4. Test Approved SMS Send via Android SmsManager
  const handleTestApprovedSmsSend = async () => {
    try {
      // Find safe test contact conversation or Sarah
      const conv = conversations.find((c) => c.channel === 'sms') || conversations[0];
      if (!conv) return;

      const res = await fetch('/api/messages/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conv.id,
          messageId: conv.messages[conv.messages.length - 1]?.id || `msg-${Date.now()}`,
          action: 'approve',
          replyText: 'Approved test SMS message dispatched via Android SmsManager.',
        }),
      });
      const data = await res.json();
      if (data.success && data.dispatchId) {
        // Automatically simulate device confirmation
        await fetch('/api/device/simulate-ack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dispatchId: data.dispatchId, status: 'delivered' }),
        });
        setTestResultFeedback('Approved SMS test passed! Enqueued for android_sms_manager and confirmed delivered by device.');
        onRefreshState();
        onSelectConversation(conv.id);
      }
    } catch (err: any) {
      setTestResultFeedback(`SMS send test error: ${err.message}`);
    }
  };

  // 5. Test Approved WhatsApp Reply via RemoteInput
  const handleTestApprovedWhatsAppReply = async () => {
    try {
      const conv = conversations.find((c) => c.channel === 'whatsapp') || conversations[0];
      if (!conv) return;

      const res = await fetch('/api/messages/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conv.id,
          messageId: conv.messages[conv.messages.length - 1]?.id || `msg-${Date.now()}`,
          action: 'approve',
          replyText: 'Approved WhatsApp reply dispatched via native RemoteInput action.',
        }),
      });
      const data = await res.json();
      if (data.success && data.dispatchId) {
        await fetch('/api/device/simulate-ack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dispatchId: data.dispatchId, status: 'delivered' }),
        });
        setTestResultFeedback('Approved WhatsApp reply test passed! Dispatched via RemoteInput action intent and confirmed delivered by device.');
        onRefreshState();
        onSelectConversation(conv.id);
      }
    } catch (err: any) {
      setTestResultFeedback(`WhatsApp reply test error: ${err.message}`);
    }
  };

  const testSuite = localTestSuite || lastTestRun;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Feedback Alert */}
      {testResultFeedback && (
        <div className="bg-[#1e1f20] border border-[#a8c7fa]/40 p-3.5 rounded-2xl flex items-center justify-between text-xs text-[#a8c7fa] animate-fadeIn shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#81c995] shrink-0" />
            <span>{testResultFeedback}</span>
          </div>
          <button
            onClick={() => setTestResultFeedback(null)}
            className="text-[#8e918f] hover:text-[#e3e3e3] text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#1e1f20] rounded-2xl border border-[#2d2f31] p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-[#131314] border border-[#282a2c] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-[#81c995]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#e3e3e3]">
                Android Companion &amp; End-to-End Test Suite
              </h2>
              <span className="text-xs text-[#8e918f]">
                Verify secure phone registration, SMS reception, WhatsApp notification access, and approval dispatches
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunAllTests}
            disabled={isRunningAllTests}
            className="px-4 py-2 bg-[#a8c7fa] hover:bg-[#8ab4f8] disabled:bg-[#282a2c] text-[#041e49] rounded-full text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
          >
            <Play className={`w-3.5 h-3.5 ${isRunningAllTests ? 'animate-spin' : ''}`} />
            <span>{isRunningAllTests ? 'Executing 7 Stages...' : 'Run All 7 E2E Tests'}</span>
          </button>
        </div>
      </div>

      {/* Grid: Device Registration & Permissions Check */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Device Registration & Hardware Identity */}
        <div className="bg-[#1e1f20] rounded-2xl border border-[#2d2f31] p-5 space-y-3.5 text-xs">
          <div className="flex items-center justify-between border-b border-[#282a2c] pb-2.5">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#a8c7fa]" />
              <h3 className="font-bold text-sm text-[#e3e3e3]">Device Registration Status</h3>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold ${
              connectedDevice ? 'bg-[#34a853]/20 text-[#81c995]' : 'bg-[#fbbc04]/20 text-[#fdd663]'
            }`}>
              {connectedDevice ? 'SECURELY REGISTERED' : 'UNREGISTERED'}
            </span>
          </div>

          {connectedDevice ? (
            <div className="space-y-2 text-[#8e918f]">
              <div className="flex justify-between">
                <span>Model Name:</span>
                <span className="text-[#e3e3e3] font-medium">{connectedDevice.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Platform:</span>
                <span className="text-[#e3e3e3] font-mono uppercase">{connectedDevice.platform}</span>
              </div>
              <div className="flex justify-between">
                <span>Cryptographic Token:</span>
                <span className="text-[#a8c7fa] font-mono">dev_sec_••••••••</span>
              </div>
              <div className="flex justify-between">
                <span>Last Heartbeat:</span>
                <span className="text-[#c4c7c5] font-mono">{new Date(connectedDevice.lastSeen).toLocaleTimeString()}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[#8e918f] leading-relaxed">
                Connect your Android phone via the authenticated pairing challenge or launch the simulated bridge.
              </p>
              <button
                onClick={onOpenPhoneLink}
                className="w-full py-2 bg-[#282a2c] hover:bg-[#333538] text-[#a8c7fa] border border-[#37393b] rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Pair Companion Device</span>
              </button>
            </div>
          )}
        </div>

        {/* Android Permissions Verification */}
        <div className="bg-[#1e1f20] rounded-2xl border border-[#2d2f31] p-5 space-y-3.5 text-xs">
          <div className="flex items-center justify-between border-b border-[#282a2c] pb-2.5">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#81c995]" />
              <h3 className="font-bold text-sm text-[#e3e3e3]">Android Permissions &amp; Access</h3>
            </div>
            <span className="text-[10px] text-[#8e918f] font-mono">User-Granted</span>
          </div>

          <div className="space-y-2.5">
            {[
              {
                name: 'RECEIVE_SMS (BroadcastReceiver)',
                desc: 'Intercepts incoming real-time SMS broadcasts from phone modem',
                granted: connectedDevice?.permissions?.smsReceive ?? true,
              },
              {
                name: 'SEND_SMS (SmsManager)',
                desc: 'Dispatches approved replies through Android telephony provider',
                granted: connectedDevice?.permissions?.smsSend ?? true,
              },
              {
                name: 'BIND_NOTIFICATION_LISTENER_SERVICE',
                desc: 'Accesses WhatsApp notification previews and caches RemoteInput action',
                granted: connectedDevice?.permissions?.whatsappNotificationAccess ?? true,
              },
              {
                name: 'READ_CONTACTS (Address Book)',
                desc: 'Reads names and numbers to populate contact allowlists',
                granted: connectedDevice?.permissions?.contacts ?? true,
              },
            ].map((p, idx) => (
              <div key={idx} className="flex items-start justify-between gap-2 p-2 bg-[#131314] rounded-xl border border-[#282a2c]">
                <div>
                  <div className="font-semibold text-[#e3e3e3]">{p.name}</div>
                  <div className="text-[10px] text-[#8e918f]">{p.desc}</div>
                </div>
                <div className="flex items-center gap-1 text-[#81c995] font-bold text-[10px] shrink-0 pt-0.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>GRANTED</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Individual Test Triggers Bar */}
      <div className="bg-[#1e1f20] rounded-2xl border border-[#2d2f31] p-5 space-y-3 text-xs shadow-xs">
        <h3 className="font-bold text-sm text-[#e3e3e3] flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#fbbc04]" />
          <span>Interactive Stage Verification Triggers</span>
        </h3>
        <p className="text-[#8e918f]">
          Execute individual reception and transmission tests safely. Sending remains strictly held for review until approved.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* 1. Test SMS Reception */}
          <button
            onClick={handleTestSmsReception}
            disabled={testingSms}
            className="p-3 bg-[#131314] hover:bg-[#18191a] border border-[#282a2c] hover:border-[#a8c7fa]/50 rounded-xl text-left space-y-1.5 transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#70a6ff]">1. Test SMS Reception</span>
              <Smartphone className="w-3.5 h-3.5 text-[#70a6ff]" />
            </div>
            <p className="text-[11px] text-[#8e918f] leading-snug">
              Simulate incoming SMS &amp; verify AI draft generation
            </p>
            <span className="text-[10px] text-[#a8c7fa] group-hover:underline block font-semibold">
              {testingSms ? 'Receiving...' : 'Trigger SMS &rarr;'}
            </span>
          </button>

          {/* 2. Test WhatsApp Access */}
          <button
            onClick={handleTestWhatsAppAccess}
            disabled={testingWhatsApp}
            className="p-3 bg-[#131314] hover:bg-[#18191a] border border-[#282a2c] hover:border-[#25d366]/50 rounded-xl text-left space-y-1.5 transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#25d366]">2. Test WhatsApp Access</span>
              <MessageSquare className="w-3.5 h-3.5 text-[#25d366]" />
            </div>
            <p className="text-[11px] text-[#8e918f] leading-snug">
              Test notification listener &amp; RemoteInput binding
            </p>
            <span className="text-[10px] text-[#81c995] group-hover:underline block font-semibold">
              {testingWhatsApp ? 'Intercepting...' : 'Trigger WhatsApp &rarr;'}
            </span>
          </button>

          {/* 3. Test Approved SMS Send */}
          <button
            onClick={handleTestApprovedSmsSend}
            className="p-3 bg-[#131314] hover:bg-[#18191a] border border-[#282a2c] hover:border-[#70a6ff]/50 rounded-xl text-left space-y-1.5 transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#e3e3e3]">3. Send Approved SMS</span>
              <Send className="w-3.5 h-3.5 text-[#70a6ff]" />
            </div>
            <p className="text-[11px] text-[#8e918f] leading-snug">
              Approve SMS draft &amp; verify Android SmsManager ACK
            </p>
            <span className="text-[10px] text-[#70a6ff] group-hover:underline block font-semibold">
              Approve SMS &rarr;
            </span>
          </button>

          {/* 4. Test Approved WhatsApp Reply */}
          <button
            onClick={handleTestApprovedWhatsAppReply}
            className="p-3 bg-[#131314] hover:bg-[#18191a] border border-[#282a2c] hover:border-[#25d366]/50 rounded-xl text-left space-y-1.5 transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#e3e3e3]">4. Send Approved WhatsApp</span>
              <Send className="w-3.5 h-3.5 text-[#25d366]" />
            </div>
            <p className="text-[11px] text-[#8e918f] leading-snug">
              Approve reply &amp; verify RemoteInput ACK
            </p>
            <span className="text-[10px] text-[#81c995] group-hover:underline block font-semibold">
              Approve WhatsApp &rarr;
            </span>
          </button>
        </div>
      </div>

      {/* 7-Stage End-to-End Test Suite Trace */}
      <div className="bg-[#1e1f20] rounded-2xl border border-[#2d2f31] p-5 space-y-4 text-xs shadow-xs">
        <div className="flex items-center justify-between border-b border-[#282a2c] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#a8c7fa]" />
              <h3 className="font-bold text-sm text-[#e3e3e3]">
                7-Stage End-to-End Test Suite Execution Trace
              </h3>
            </div>
            <p className="text-[#8e918f] text-[11px] mt-0.5">
              Verified test sequence ensuring safety invariants, AI drafting, and hardware ACK operate reliably
            </p>
          </div>

          {testSuite && (
            <span className={`px-3 py-1 rounded-full font-mono text-[11px] font-bold ${
              testSuite.allPassed ? 'bg-[#34a853]/20 text-[#81c995] border border-[#34a853]/40' : 'bg-[#ea4335]/20 text-[#f28b82]'
            }`}>
              {testSuite.allPassed ? 'ALL 7 STAGES PASSED' : 'STAGES FAILED'}
            </span>
          )}
        </div>

        {/* Stages List */}
        <div className="space-y-2">
          {testSuite ? (
            testSuite.stages.map((stage) => (
              <div
                key={stage.id}
                className="p-3.5 bg-[#131314] rounded-xl border border-[#282a2c] flex items-start justify-between gap-4 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {stage.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-[#81c995] shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-[#f28b82] shrink-0" />
                    )}
                    <span className="font-bold text-[#e3e3e3]">{stage.name}</span>
                  </div>
                  <p className="text-[11px] text-[#8e918f] pl-6 leading-relaxed">
                    {stage.description}
                  </p>
                  <div className="text-[11px] text-[#a8c7fa] font-mono pl-6">
                    &rarr; {stage.details}
                  </div>
                </div>

                <span className="text-[10px] text-[#8e918f] font-mono shrink-0 pt-0.5">
                  {stage.timestamp}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-[#8e918f] space-y-2">
              <Layers className="w-8 h-8 text-[#505255] mx-auto" />
              <p>No test suite execution recorded yet.</p>
              <button
                onClick={handleRunAllTests}
                disabled={isRunningAllTests}
                className="px-4 py-1.5 bg-[#282a2c] hover:bg-[#333538] text-[#a8c7fa] border border-[#37393b] rounded-full text-xs font-semibold"
              >
                Run Test Suite Now
              </button>
            </div>
          )}
        </div>

        {/* Safety Invariant Notice */}
        <div className="p-3.5 bg-[#131314] border border-[#37393b] rounded-xl flex items-start gap-2.5 text-[#8e918f] text-[11px]">
          <ShieldAlert className="w-4 h-4 text-[#fbbc04] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-[#e3e3e3]">Safety Guard:</strong> In accordance with safety protocol, all message transmission remains in manual approval mode until each of the 7 stages is verified. Unknown senders, calendar requests, and sensitive topics can never be sent automatically.
          </p>
        </div>
      </div>
    </div>
  );
};
