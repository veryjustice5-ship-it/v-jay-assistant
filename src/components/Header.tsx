import React from 'react';
import { 
  ShieldAlert, 
  Power, 
  Smartphone, 
  MessageSquare, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { SystemSettings, AutomationMode } from '../types';

interface HeaderProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  smsCount: number;
  waCount: number;
  autoSentCount: number;
  pendingReviewCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onUpdateSettings,
  activeTab,
  onSelectTab,
  smsCount,
  waCount,
  autoSentCount,
  pendingReviewCount,
}) => {
  const toggleEmergencyStop = () => {
    onUpdateSettings({ emergencyStop: !settings.emergencyStop });
  };

  const toggleMasterAutomation = () => {
    onUpdateSettings({ automationEnabled: !settings.automationEnabled });
  };

  const handleModeChange = (mode: AutomationMode) => {
    onUpdateSettings({ automationMode: mode });
  };

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
      {/* Emergency Stop Strip if Active */}
      {settings.emergencyStop && (
        <div className="bg-rose-600 text-white px-4 py-2 text-sm font-medium flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
            <span>
              EMERGENCY STOP ACTIVE: All outbound messaging and automatic processing are completely suspended.
            </span>
          </div>
          <button
            onClick={toggleEmergencyStop}
            className="px-3 py-1 bg-white text-rose-700 text-xs font-semibold rounded hover:bg-rose-50 transition-colors shadow-sm"
          >
            Disengage Killswitch
          </button>
        </div>
      )}

      {/* Main Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-sm">
              <Smartphone className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Personal AI Messaging Assistant
                </h1>
                <span className="text-xs text-slate-500 font-mono">
                  v1.0-prototype
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <span>Android SMS</span>
                <span aria-hidden="true">·</span>
                <span>Personal WhatsApp</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-600 font-medium">Simulated Test Harness</span>
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls & Emergency Stop */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          {/* Master Automation Switch */}
          <button
            onClick={toggleMasterAutomation}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              settings.automationEnabled
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
            title="Master switch to toggle all messaging automation"
          >
            <Power className={`w-3.5 h-3.5 ${settings.automationEnabled ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Automation: {settings.automationEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Operating Mode Segmented Control */}
          <div className="flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg text-xs">
            <button
              onClick={() => handleModeChange('draft_only')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                settings.automationMode === 'draft_only'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mode A: Draft
            </button>
            <button
              onClick={() => handleModeChange('approval_required')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                settings.automationMode === 'approval_required'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mode B: Approval
            </button>
            <button
              onClick={() => handleModeChange('restricted_auto')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                settings.automationMode === 'restricted_auto'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mode C: Auto
            </button>
          </div>

          {/* Emergency Stop Button */}
          <button
            onClick={toggleEmergencyStop}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
              settings.emergencyStop
                ? 'bg-rose-700 text-white ring-2 ring-rose-400'
                : 'bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-600 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{settings.emergencyStop ? 'RESET STOP' : 'EMERGENCY STOP'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Bar & Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-slate-100">
        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto py-2">
          {[
            { id: 'conversations', label: 'Conversations & Review' },
            { id: 'scenarios', label: '7 Scenario Demonstrations' },
            { id: 'settings', label: 'Safeguards & Rules' },
            { id: 'activity', label: 'Activity Audit Log' },
            { id: 'architecture', label: 'Android & WhatsApp Feasibility' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Real-time Summary Counters */}
        <div className="flex items-center gap-4 py-2 text-xs text-slate-500 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-800">{smsCount}</span>
            <span>SMS Ingress</span>
          </div>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-800">{waCount}</span>
            <span>WhatsApp</span>
          </div>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-emerald-700">{autoSentCount}</span>
            <span>Simulated Auto-Sent</span>
          </div>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-amber-700">{pendingReviewCount}</span>
            <span>Pending Review</span>
          </div>
        </div>
      </div>
    </header>
  );
};
