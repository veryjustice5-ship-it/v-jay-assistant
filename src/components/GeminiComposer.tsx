import React, { useState, useMemo } from 'react';
import { 
  Send, 
  Smartphone, 
  MessageSquare, 
  ChevronDown, 
  User, 
  Zap,
  Sparkles,
  Clock,
  Navigation,
  FileText,
  ThumbsUp
} from 'lucide-react';
import { ChannelType, Contact, MessageCategory } from '../types';

interface GeminiComposerProps {
  contacts: Contact[];
  onSendMessage: (text: string, channel: ChannelType, contactId: string) => void;
  disabled?: boolean;
  lastMessageText?: string;
  lastMessageCategory?: MessageCategory;
}

export const GeminiComposer: React.FC<GeminiComposerProps> = ({
  contacts,
  onSendMessage,
  disabled = false,
  lastMessageText = '',
  lastMessageCategory,
}) => {
  const [text, setText] = useState('');
  const [channel, setChannel] = useState<ChannelType>('sms');
  const [contactId, setContactId] = useState<string>(contacts[0]?.id || 'contact-sarah');
  const [showOptions, setShowOptions] = useState(false);

  const activeContact = contacts.find((c) => c.id === contactId) || contacts[0];

  // Context-aware quick reply calculation based on the incoming message context & category
  const contextQuickReplies = useMemo(() => {
    const lower = (lastMessageText || '').toLowerCase();

    // 1. Scheduling / Location / Arrival context
    if (
      lastMessageCategory === 'scheduling' ||
      lower.includes('where are you') ||
      lower.includes('coming') ||
      lower.includes('when') ||
      lower.includes('meet') ||
      lower.includes('tomorrow')
    ) {
      return [
        { label: 'On my way', icon: 'nav' },
        { label: "I'll check and let you know", icon: 'clock' },
        { label: 'Running 5 mins late', icon: 'clock' },
        { label: 'Send details', icon: 'file' },
        { label: 'Talk soon', icon: 'chat' },
      ];
    }

    // 2. Information Request / Inquiry context
    if (
      lastMessageCategory === 'requests_for_information' ||
      lastMessageCategory === 'questions' ||
      lower.includes('link') ||
      lower.includes('address') ||
      lower.includes('send') ||
      lower.includes('file')
    ) {
      return [
        { label: 'Send details', icon: 'file' },
        { label: 'Sure, give me a moment', icon: 'clock' },
        { label: 'Looking into this now', icon: 'zap' },
        { label: 'Sounds good!', icon: 'thumb' },
        { label: 'Talk soon', icon: 'chat' },
      ];
    }

    // 3. Work or Project context
    if (
      lastMessageCategory === 'work_related' ||
      lastMessageCategory === 'school_related' ||
      lower.includes('project') ||
      lower.includes('assignment')
    ) {
      return [
        { label: 'Reviewing now', icon: 'zap' },
        { label: 'Send details', icon: 'file' },
        { label: 'Will update shortly', icon: 'clock' },
        { label: 'Sounds good!', icon: 'thumb' },
        { label: 'Talk soon', icon: 'chat' },
      ];
    }

    // 4. Default / Greetings / General
    return [
      { label: 'On my way', icon: 'nav' },
      { label: 'Talk soon', icon: 'chat' },
      { label: 'Send details', icon: 'file' },
      { label: 'Sounds good!', icon: 'thumb' },
      { label: "I'll check and let you know", icon: 'clock' },
      { label: "Can't talk right now", icon: 'clock' },
    ];
  }, [lastMessageText, lastMessageCategory]);

  const handleQuickReplyClick = (replyText: string) => {
    setText(replyText);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSendMessage(text.trim(), channel, contactId);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'nav':
        return <Navigation className="w-3 h-3 text-[#70a6ff]" />;
      case 'file':
        return <FileText className="w-3 h-3 text-[#a8c7fa]" />;
      case 'clock':
        return <Clock className="w-3 h-3 text-[#fbbc04]" />;
      case 'thumb':
        return <ThumbsUp className="w-3 h-3 text-[#81c995]" />;
      default:
        return <Zap className="w-3 h-3 text-[#a8c7fa]" />;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4 space-y-2">
      {/* Context-Aware 'Quick Reply' Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none">
        <div className="flex items-center gap-1 text-[11px] font-medium text-[#8e918f] uppercase tracking-wider shrink-0 mr-1 pl-1">
          <Sparkles className="w-3 h-3 text-[#a8c7fa]" />
          <span className="hidden sm:inline">Quick Replies:</span>
        </div>

        {contextQuickReplies.map((item, idx) => {
          const isSelected = text === item.label;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleQuickReplyClick(item.label)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all border ${
                isSelected
                  ? 'bg-[#2b2d30] text-[#a8c7fa] border-[#a8c7fa]/50 shadow-xs'
                  : 'bg-[#1e1f20] hover:bg-[#282a2c] text-[#c4c7c5] hover:text-[#e3e3e3] border-[#2d2f31] hover:border-[#37393b]'
              }`}
              title={`Insert quick reply: "${item.label}"`}
            >
              {renderIcon(item.icon)}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Options Bar above input pill */}
      <div className="flex items-center justify-between text-xs px-2 text-[#8e918f]">
        <div className="flex items-center gap-3">
          {/* Channel selector */}
          <div className="flex items-center gap-1 bg-[#1e1f20] border border-[#2d2f31] rounded-full p-0.5">
            <button
              type="button"
              onClick={() => setChannel('sms')}
              className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
                channel === 'sms'
                  ? 'bg-[#282a2c] text-[#70a6ff]'
                  : 'text-[#8e918f] hover:text-[#e3e3e3]'
              }`}
            >
              SMS
            </button>
            <button
              type="button"
              onClick={() => setChannel('whatsapp')}
              className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
                channel === 'whatsapp'
                  ? 'bg-[#282a2c] text-[#25d366]'
                  : 'text-[#8e918f] hover:text-[#e3e3e3]'
              }`}
            >
              WhatsApp
            </button>
          </div>

          {/* Sender selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#1e1f20] hover:bg-[#282a2c] border border-[#2d2f31] rounded-full text-xs text-[#c4c7c5]"
            >
              <User className="w-3 h-3 text-[#8e918f]" />
              <span className="truncate max-w-[120px] sm:max-w-none">
                {activeContact?.name || 'Sender'}
              </span>
              <ChevronDown className="w-3 h-3 text-[#8e918f]" />
            </button>

            {showOptions && (
              <div className="absolute left-0 bottom-full mb-1 w-64 bg-[#1e1f20] border border-[#37393b] rounded-xl shadow-xl z-50 p-1 space-y-0.5">
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-[#8e918f] tracking-wider">
                  Select Ingress Sender
                </div>
                {contacts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setContactId(c.id);
                      setChannel(c.channel);
                      setShowOptions(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                      contactId === c.id ? 'bg-[#282a2c] text-[#e3e3e3]' : 'text-[#c4c7c5] hover:bg-[#282a2c]'
                    }`}
                  >
                    <span className="truncate">{c.name}</span>
                    <span className="text-[10px] text-[#8e918f] font-mono">
                      {c.isPermittedForAuto ? 'Permitted' : 'Approval'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="hidden sm:block text-[11px] font-mono">
          Press Enter to dispatch to pipeline
        </div>
      </div>

      {/* Gemini Iconic Floating Composer Capsule */}
      <form
        onSubmit={handleSubmit}
        className="relative bg-[#1e1f20] border border-[#37393b] hover:border-[#4f5256] focus-within:border-[#7c828a] focus-within:shadow-[0_0_20px_rgba(100,140,255,0.08)] rounded-3xl transition-all shadow-md"
      >
        <div className="flex items-center px-4 py-2.5">
          <textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Simulate incoming ${channel.toUpperCase()} message from ${activeContact?.name}...`}
            className="flex-1 bg-transparent text-xs sm:text-sm text-[#e3e3e3] placeholder-[#8e918f] focus:outline-none resize-none leading-relaxed min-h-[36px] max-h-32 pt-1.5"
          />

          <button
            type="submit"
            disabled={!text.trim() || disabled}
            className="ml-2 w-9 h-9 rounded-full bg-[#e3e3e3] hover:bg-white disabled:bg-[#282a2c] disabled:text-[#5f6266] text-[#131314] flex items-center justify-center transition-colors shrink-0 shadow-xs"
            title="Dispatch message through assistant pipeline"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Bottom Disclaimer (Gemini style) */}
      <div className="text-center text-[11px] text-[#8e918f]">
        Personal AI Messaging Assistant · Evaluated via 8-Stage Pipeline · Simulated test adapter active
      </div>
    </div>
  );
};
