import React, { useState } from 'react';
import { 
  Conversation, 
  Message, 
  SystemSettings, 
  ChannelType, 
  CommunicationStyle 
} from '../types';
import { 
  Send, 
  Check, 
  X, 
  Edit3, 
  Shield, 
  AlertCircle, 
  Sparkles, 
  RefreshCw,
  Phone,
  MessageSquare,
  Clock,
  CheckCheck
} from 'lucide-react';

interface ConversationsViewProps {
  conversations: Conversation[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  settings: SystemSettings;
  onApproveReply: (conversationId: string, messageId: string, replyText: string) => void;
  onRejectReply: (conversationId: string, messageId: string) => void;
  onSendManualMessage: (conversationId: string, text: string) => void;
  onRegenerateReply: (conversationId: string, style: CommunicationStyle) => void;
}

export const ConversationsView: React.FC<ConversationsViewProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  settings,
  onApproveReply,
  onRejectReply,
  onSendManualMessage,
  onRegenerateReply,
}) => {
  const activeConversation = conversations.find((c) => c.id === activeConversationId) || conversations[0];
  
  // Find the latest message from contact that has a suggested reply
  const latestPendingMessage = activeConversation?.messages
    .slice()
    .reverse()
    .find((m) => m.senderType === 'contact' && m.suggestedReply);

  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(latestPendingMessage?.suggestedReply?.text || '');
  const [manualInput, setManualInput] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'sms' | 'whatsapp'>('all');

  // Update editor text when active conversation changes
  React.useEffect(() => {
    if (latestPendingMessage?.suggestedReply) {
      setEditedText(latestPendingMessage.suggestedReply.text);
      setIsEditing(false);
    }
  }, [activeConversationId, latestPendingMessage?.suggestedReply?.text]);

  const filteredConversations = conversations.filter((c) => {
    if (channelFilter === 'all') return true;
    return c.channel === channelFilter;
  });

  const handleApprove = () => {
    if (!latestPendingMessage || !activeConversation) return;
    const textToSend = isEditing ? editedText : (latestPendingMessage.suggestedReply?.text || '');
    onApproveReply(activeConversation.id, latestPendingMessage.id, textToSend);
    setIsEditing(false);
  };

  const handleReject = () => {
    if (!latestPendingMessage || !activeConversation) return;
    onRejectReply(activeConversation.id, latestPendingMessage.id);
    setIsEditing(false);
  };

  const handleSendManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim() || !activeConversation) return;
    onSendManualMessage(activeConversation.id, manualInput.trim());
    setManualInput('');
  };

  const handleSelectAlternative = (altText: string) => {
    setEditedText(altText);
    setIsEditing(true);
  };

  const reply = latestPendingMessage?.suggestedReply;

  // Determine Decision Banner styling and text
  const getDecisionBadge = () => {
    if (!reply) return null;
    const decision = reply.decision;

    if (decision === 'AUTO_SEND_ELIGIBLE') {
      return {
        bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        title: 'Eligible for Automatic Sending (Mode C)',
        description: reply.decisionReason,
        badge: 'AUTO SEND READY',
        badgeBg: 'bg-emerald-600 text-white',
      };
    }
    if (decision === 'REQUIRES_APPROVAL') {
      return {
        bg: 'bg-amber-50 border-amber-200 text-amber-800',
        title: 'Human Review & Approval Required',
        description: reply.decisionReason,
        badge: 'APPROVAL REQUIRED',
        badgeBg: 'bg-amber-600 text-white',
      };
    }
    if (decision === 'BLOCKED_BY_SAFETY') {
      return {
        bg: 'bg-rose-50 border-rose-200 text-rose-800',
        title: 'Transmission Blocked by Safety Invariant',
        description: reply.decisionReason,
        badge: 'BLOCKED BY POLICY',
        badgeBg: 'bg-rose-600 text-white',
      };
    }
    return {
      bg: 'bg-slate-50 border-slate-200 text-slate-800',
      title: 'Draft Stored Only (Mode A)',
      description: reply.decisionReason,
      badge: 'DRAFT ONLY',
      badgeBg: 'bg-slate-700 text-white',
    };
  };

  const decisionMeta = getDecisionBadge();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 max-w-7xl mx-auto">
      {/* 1. Conversations Column (4 Cols on Desktop, Full Width on Android) */}
      <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 flex flex-col h-[750px] shadow-xs">
        {/* Channel Filter & Search */}
        <div className="p-3 border-b border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Conversations
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              {filteredConversations.length} active
            </span>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
            <button
              onClick={() => setChannelFilter('all')}
              className={`flex-1 py-1 rounded font-medium transition-colors ${
                channelFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Channels
            </button>
            <button
              onClick={() => setChannelFilter('sms')}
              className={`flex-1 py-1 rounded font-medium transition-colors ${
                channelFilter === 'sms' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              SMS
            </button>
            <button
              onClick={() => setChannelFilter('whatsapp')}
              className={`flex-1 py-1 rounded font-medium transition-colors ${
                channelFilter === 'whatsapp' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              WhatsApp
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredConversations.map((conv) => {
            const isSelected = conv.id === activeConversation?.id;
            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 ${
                  isSelected ? 'bg-slate-100/80 border-l-2 border-slate-900' : 'hover:bg-slate-50'
                }`}
              >
                <div className={`w-9 h-9 rounded-full ${conv.avatarColor} text-white flex items-center justify-center font-bold text-xs shrink-0`}>
                  {conv.contactName.charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-900 text-xs truncate">
                      {conv.contactName}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {conv.lastMessageTime}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 truncate mb-1.5">
                    {conv.lastMessage}
                  </p>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className={conv.channel === 'sms' ? 'text-blue-600 font-medium' : 'text-emerald-600 font-medium'}>
                      {conv.channel.toUpperCase()}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{conv.contactPhone}</span>
                    {conv.hasPendingApproval && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-700 font-medium">Review Ready</span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Chat & AI Review Column (8 Cols on Desktop) */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        {/* Active Conversation Message History */}
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col h-[400px] shadow-xs">
          {/* Thread Header */}
          <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full ${activeConversation.avatarColor} text-white flex items-center justify-center font-bold text-xs`}>
                {activeConversation.contactName.charAt(0)}
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  {activeConversation.contactName}
                </h3>
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <span className={activeConversation.channel === 'sms' ? 'text-blue-600 font-medium' : 'text-emerald-600 font-medium'}>
                    {activeConversation.channel.toUpperCase()} Channel
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{activeConversation.contactPhone}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-400 font-mono">End-to-End Logged</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-500 font-medium">
                Simulated Sandbox
              </span>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
            {activeConversation.messages.map((msg) => {
              const isUser = msg.senderType === 'user';
              const isAssistant = msg.senderType === 'assistant';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-500">
                    <span className="font-medium text-slate-700">{msg.senderName}</span>
                    <span aria-hidden="true">·</span>
                    <span>{msg.timestamp}</span>
                    {msg.category && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-slate-600">[{msg.category}]</span>
                      </>
                    )}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                      isUser
                        ? 'bg-slate-900 text-white rounded-br-xs'
                        : isAssistant
                        ? 'bg-emerald-800 text-white rounded-bl-xs'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.body}</p>

                    {msg.deliveryStatus === 'simulated_sent' && (
                      <div className="mt-2 pt-1.5 border-t border-slate-700/50 flex items-center gap-1.5 text-[10px] text-emerald-300 font-mono">
                        <CheckCheck className="w-3 h-3" />
                        <span>SIMULATED SENT ({msg.transmissionId})</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Direct Manual Reply Input */}
          <form onSubmit={handleSendManual} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Type your own direct response here..."
              className="flex-1 text-xs sm:text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
            <button
              type="submit"
              className="px-3.5 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>

        {/* AI-Generated Reply Panel & Human-in-the-Loop Review Area */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                AI Suggested Response & Decision Engine
              </h2>
            </div>

            {reply && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Confidence: {(reply.confidence * 100).toFixed(0)}%</span>
                <span aria-hidden="true">·</span>
                <span>Style: {settings.communicationStyle}</span>
              </div>
            )}
          </div>

          {reply ? (
            <div className="space-y-3.5">
              {/* Decision Badge & Invariant Reason */}
              {decisionMeta && (
                <div className={`p-3 rounded-lg border text-xs ${decisionMeta.bg}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold tracking-tight">{decisionMeta.title}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${decisionMeta.badgeBg}`}>
                      {decisionMeta.badge}
                    </span>
                  </div>
                  <p className="leading-relaxed opacity-90">{decisionMeta.description}</p>
                </div>
              )}

              {/* Editable Suggested Response */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{isEditing ? 'Editing AI Response:' : 'AI Suggested Reply:'}</span>
                  </label>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-xs text-slate-600 hover:text-slate-900 font-medium underline"
                  >
                    {isEditing ? 'Done Editing' : 'Edit Text'}
                  </button>
                </div>

                {isEditing ? (
                  <textarea
                    rows={3}
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    className="w-full text-xs sm:text-sm p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                  />
                ) : (
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 leading-relaxed font-sans">
                    {editedText || reply.text}
                  </div>
                )}
              </div>

              {/* Alternative Options */}
              {reply.alternatives && reply.alternatives.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    Alternative Variations (Click to Swap):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {reply.alternatives.map((alt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectAlternative(alt)}
                        className="text-left text-xs p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors text-slate-700"
                      >
                        "{alt}"
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Controls: Approve, Reject, Re-generate */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleApprove}
                    disabled={settings.emergencyStop || (reply.decision === 'BLOCKED_BY_SAFETY')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve & Send (Simulated)</span>
                  </button>

                  <button
                    onClick={handleReject}
                    className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5 text-rose-600" />
                    <span>Reject</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span>Regenerate style:</span>
                  {(['concise', 'casual', 'professional', 'direct'] as CommunicationStyle[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => onRegenerateReply(activeConversation.id, st)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        settings.communicationStyle === st ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              No pending incoming message in this conversation. Use the Scenario Demonstration tab or send a message to simulate ingress.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
