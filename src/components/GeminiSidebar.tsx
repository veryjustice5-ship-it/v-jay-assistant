import React from 'react';
import { 
  Plus, 
  MessageSquare, 
  Smartphone, 
  Shield, 
  History, 
  Layers, 
  Sliders, 
  ChevronRight,
  Zap,
  CheckCircle2,
  X
} from 'lucide-react';
import { GeminiSparkle } from './GeminiSparkle';
import { Conversation, SystemSettings } from '../types';

interface GeminiSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewSimulation: () => void;
  activeView: string;
  onSelectView: (view: string) => void;
  settings: SystemSettings;
  pendingCount: number;
  isDeviceConnected: boolean;
  onOpenPhoneLink: () => void;
}

export const GeminiSidebar: React.FC<GeminiSidebarProps> = ({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewSimulation,
  activeView,
  onSelectView,
  settings,
  pendingCount,
  isDeviceConnected,
  onOpenPhoneLink,
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Rail */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#1e1f20] border-r border-[#2d2f31] flex flex-col transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <GeminiSparkle size={22} />
            <span className="font-bold text-sm text-[#e3e3e3] tracking-tight">
              v jay Assistant
            </span>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-[#8e918f] hover:text-[#e3e3e3] hover:bg-[#282a2c] rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Ingress Simulation & Link Real Phone Buttons */}
        <div className="px-3 pb-3 space-y-1.5">
          <button
            onClick={() => {
              onNewSimulation();
              if (window.innerWidth < 1024) onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-2 bg-[#282a2c] hover:bg-[#333538] text-[#e3e3e3] rounded-full text-xs font-medium transition-colors border border-[#37393b] shadow-xs"
          >
            <Plus className="w-4 h-4 text-[#a8c7fa]" />
            <span>New Message Ingress</span>
          </button>

          <button
            onClick={() => {
              onOpenPhoneLink();
              if (window.innerWidth < 1024) onClose();
            }}
            className={`w-full flex items-center justify-between px-4 py-2 rounded-full text-xs font-medium transition-colors border shadow-xs ${
              isDeviceConnected
                ? 'bg-[#34a853]/15 text-[#81c995] border-[#34a853]/40 hover:bg-[#34a853]/25'
                : 'bg-[#18191a] text-[#c4c7c5] border-[#2d2f31] hover:bg-[#282a2c]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Smartphone className={`w-3.5 h-3.5 ${isDeviceConnected ? 'text-[#81c995]' : 'text-[#a8c7fa]'}`} />
              <span>{isDeviceConnected ? 'Real Phone Linked' : 'Link Real Phone'}</span>
            </div>
            <span className={`w-2 h-2 rounded-full ${isDeviceConnected ? 'bg-[#34a853]' : 'bg-[#fbbc04]'}`} />
          </button>
        </div>

        {/* Scrollable Center: Recent Conversations & Quick Scenarios */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {/* Recent Conversations */}
          <div>
            <div className="px-3 py-1 flex items-center justify-between text-[11px] font-medium text-[#8e918f] uppercase tracking-wider">
              <span>Recent Chats</span>
              <span className="font-mono text-[10px]">{conversations.length}</span>
            </div>

            <div className="mt-1 space-y-0.5">
              {conversations.map((conv) => {
                const isSelected = activeView === 'chat' && conv.id === activeConversationId;
                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      onSelectConversation(conv.id);
                      onSelectView('chat');
                      if (window.innerWidth < 1024) onClose();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between group ${
                      isSelected
                        ? 'bg-[#2b2d30] text-[#e3e3e3] font-medium'
                        : 'text-[#c4c7c5] hover:bg-[#282a2c] hover:text-[#e3e3e3]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${conv.channel === 'sms' ? 'bg-[#70a6ff]' : 'bg-[#25d366]'}`} />
                      <span className="truncate">{conv.contactName}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {conv.hasPendingApproval && (
                        <span className="w-2 h-2 rounded-full bg-[#fbbc04]" title="Pending review" />
                      )}
                      <span className="text-[10px] text-[#8e918f] font-mono">
                        {conv.channel.toUpperCase()}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scenarios Quick Access */}
          <div>
            <div className="px-3 py-1 flex items-center justify-between text-[11px] font-medium text-[#8e918f] uppercase tracking-wider">
              <span>Official Scenarios</span>
              <Zap className="w-3 h-3 text-[#fbbc04]" />
            </div>

            <div className="mt-1 space-y-0.5">
              {[
                { id: 1, name: '1. Greeting' },
                { id: 2, name: '2. Missing Info' },
                { id: 3, name: '3. Auto-Reply' },
                { id: 4, name: '4. Sensitive OTP' },
                { id: 5, name: '5. Injection Shield' },
                { id: 6, name: '6. Auto Disabled' },
                { id: 7, name: '7. Emergency Stop' },
              ].map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => {
                    onSelectView('scenarios');
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                    activeView === 'scenarios'
                      ? 'bg-[#282a2c] text-[#e3e3e3]'
                      : 'text-[#8e918f] hover:bg-[#282a2c] hover:text-[#e3e3e3]'
                  }`}
                >
                  <span className="truncate">{sc.name}</span>
                  <ChevronRight className="w-3 h-3 opacity-40" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Navigation (Settings, Activity, Feasibility) */}
        <div className="p-3 border-t border-[#2d2f31] space-y-1">
          <button
            onClick={() => {
              onSelectView('settings');
              if (window.innerWidth < 1024) onClose();
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${
              activeView === 'settings'
                ? 'bg-[#282a2c] text-[#e3e3e3] font-medium'
                : 'text-[#c4c7c5] hover:bg-[#282a2c] hover:text-[#e3e3e3]'
            }`}
          >
            <Sliders className="w-4 h-4 text-[#8e918f]" />
            <span>Safeguards & Rules</span>
          </button>

          <button
            onClick={() => {
              onSelectView('activity');
              if (window.innerWidth < 1024) onClose();
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${
              activeView === 'activity'
                ? 'bg-[#282a2c] text-[#e3e3e3] font-medium'
                : 'text-[#c4c7c5] hover:bg-[#282a2c] hover:text-[#e3e3e3]'
            }`}
          >
            <History className="w-4 h-4 text-[#8e918f]" />
            <span>Activity Audit Log</span>
          </button>

          <button
            onClick={() => {
              onSelectView('architecture');
              if (window.innerWidth < 1024) onClose();
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${
              activeView === 'architecture'
                ? 'bg-[#282a2c] text-[#e3e3e3] font-medium'
                : 'text-[#c4c7c5] hover:bg-[#282a2c] hover:text-[#e3e3e3]'
            }`}
          >
            <Smartphone className="w-4 h-4 text-[#8e918f]" />
            <span>Android & WhatsApp Specs</span>
          </button>
        </div>

        {/* Mode Tag at bottom */}
        <div className="px-4 py-2.5 bg-[#18191a] border-t border-[#2d2f31] flex items-center justify-between text-[11px] text-[#8e918f]">
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${settings.emergencyStop ? 'bg-[#ea4335]' : settings.automationEnabled ? 'bg-[#34a853]' : 'bg-[#8e918f]'}`} />
            <span>{settings.emergencyStop ? 'Stop Active' : settings.automationMode.replace('_', ' ')}</span>
          </span>
          <span className="font-mono text-[10px]">v1.0</span>
        </div>
      </aside>
    </>
  );
};
