/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Conversation, 
  Contact, 
  SystemSettings, 
  AuditLogEntry, 
  ChannelType, 
  DeviceRegistration,
  OutboundDispatch,
  ServerStateResponse,
  PipelineExecutionResult
} from './types';
import { INITIAL_SETTINGS, INITIAL_CONTACTS, INITIAL_CONVERSATIONS, INITIAL_AUDIT_LOGS, SCENARIO_PRESETS } from './data/mockData';
import { executeMessagePipeline } from './services/pipeline';
import { GeminiSidebar } from './components/GeminiSidebar';
import { GeminiHeader } from './components/GeminiHeader';
import { GeminiChatStream } from './components/GeminiChatStream';
import { GeminiComposer } from './components/GeminiComposer';
import { ScenariosView } from './components/ScenariosView';
import { SettingsView } from './components/SettingsView';
import { ActivityLogView } from './components/ActivityLogView';
import { ArchitectureView } from './components/ArchitectureView';
import { PhoneLinkModal } from './components/PhoneLinkModal';
import { DeviceTestingSuiteView } from './components/DeviceTestingSuiteView';
import { Sparkles, Check, ShieldCheck } from 'lucide-react';

export default function App() {
  const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  
  // Real Device & Backend State
  const [connectedDevice, setConnectedDevice] = useState<DeviceRegistration | null>(null);
  const [pendingDispatches, setPendingDispatches] = useState<OutboundDispatch[]>([]);
  const [geminiActive, setGeminiActive] = useState<boolean>(false);
  const [lastTestRun, setLastTestRun] = useState<any>(null);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Navigation & View State ('chat' | 'scenarios' | 'settings' | 'activity' | 'architecture' | 'device-tests')
  const [activeView, setActiveView] = useState<string>('chat');
  const [activeConversationId, setActiveConversationId] = useState<string>('conv-sarah');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Fetch complete state from backend
  const fetchBackendState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) return;
      const data: ServerStateResponse = await res.json();
      
      if (data.settings) setSettings(data.settings);
      if (data.contacts) setContacts(data.contacts);
      if (data.conversations) setConversations(data.conversations);
      if (data.auditLogs) setAuditLogs(data.auditLogs);
      setConnectedDevice(data.connectedDevice || null);
      setPendingDispatches(data.pendingDispatches || []);
      setGeminiActive(Boolean(data.geminiActive));
      if (data.lastTestRun) setLastTestRun(data.lastTestRun);
    } catch (err) {
      console.warn('[App] Backend state fetch fallback:', err);
    }
  }, []);

  // Initial load and periodic polling (every 4s) to capture real device ingress & confirmations
  useEffect(() => {
    fetchBackendState();
    const interval = setInterval(fetchBackendState, 4000);
    return () => clearInterval(interval);
  }, [fetchBackendState]);

  // Active Conversation
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConversationId) || conversations[0] || null;
  }, [conversations, activeConversationId]);

  // Counts
  const smsCount = useMemo(() => {
    return conversations
      .filter((c) => c.channel === 'sms')
      .reduce((sum, c) => sum + c.messages.filter((m) => m.senderType === 'contact').length, 0);
  }, [conversations]);

  const waCount = useMemo(() => {
    return conversations
      .filter((c) => c.channel === 'whatsapp')
      .reduce((sum, c) => sum + c.messages.filter((m) => m.senderType === 'contact').length, 0);
  }, [conversations]);

  const autoSentCount = useMemo(() => {
    return auditLogs.filter((l) => l.actionTaken.includes('AUTO') || l.decision === 'AUTO_SEND_ELIGIBLE').length;
  }, [auditLogs]);

  const pendingReviewCount = useMemo(() => {
    return conversations.filter((c) => c.hasPendingApproval).length;
  }, [conversations]);

  // Handler: Ingress message through pipeline (sync result for UI, async sync to backend)
  const handleExecutePipeline = (
    text: string,
    contactId: string,
    channel: ChannelType,
    tempSettingsOverride?: Partial<SystemSettings>
  ): PipelineExecutionResult => {
    const contact = contacts.find((c) => c.id === contactId) || {
      id: contactId,
      name: 'Unknown Sender',
      phone: '+1 (555) 000-0000',
      channel,
      avatarColor: 'bg-[#505255]',
      isPermittedForAuto: false,
      relationship: 'Unrecognized',
      lastActive: 'Just now',
    };

    const effectiveSettings: SystemSettings = {
      ...settings,
      ...tempSettingsOverride,
    };

    const result = executeMessagePipeline(text, contact, channel, effectiveSettings);

    // Sync to backend API asynchronously
    fetch('/api/messages/ingress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        contactId,
        channel,
        tempSettingsOverride,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          fetchBackendState();
        }
      })
      .catch((err) => console.warn('[App] Ingress async sync:', err));

    return result;
  };

  const handleApplyPipelineResultToConversation = (result: PipelineExecutionResult) => {
    const match = contacts.find((c) => c.name === result.senderName);
    if (match) {
      const matchingConv = conversations.find((c) => c.contactName === match.name);
      if (matchingConv) setActiveConversationId(matchingConv.id);
    }
  };

  // Handler: Approve and Send via Device
  const handleApproveReply = async (conversationId: string, messageId: string, replyText: string) => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/messages/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          messageId,
          action: 'approve',
          replyText,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchBackendState();
      }
    } catch (err) {
      console.error('[App] Approval action error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Handler: Reject Reply
  const handleRejectReply = async (conversationId: string, messageId: string) => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/messages/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          messageId,
          action: 'reject',
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchBackendState();
      }
    } catch (err) {
      console.error('[App] Reject action error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Handler: Simulate Device Delivery ACK (for prototype testing without physical phone polling)
  const handleSimulateDeviceAck = async (dispatchId: string) => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/device/simulate-ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dispatchId, status: 'delivered' }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchBackendState();
      }
    } catch (err) {
      console.error('[App] Simulate ACK error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Handler: Update Settings on Backend
  const handleUpdateSettings = async (newSettings: Partial<SystemSettings>) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('[App] Update settings error:', err);
    }
  };

  // Handler: Update Contact Authorization for Mode C
  const handleUpdateContactPermission = async (contactId: string, isPermitted: boolean) => {
    try {
      const res = await fetch(`/api/contacts/${contactId}/permission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPermitted }),
      });
      if (res.ok) {
        await fetchBackendState();
      }
    } catch (err) {
      console.error('[App] Update contact permission error:', err);
    }
  };

  // Handler: Add Contact
  const handleAddContact = async (contact: Omit<Contact, 'id'>) => {
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contact),
      });
      const data = await res.json();
      if (data.success) {
        await fetchBackendState();
      }
    } catch (err) {
      console.error('[App] Add contact error:', err);
    }
  };

  // Handler: Clear All Data
  const handleClearAllData = async () => {
    try {
      await fetch('/api/purge', { method: 'POST' });
      await fetchBackendState();
    } catch (err) {
      console.error('[App] Purge error:', err);
    }
  };

  // Handler: Quick prompt from Gemini Greeting Screen
  const handleRunQuickPrompt = async (scenarioId: number) => {
    const preset = SCENARIO_PRESETS.find((p) => p.id === scenarioId);
    if (!preset) return;

    let override: Partial<SystemSettings> | undefined = undefined;
    if (preset.id === 3) {
      override = { automationMode: 'restricted_auto', automationEnabled: true, emergencyStop: false };
      await handleUpdateSettings(override);
    }

    const result = handleExecutePipeline(preset.messageText, preset.senderId, preset.channel, override);
    handleApplyPipelineResultToConversation(result);
    setActiveView('chat');
  };

  // Handler: Ingress from Composer
  const handleComposerSend = (text: string, channel: ChannelType, contactId: string) => {
    const result = handleExecutePipeline(text, contactId, channel);
    handleApplyPipelineResultToConversation(result);
    setActiveView('chat');
  };

  return (
    <div className="flex h-screen bg-[#131314] text-[#e3e3e3] overflow-hidden selection:bg-[#282a2c]">
      {/* 1. Left Gemini Collapsible Rail Sidebar */}
      <GeminiSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        conversations={conversations}
        activeConversationId={activeConversation?.id || ''}
        onSelectConversation={(id) => {
          setActiveConversationId(id);
          setActiveView('chat');
        }}
        onNewSimulation={() => {
          setActiveView('chat');
        }}
        activeView={activeView}
        onSelectView={setActiveView}
        settings={settings}
        pendingCount={pendingReviewCount}
        isDeviceConnected={Boolean(connectedDevice)}
        onOpenPhoneLink={() => setIsPhoneModalOpen(true)}
      />

      {/* 2. Main Content Canvas */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden lg:pl-72">
        {/* Top Header */}
        <GeminiHeader
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          smsCount={smsCount}
          waCount={waCount}
          autoSentCount={autoSentCount}
          isDeviceConnected={Boolean(connectedDevice)}
          onOpenPhoneLink={() => setIsPhoneModalOpen(true)}
        />

        {/* Global Dispatch & AI Engine Status Ribbon */}
        <div className="bg-[#18191a] border-b border-[#282a2c] px-4 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#8e918f]">
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${connectedDevice ? 'bg-[#34a853]' : 'bg-[#fbbc04]'}`} />
              <span className="font-medium text-[#c4c7c5]">
                {connectedDevice ? `Bridge: ${connectedDevice.name}` : 'Bridge: Awaiting Android Link'}
              </span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1 font-mono text-[11px] text-[#a8c7fa]">
              <Sparkles className="w-3 h-3" />
              <span>{geminiActive ? 'Gemini 3.8 Flash Active' : 'Deterministic Safety Safeguard Active'}</span>
            </span>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setActiveView('device-tests')}
              className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                lastTestRun?.allPassed
                  ? 'bg-[#34a853]/20 text-[#81c995] hover:bg-[#34a853]/30'
                  : 'bg-[#a8c7fa]/20 text-[#a8c7fa] hover:bg-[#a8c7fa]/30'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>{lastTestRun?.allPassed ? 'E2E Verified (7/7 Passed)' : 'Run E2E Tests'}</span>
            </button>
          </div>

          {/* Pending Dispatches Waiting for Device ACK Banner */}
          {pendingDispatches.length > 0 && (
            <div className="flex items-center gap-2 bg-[#fbbc04]/10 border border-[#fbbc04]/30 px-2.5 py-0.5 rounded-full text-[11px] text-[#fdd663]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#fbbc04] animate-ping" />
              <span className="font-semibold">
                {pendingDispatches.length} Outbound queued for device
              </span>
              <button
                onClick={() => handleSimulateDeviceAck(pendingDispatches[0].id)}
                className="ml-1 text-[10px] bg-[#fbbc04]/20 hover:bg-[#fbbc04]/30 px-2 py-0.5 rounded-full font-bold underline transition-colors"
                title="Simulate device confirmation for testing"
              >
                Confirm Dispatch
              </button>
            </div>
          )}
        </div>

        {/* View Switcher Container */}
        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {activeView === 'chat' && (
            <div className="flex-1 flex flex-col min-h-0">
              <GeminiChatStream
                conversation={activeConversation}
                settings={settings}
                onApproveReply={handleApproveReply}
                onRejectReply={handleRejectReply}
                onRegenerateReply={() => {}}
                onRunQuickPrompt={handleRunQuickPrompt}
                onSimulateDeviceAck={handleSimulateDeviceAck}
              />

              {/* Floating Bottom Composer */}
              <GeminiComposer
                contacts={contacts}
                onSendMessage={handleComposerSend}
                disabled={settings.emergencyStop || isSyncing}
                lastMessageText={activeConversation?.lastMessage || ''}
                lastMessageCategory={activeConversation?.messages[activeConversation.messages.length - 1]?.category}
              />
            </div>
          )}

          {activeView === 'scenarios' && (
            <div className="p-4 sm:p-6 overflow-y-auto">
              <ScenariosView
                contacts={contacts}
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onExecutePipeline={handleExecutePipeline}
                onApplyPipelineResultToConversation={handleApplyPipelineResultToConversation}
              />
            </div>
          )}

          {activeView === 'settings' && (
            <div className="p-4 sm:p-6 overflow-y-auto">
              <SettingsView
                settings={settings}
                contacts={contacts}
                onUpdateSettings={handleUpdateSettings}
                onUpdateContactPermission={handleUpdateContactPermission}
                onAddContact={handleAddContact}
                onClearAllData={handleClearAllData}
              />
            </div>
          )}

          {activeView === 'activity' && (
            <div className="p-4 sm:p-6 overflow-y-auto">
              <ActivityLogView 
                logs={auditLogs} 
                onClearLogs={handleClearAllData}
              />
            </div>
          )}

          {activeView === 'architecture' && (
            <div className="p-4 sm:p-6 overflow-y-auto">
              <ArchitectureView />
            </div>
          )}

          {activeView === 'device-tests' && (
            <div className="p-4 sm:p-6 overflow-y-auto">
              <DeviceTestingSuiteView
                connectedDevice={connectedDevice}
                lastTestRun={lastTestRun}
                conversations={conversations}
                onRefreshState={fetchBackendState}
                onOpenPhoneLink={() => setIsPhoneModalOpen(true)}
                onSelectConversation={(id) => {
                  setActiveConversationId(id);
                  setActiveView('chat');
                }}
              />
            </div>
          )}
        </main>
      </div>

      {/* 3. Real Phone Link Modal */}
      <PhoneLinkModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        connectedDevice={connectedDevice}
        onRefreshState={fetchBackendState}
      />
    </div>
  );
}
