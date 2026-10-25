import React from 'react';
import { 
  Menu, 
  ShieldAlert, 
  Power, 
  ChevronDown, 
  SlidersHorizontal,
  Smartphone,
  Check
} from 'lucide-react';
import { GeminiSparkle } from './GeminiSparkle';
import { SystemSettings, AutomationMode } from '../types';

interface GeminiHeaderProps {
  onToggleSidebar: () => void;
  settings: SystemSettings;
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => void;
  smsCount: number;
  waCount: number;
  autoSentCount: number;
  isDeviceConnected: boolean;
  onOpenPhoneLink: () => void;
}

export const GeminiHeader: React.FC<GeminiHeaderProps> = ({
  onToggleSidebar,
  settings,
  onUpdateSettings,
  smsCount,
  waCount,
  autoSentCount,
  isDeviceConnected,
  onOpenPhoneLink,
}) => {
  const [showModeDropdown, setShowModeDropdown] = React.useState(false);

  const toggleEmergencyStop = () => {
    onUpdateSettings({ emergencyStop: !settings.emergencyStop });
  };

  const toggleMasterAutomation = () => {
    onUpdateSettings({ automationEnabled: !settings.automationEnabled });
  };

  const handleSelectMode = (mode: AutomationMode) => {
    onUpdateSettings({ automationMode: mode });
    setShowModeDropdown(false);
  };

  const modeLabels: Record<AutomationMode, { title: string; subtitle: string }> = {
    draft_only: { title: 'Mode A: Draft Only', subtitle: 'Replies prepared as drafts' },
    approval_required: { title: 'Mode B: Approval Required', subtitle: 'Explicit review required' },
    restricted_auto: { title: 'Mode C: Restricted Auto', subtitle: 'Auto-sends permitted messages' },
  };

  return (
    <header className="sticky top-0 z-30 bg-[#131314]/90 backdrop-blur-md border-b border-[#282a2c] px-4 py-2.5">
      {/* Emergency Stop Banner if active */}
      {settings.emergencyStop && (
        <div className="mb-2 bg-[#ea4335]/20 border border-[#ea4335]/40 text-[#f28b82] px-3.5 py-1.5 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <ShieldAlert className="w-4 h-4 text-[#ea4335] animate-pulse" />
            <span>EMERGENCY STOP ENGAGED: Outbound messaging is globally frozen.</span>
          </div>
          <button
            onClick={toggleEmergencyStop}
            className="px-2.5 py-0.5 bg-[#ea4335] text-white text-[11px] font-bold rounded hover:bg-[#d93025] transition-colors"
          >
            Disengage
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        {/* Left: Hamburger & App Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 text-[#c4c7c5] hover:text-[#e3e3e3] hover:bg-[#282a2c] rounded-full transition-colors"
            title="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <GeminiSparkle size={20} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#e3e3e3] tracking-tight">
                  v jay
                </span>
                <span className="text-[11px] text-[#8e918f] font-mono">
                  Personal AI Assistant
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center / Right: Mode Selector Pill & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Automation Mode Dropdown Pill */}
          <div className="relative">
            <button
              onClick={() => setShowModeDropdown(!showModeDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e1f20] hover:bg-[#282a2c] border border-[#37393b] rounded-full text-xs text-[#e3e3e3] font-medium transition-colors"
            >
              <span className={`w-2 h-2 rounded-full ${
                settings.automationMode === 'restricted_auto' ? 'bg-[#34a853]' : settings.automationMode === 'approval_required' ? 'bg-[#fbbc04]' : 'bg-[#a8c7fa]'
              }`} />
              <span>{modeLabels[settings.automationMode].title.split(':')[0]}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#8e918f]" />
            </button>

            {showModeDropdown && (
              <div className="absolute right-0 mt-1.5 w-64 bg-[#1e1f20] border border-[#37393b] rounded-xl shadow-xl z-50 p-1.5 space-y-1">
                {(['draft_only', 'approval_required', 'restricted_auto'] as AutomationMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleSelectMode(mode)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-start justify-between transition-colors ${
                      settings.automationMode === mode
                        ? 'bg-[#2b2d30] text-[#e3e3e3]'
                        : 'text-[#c4c7c5] hover:bg-[#282a2c]'
                    }`}
                  >
                    <div>
                      <div className="font-medium text-[#e3e3e3]">{modeLabels[mode].title}</div>
                      <div className="text-[11px] text-[#8e918f]">{modeLabels[mode].subtitle}</div>
                    </div>
                    {settings.automationMode === mode && (
                      <Check className="w-4 h-4 text-[#a8c7fa] shrink-0 mt-0.5" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Phone Link & Real Device Button */}
          <button
            onClick={onOpenPhoneLink}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              isDeviceConnected
                ? 'bg-[#34a853]/15 text-[#81c995] border-[#34a853]/40 hover:bg-[#34a853]/25'
                : 'bg-[#1e1f20] text-[#c4c7c5] border-[#37393b] hover:bg-[#282a2c]'
            }`}
            title="Link Real Android Phone / Import Contacts"
          >
            <Smartphone className={`w-3.5 h-3.5 ${isDeviceConnected ? 'text-[#81c995]' : 'text-[#a8c7fa]'}`} />
            <span className="hidden md:inline">{isDeviceConnected ? 'Real Phone Linked' : 'Link Real Phone'}</span>
            <span className="md:hidden">{isDeviceConnected ? 'Linked' : 'Link'}</span>
          </button>

          {/* Master Automation Switch */}
          <button
            onClick={toggleMasterAutomation}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              settings.automationEnabled
                ? 'bg-[#1e1f20] text-[#a8c7fa] border-[#37393b] hover:bg-[#282a2c]'
                : 'bg-[#18191a] text-[#8e918f] border-[#2d2f31] hover:bg-[#282a2c]'
            }`}
            title="Toggle Master Automation"
          >
            <Power className={`w-3.5 h-3.5 ${settings.automationEnabled ? 'text-[#34a853]' : 'text-[#8e918f]'}`} />
            <span className="hidden sm:inline">Auto:</span>
            <span>{settings.automationEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Emergency Stop Button */}
          <button
            onClick={toggleEmergencyStop}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs ${
              settings.emergencyStop
                ? 'bg-[#ea4335] text-white ring-2 ring-[#ea4335]/50'
                : 'bg-[#1e1f20] text-[#ea4335] border border-[#ea4335]/40 hover:bg-[#ea4335] hover:text-white'
            }`}
            title="Emergency Killswitch"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{settings.emergencyStop ? 'STOPPED' : 'KILLSWITCH'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
