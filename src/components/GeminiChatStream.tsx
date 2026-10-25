import React, { useState } from 'react';
import { 
  Conversation, 
  Message, 
  SystemSettings, 
  CommunicationStyle,
  PipelineExecutionResult 
} from '../types';
import { GeminiSparkle } from './GeminiSparkle';
import { 
  ChevronDown, 
  ChevronUp, 
  Check, 
  X, 
  Edit3, 
  Copy, 
  CheckCheck, 
  Sparkles, 
  ShieldAlert, 
  AlertTriangle,
  Send,
  Zap,
  ArrowRight
} from 'lucide-react';

interface GeminiChatStreamProps {
  conversation: Conversation | null;
  settings: SystemSettings;
  onApproveReply: (conversationId: string, messageId: string, replyText: string) => void;
  onRejectReply: (conversationId: string, messageId: string) => void;
  onRegenerateReply: (conversationId: string, style: CommunicationStyle) => void;
  onRunQuickPrompt: (scenarioId: number) => void;
  onSimulateDeviceAck?: (dispatchId: string) => void;
}

export const GeminiChatStream: React.FC<GeminiChatStreamProps> = ({
  conversation,
  settings,
  onApproveReply,
  onRejectReply,
  onRegenerateReply,
  onRunQuickPrompt,
  onSimulateDeviceAck,
}) => {
  const [showThinkingFor, setShowThinkingFor] = useState<Record<string, boolean>>({});
  const [isEditingFor, setIsEditingFor] = useState<Record<string, boolean>>({});
  const [editedTextFor, setEditedTextFor] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleThinking = (messageId: string) => {
    setShowThinkingFor((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStartEdit = (messageId: string, initialText: string) => {
    setIsEditingFor((prev) => ({ ...prev, [messageId]: true }));
    if (!editedTextFor[messageId]) {
      setEditedTextFor((prev) => ({ ...prev, [messageId]: initialText }));
    }
  };

  // If no conversation or messages, show the iconic Gemini Welcome Screen
  if (!conversation || conversation.messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-3xl mx-auto my-auto">
        <div className="w-16 h-16 rounded-2xl bg-[#1e1f20] border border-[#2d2f31] flex items-center justify-center mb-6 shadow-xl">
          <GeminiSparkle size={36} animate />
        </div>

        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight gemini-gradient-text mb-3">
          Hello, Alex. I am v jay.
        </h2>

        <p className="text-sm sm:text-base text-[#8e918f] max-w-lg mb-8 leading-relaxed">
          I am your personal AI messaging assistant for Android SMS and WhatsApp.
          All ingress rules, classifications, and auto-replies are protected by server-side safeguards.
        </p>

        {/* Gemini Quick Prompt Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl text-left">
          {[
            { id: 1, title: 'Casual Greeting', desc: 'Simulate friendly SMS check-in ("Hey, how are you?")' },
            { id: 2, title: 'Scheduling & Commitments', desc: 'Verify assistant refuses to invent calendar availability' },
            { id: 3, title: 'Authorized Auto-Reply', desc: 'Test Mode C automated dispatch for permitted contact' },
            { id: 4, title: 'Sensitive OTP Protection', desc: 'Ensure verification codes are never disclosed' },
          ].map((card) => (
            <button
              key={card.id}
              onClick={() => onRunQuickPrompt(card.id)}
              className="p-4 bg-[#1e1f20] hover:bg-[#282a2c] border border-[#2d2f31] hover:border-[#37393b] rounded-2xl transition-all text-xs flex flex-col justify-between group shadow-xs"
            >
              <div>
                <span className="font-semibold text-[#e3e3e3] block mb-1">
                  {card.title}
                </span>
                <span className="text-[#8e918f] leading-relaxed">
                  {card.desc}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1 text-[#a8c7fa] opacity-80 group-hover:opacity-100 font-medium">
                <span>Run test</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 max-w-4xl w-full mx-auto space-y-6">
      {/* Conversation Channel Header Banner */}
      <div className="flex items-center justify-between pb-3 border-b border-[#282a2c] text-xs">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${conversation.channel === 'sms' ? 'bg-[#70a6ff]' : 'bg-[#25d366]'}`} />
          <span className="font-semibold text-[#e3e3e3]">{conversation.contactName}</span>
          <span className="text-[#8e918f]">({conversation.contactPhone})</span>
        </div>

        <div className="flex items-center gap-2 text-[#8e918f] font-mono text-[11px]">
          <span className="uppercase">{conversation.channel}</span>
          <span aria-hidden="true">·</span>
          <span>Simulated Channel Adapter</span>
        </div>
      </div>

      {/* Message Sequence */}
      {conversation.messages.map((msg) => {
        const isUser = msg.senderType === 'user';
        const isAssistant = msg.senderType === 'assistant';
        const isContact = msg.senderType === 'contact';
        const reply = msg.suggestedReply;
        const isThinkingOpen = showThinkingFor[msg.id];
        const isEditing = isEditingFor[msg.id];
        const currentReplyText = editedTextFor[msg.id] || reply?.text || '';

        // 1. Direct Manual User Message (You)
        if (isUser) {
          return (
            <div key={msg.id} className="flex justify-end">
              <div className="max-w-[80%] bg-[#282a2c] text-[#e3e3e3] rounded-2xl rounded-tr-xs px-4 py-3 text-xs sm:text-sm leading-relaxed border border-[#37393b]">
                <div className="text-[11px] text-[#8e918f] mb-1 flex items-center justify-between gap-3">
                  <span className="font-medium text-[#c4c7c5]">You</span>
                  <span>{msg.timestamp}</span>
                </div>
                <p className="whitespace-pre-wrap">{msg.body}</p>
              </div>
            </div>
          );
        }

        // 2. Direct Assistant Auto-Sent or Approved Reply Message
        if (isAssistant) {
          const isPendingDevice = msg.deliveryStatus === 'pending_device_ack';
          const isDelivered = msg.deliveryStatus === 'delivered';
          const isFailed = msg.deliveryStatus === 'failed';

          return (
            <div key={msg.id} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#1e1f20] border border-[#2d2f31] flex items-center justify-center shrink-0 mt-0.5">
                <GeminiSparkle size={16} />
              </div>

              <div className="flex-1 max-w-[85%] bg-[#1e1f20] border border-[#282a2c] rounded-2xl rounded-tl-xs px-4 py-3 text-xs sm:text-sm shadow-xs">
                <div className="text-[11px] text-[#8e918f] mb-1.5 flex items-center justify-between">
                  <span className="font-bold text-[#a8c7fa]">{msg.senderName}</span>
                  <div>
                    {isPendingDevice && (
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[#fbbc04]/20 text-[#fdd663] border border-[#fbbc04]/40 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#fbbc04] animate-ping" />
                        PENDING DEVICE CONFIRMATION
                      </span>
                    )}
                    {isDelivered && (
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[#34a853]/20 text-[#81c995] border border-[#34a853]/40 font-bold">
                        DELIVERED &amp; CONFIRMED BY DEVICE
                      </span>
                    )}
                    {isFailed && (
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[#ea4335]/20 text-[#f28b82] border border-[#ea4335]/40 font-bold">
                        DEVICE DISPATCH FAILED
                      </span>
                    )}
                    {!isPendingDevice && !isDelivered && !isFailed && (
                      <span className="font-mono text-[10px] text-[#34a853]">SENT</span>
                    )}
                  </div>
                </div>

                <p className="text-[#e3e3e3] leading-relaxed whitespace-pre-wrap">{msg.body}</p>

                {/* Device confirmation metadata & interactive simulator */}
                <div className="mt-2.5 pt-2 border-t border-[#282a2c] flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#8e918f] font-mono">
                  <div className="flex items-center gap-2">
                    {msg.transmissionId && <span>Tx: {msg.transmissionId}</span>}
                    {msg.deviceAckTimestamp && (
                      <span>Acked: {msg.deviceAckTimestamp}</span>
                    )}
                    {msg.dispatchId && <span>Queue ID: {msg.dispatchId}</span>}
                  </div>

                  {isPendingDevice && msg.dispatchId && onSimulateDeviceAck && (
                    <button
                      onClick={() => onSimulateDeviceAck(msg.dispatchId!)}
                      className="px-2.5 py-1 bg-[#fbbc04]/20 hover:bg-[#fbbc04]/30 text-[#fdd663] border border-[#fbbc04]/40 rounded-full font-sans text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Simulate device confirmation (for testing without live phone connected)"
                    >
                      <Check className="w-3 h-3" />
                      <span>Confirm Sent on Device</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        }

        // 3. Incoming Contact Message + Gemini Pipeline Response Block
        return (
          <div key={msg.id} className="space-y-4">
            {/* Incoming Ingress Card */}
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full ${conversation.avatarColor} text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-xs`}>
                {msg.senderName.charAt(0)}
              </div>

              <div className="flex-1 max-w-[85%] bg-[#1e1f20] border border-[#282a2c] rounded-2xl rounded-tl-xs p-4 text-xs sm:text-sm shadow-xs">
                <div className="flex items-center justify-between text-[11px] text-[#8e918f] mb-1.5">
                  <span className="font-semibold text-[#e3e3e3]">{msg.senderName}</span>
                  <span>{msg.timestamp}</span>
                </div>
                <p className="text-[#e3e3e3] text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {msg.body}
                </p>
                {msg.category && (
                  <div className="mt-2 text-[11px] text-[#8e918f] flex items-center gap-2">
                    <span className="font-mono">Category: {msg.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>Channel: {msg.channel.toUpperCase()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Gemini Assistant Suggested Reply Card */}
            {reply && (
              <div className="flex items-start gap-3 pl-2 sm:pl-4">
                <div className="w-8 h-8 rounded-full bg-[#1e1f20] border border-[#2d2f31] flex items-center justify-center shrink-0 mt-1 shadow-xs">
                  <GeminiSparkle size={16} />
                </div>

                <div className="flex-1 bg-[#1e1f20] border border-[#2d2f31] rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm">
                  {/* Top Bar with Thinking Accordion Button & Confidence */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#282a2c]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#e3e3e3]">
                        v jay Assistant Engine
                      </span>
                      <span className="text-[11px] text-[#8e918f] font-mono">
                        {(reply.confidence * 100).toFixed(0)}% confidence
                      </span>
                    </div>

                    {/* Gemini "Show Thinking" Toggle */}
                    <button
                      onClick={() => toggleThinking(msg.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#282a2c] hover:bg-[#333538] text-[11px] font-medium text-[#a8c7fa] transition-colors"
                    >
                      <Sparkles className="w-3 h-3 text-[#a8c7fa]" />
                      <span>{isThinkingOpen ? 'Hide Thinking Process' : 'Show Thinking (8-Stage Pipeline)'}</span>
                      {isThinkingOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* Collapsible Gemini Thinking Process Trace */}
                  {isThinkingOpen && (
                    <div className="p-3 bg-[#18191a] border border-[#282a2c] rounded-xl text-xs space-y-2 font-mono text-[#8e918f] animate-fadeIn">
                      <div className="text-[11px] font-bold text-[#c4c7c5] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-[#fbbc04]" />
                        <span>Execution Trace by Stage</span>
                      </div>
                      <div className="space-y-1.5 pl-2 border-l border-[#282a2c]">
                        <div><span className="text-[#a8c7fa]">Stage 1 (Validation):</span> Ingress sanitization & bounds verified.</div>
                        <div><span className="text-[#a8c7fa]">Stage 2 (Classification):</span> Category: {msg.category || 'detected'}.</div>
                        <div><span className="text-[#a8c7fa]">Stage 3 (Context):</span> Sourced contact profile & past history.</div>
                        <div><span className="text-[#a8c7fa]">Stage 4 (Generation):</span> Style '{settings.communicationStyle}'. Anti-hallucination active.</div>
                        <div><span className="text-[#a8c7fa]">Stage 5 (Safety):</span> Rate limits & prompt injection filters evaluated.</div>
                        <div><span className="text-[#a8c7fa]">Stage 6 (Decision):</span> {reply.decision} - {reply.decisionReason}</div>
                        <div><span className="text-[#a8c7fa]">Stage 7 (Dispatch):</span> Channel adapter configured.</div>
                      </div>
                    </div>
                  )}

                  {/* Decision Status Pill Banner */}
                  <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                    reply.decision === 'AUTO_SEND_ELIGIBLE'
                      ? 'bg-[#34a853]/10 border-[#34a853]/30 text-[#81c995]'
                      : reply.decision === 'BLOCKED_BY_SAFETY'
                      ? 'bg-[#ea4335]/10 border-[#ea4335]/30 text-[#f28b82]'
                      : reply.decision === 'DRAFT_ONLY'
                      ? 'bg-[#18191a] border-[#2d2f31] text-[#c4c7c5]'
                      : 'bg-[#fbbc04]/10 border-[#fbbc04]/30 text-[#fdd663]'
                  }`}>
                    {reply.decision === 'AUTO_SEND_ELIGIBLE' && <Check className="w-4 h-4 shrink-0 mt-0.5" />}
                    {reply.decision === 'BLOCKED_BY_SAFETY' && <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />}
                    {reply.decision === 'REQUIRES_APPROVAL' && <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      <div className="font-bold tracking-tight mb-0.5">
                        {reply.decision === 'AUTO_SEND_ELIGIBLE' && 'Eligible for Automatic Sending (Mode C)'}
                        {reply.decision === 'REQUIRES_APPROVAL' && 'Human Approval & Review Required'}
                        {reply.decision === 'DRAFT_ONLY' && 'Draft Stored Only (Mode A)'}
                        {reply.decision === 'BLOCKED_BY_SAFETY' && 'Blocked by Security Invariant'}
                      </div>
                      <p className="opacity-90 leading-relaxed font-sans text-[11px]">
                        {reply.decisionReason}
                      </p>
                    </div>
                  </div>

                  {/* Response Text or Inline Editor */}
                  <div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          rows={3}
                          value={currentReplyText}
                          onChange={(e) => setEditedTextFor((prev) => ({ ...prev, [msg.id]: e.target.value }))}
                          className="w-full p-3 bg-[#131314] text-[#e3e3e3] border border-[#37393b] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[#a8c7fa]"
                        />
                        <button
                          onClick={() => setIsEditingFor((prev) => ({ ...prev, [msg.id]: false }))}
                          className="text-xs text-[#a8c7fa] hover:underline"
                        >
                          Done editing
                        </button>
                      </div>
                    ) : (
                      <div className="p-3.5 bg-[#18191a] rounded-xl text-xs sm:text-sm text-[#e3e3e3] leading-relaxed border border-[#282a2c]">
                        {currentReplyText}
                      </div>
                    )}
                  </div>

                  {/* Alternative Suggestions Chips */}
                  {reply.alternatives && reply.alternatives.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-medium text-[#8e918f] uppercase tracking-wider block">
                        Alternative Suggestions:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {reply.alternatives.map((alt, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setEditedTextFor((prev) => ({ ...prev, [msg.id]: alt }));
                              setIsEditingFor((prev) => ({ ...prev, [msg.id]: false }));
                            }}
                            className="text-left text-[11px] px-3 py-1.5 rounded-full bg-[#282a2c] hover:bg-[#333538] text-[#c4c7c5] hover:text-[#e3e3e3] border border-[#37393b] transition-colors"
                          >
                            "{alt}"
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Controls Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#282a2c]">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onApproveReply(conversation.id, msg.id, currentReplyText)}
                        disabled={settings.emergencyStop || reply.decision === 'BLOCKED_BY_SAFETY'}
                        className="px-4 py-2 bg-[#a8c7fa] hover:bg-[#8ab4f8] disabled:bg-[#282a2c] disabled:text-[#8e918f] text-[#041e49] text-xs font-bold rounded-full transition-all flex items-center gap-1.5 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve &amp; Dispatch to Phone</span>
                      </button>

                      <button
                        onClick={() => handleStartEdit(msg.id, currentReplyText)}
                        className="px-3.5 py-2 bg-[#282a2c] hover:bg-[#333538] text-[#c4c7c5] hover:text-[#e3e3e3] rounded-full text-xs font-medium transition-colors flex items-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => onRejectReply(conversation.id, msg.id)}
                        className="px-3 py-2 text-[#8e918f] hover:text-[#f28b82] text-xs font-medium transition-colors flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopy(currentReplyText, msg.id)}
                        className="p-2 text-[#8e918f] hover:text-[#e3e3e3] hover:bg-[#282a2c] rounded-full transition-colors"
                        title="Copy to clipboard"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-[#81c995]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
