/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  INITIAL_SETTINGS, 
  INITIAL_CONTACTS, 
  INITIAL_CONVERSATIONS, 
  INITIAL_AUDIT_LOGS,
  SCENARIO_PRESETS 
} from './data/mockData';
import { 
  Conversation, 
  Contact, 
  SystemSettings, 
  AuditLogEntry, 
  PipelineExecutionResult, 
  ChannelType, 
  CommunicationStyle,
  Message 
} from './types';
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

export default function App() {
  const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  
  // Real Phone Link State
  const [isDeviceConnected, setIsDeviceConnected] = useState<boolean>(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState<boolean>(false);

  // Navigation & View State ('chat' | 'scenarios' | 'settings' | 'activity' | 'architecture')
  const [activeView, setActiveView] = useState<string>('chat');
  const [activeConversationId, setActiveConversationId] = useState<string>('conv-sarah');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

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

  // Handler: Execute Pipeline
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

    // Record in Audit Trail
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toLocaleTimeString(),
      eventType: 'MESSAGE_INGRESS',
      channel,
      senderOrRecipient: contact.name,
      actionTaken: result.decision,
      category: result.category,
      details: `[${channel.toUpperCase()}] "${text.substring(0, 60)}..." -> ${result.decision}. Reason: ${result.decisionReason}`,
      decision: result.decision,
      isSimulated: true,
    };

    setAuditLogs((prev) => [newLog, ...prev]);

    return result;
  };

  // Handler: Apply pipeline output as active conversation message
  const handleApplyPipelineResultToConversation = (result: PipelineExecutionResult) => {
    setConversations((prev) => {
      let targetConv = prev.find((c) => c.contactName === result.senderName && c.channel === result.channel);
      const isAuto = result.decision === 'AUTO_SEND_ELIGIBLE';

      const incomingMsg: Message = {
        id: result.messageId,
        conversationId: targetConv?.id || `conv-${Date.now()}`,
        senderType: 'contact',
        senderName: result.senderName,
        body: result.incomingText,
        channel: result.channel,
        timestamp: result.timestamp,
        category: result.category,
        deliveryStatus: isAuto ? 'simulated_sent' : 'pending_approval',
        transmissionId: result.simulatedTransmissionId,
        suggestedReply: {
          text: result.suggestedText,
          alternatives: result.alternatives,
          confidence: result.confidence,
          reasoning: result.classificationReason,
          requiresPersonalDecision: result.requiresPersonalDecision,
          appliedStyle: settings.communicationStyle,
          decision: result.decision,
          decisionReason: result.decisionReason,
          isAutoSent: isAuto,
          transmissionId: result.simulatedTransmissionId,
        },
      };

      if (!targetConv) {
        targetConv = {
          id: incomingMsg.conversationId,
          contactId: `contact-${Date.now()}`,
          contactName: result.senderName,
          contactPhone: '+1 (555) 987-6543',
          channel: result.channel,
          avatarColor: result.channel === 'sms' ? 'bg-[#70a6ff]' : 'bg-[#25d366]',
          lastMessage: result.incomingText,
          lastMessageTime: result.timestamp,
          unreadCount: 1,
          hasPendingApproval: !isAuto,
          messages: [incomingMsg],
        };
        return [targetConv, ...prev];
      }

      const updated = prev.map((c) => {
        if (c.id === targetConv!.id) {
          const newMessages = [...c.messages, incomingMsg];
          if (isAuto && result.suggestedText) {
            newMessages.push({
              id: `msg-reply-${Date.now()}`,
              conversationId: c.id,
              senderType: 'assistant',
              senderName: 'v jay (Auto-Sent)',
              body: result.suggestedText,
              channel: result.channel,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              deliveryStatus: 'simulated_sent',
              transmissionId: result.simulatedTransmissionId,
            });
          }

          return {
            ...c,
            lastMessage: incomingMsg.body,
            lastMessageTime: incomingMsg.timestamp,
            hasPendingApproval: !isAuto,
            messages: newMessages,
          };
        }
        return c;
      });

      return updated;
    });

    const matching = conversations.find((c) => c.contactName === result.senderName);
    if (matching) {
      setActiveConversationId(matching.id);
    }
  };

  // Handler: Approve and Send (Simulated)
  const handleApproveReply = (conversationId: string, messageId: string, replyText: string) => {
    const simTxId = `sim-manual-${Math.random().toString(36).substring(2, 9)}`;

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          const updatedMessages = c.messages.map((m) => {
            if (m.id === messageId) {
              return {
                ...m,
                deliveryStatus: 'simulated_sent' as const,
                transmissionId: simTxId,
              };
            }
            return m;
          });

          updatedMessages.push({
            id: `msg-asst-${Date.now()}`,
            conversationId,
            senderType: 'assistant',
            senderName: 'v jay (Approved)',
            body: replyText,
            channel: c.channel,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            deliveryStatus: 'simulated_sent',
            transmissionId: simTxId,
          });

          return {
            ...c,
            hasPendingApproval: false,
            messages: updatedMessages,
          };
        }
        return c;
      })
    );

    const targetConv = conversations.find((c) => c.id === conversationId);
    setAuditLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        eventType: 'MANUAL_APPROVED',
        channel: targetConv?.channel || 'sms',
        senderOrRecipient: targetConv?.contactName || 'Recipient',
        actionTaken: 'MANUAL_APPROVE_DISPATCH',
        details: `User approved reply: "${replyText.substring(0, 60)}...". Tx: ${simTxId}`,
        decision: 'AUTO_SEND_ELIGIBLE',
        isSimulated: true,
      },
      ...prev,
    ]);
  };

  // Handler: Reject Reply
  const handleRejectReply = (conversationId: string, messageId: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          const updatedMessages = c.messages.map((m) => {
            if (m.id === messageId) {
              return {
                ...m,
                deliveryStatus: 'rejected' as const,
              };
            }
            return m;
          });

          return {
            ...c,
            hasPendingApproval: false,
            messages: updatedMessages,
          };
        }
        return c;
      })
    );

    const targetConv = conversations.find((c) => c.id === conversationId);
    setAuditLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        eventType: 'REPLY_REJECTED',
        channel: targetConv?.channel || 'sms',
        senderOrRecipient: targetConv?.contactName || 'Recipient',
        actionTaken: 'USER_REJECTED_DRAFT',
        details: `User explicitly rejected draft for: ${targetConv?.contactName}`,
        decision: 'REQUIRES_APPROVAL',
        isSimulated: true,
      },
      ...prev,
    ]);
  };

  // Handler: Quick prompt from Gemini Greeting Screen
  const handleRunQuickPrompt = (scenarioId: number) => {
    const preset = SCENARIO_PRESETS.find((p) => p.id === scenarioId);
    if (!preset) return;

    let override: Partial<SystemSettings> | undefined = undefined;
    if (preset.id === 3) {
      override = { automationMode: 'restricted_auto', automationEnabled: true, emergencyStop: false };
      setSettings((s) => ({ ...s, ...override }));
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

  // Handler: Clear All Data
  const handleClearAllData = () => {
    setConversations([]);
    setAuditLogs([
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        eventType: 'CONFIG_CHANGE',
        channel: 'system',
        senderOrRecipient: 'User / Privacy Engine',
        actionTaken: 'DATA_RETENTION_PURGE',
        details: 'All stored conversation data, drafts, and historical records purged upon user request.',
        decision: 'SYSTEM_EVENT',
        isSimulated: true,
      },
    ]);
  };

  // Handler: Import Real Contacts from phone (vCard or Companion Sync)
  const handleImportRealContacts = (realContacts: Contact[]) => {
    setContacts((prev) => {
      // Avoid duplicate phones
      const existingPhones = new Set(prev.map((c) => c.phone.replace(/[^\d]/g, '')));
      const newItems = realContacts.filter((c) => !existingPhones.has(c.phone.replace(/[^\d]/g, '')));
      return [...newItems, ...prev];
    });

    // Automatically create starter conversations for these real contacts
    setConversations((prev) => {
      const existingContactIds = new Set(prev.map((c) => c.contactId));
      const starterConvs: Conversation[] = realContacts.slice(0, 5).map((c, i) => ({
        id: `conv-real-${Date.now()}-${i}`,
        contactId: c.id,
        contactName: c.name,
        contactPhone: c.phone,
        channel: c.channel,
        avatarColor: c.avatarColor,
        lastMessage: 'Linked from your real Android phone address book',
        lastMessageTime: 'Just now',
        unreadCount: 0,
        hasPendingApproval: false,
        messages: [
          {
            id: `msg-real-${Date.now()}-${i}`,
            conversationId: `conv-real-${Date.now()}-${i}`,
            senderType: 'user',
            senderName: 'You',
            body: `Phone address book contact synced: ${c.name} (${c.phone}). Ready to draft and receive real messages.`,
            channel: c.channel,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            deliveryStatus: 'received',
          },
        ],
      }));

      return [...starterConvs, ...prev];
    });

    setAuditLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        eventType: 'CONFIG_CHANGE',
        channel: 'system',
        senderOrRecipient: 'Android Address Book',
        actionTaken: 'REAL_CONTACTS_IMPORTED',
        details: `Imported ${realContacts.length} real contacts from Android device into assistant allowlist database.`,
        decision: 'SYSTEM_EVENT',
        isSimulated: false,
      },
      ...prev,
    ]);
  };

  return (
    <div className="min-h-screen bg-[#131314] text-[#e3e3e3] flex overflow-x-hidden font-sans">
      {/* Real Phone Link & vCard Contact Import Dialog */}
      <PhoneLinkModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        isDeviceConnected={isDeviceConnected}
        onSetDeviceConnected={setIsDeviceConnected}
        onImportRealContacts={handleImportRealContacts}
      />

      {/* Gemini Sidebar Rail */}
      <GeminiSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={(id) => {
          setActiveConversationId(id);
          setActiveView('chat');
        }}
        onNewSimulation={() => {
          setActiveView('chat');
          setActiveConversationId('');
        }}
        activeView={activeView}
        onSelectView={setActiveView}
        settings={settings}
        pendingCount={pendingReviewCount}
        isDeviceConnected={isDeviceConnected}
        onOpenPhoneLink={() => setIsPhoneModalOpen(true)}
      />

      {/* Main Gemini View Area (offset when sidebar open on desktop) */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ease-in-out ${
        isSidebarOpen ? 'lg:pl-72' : 'lg:pl-0'
      }`}>
        {/* Gemini Top Header */}
        <GeminiHeader
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          settings={settings}
          onUpdateSettings={(newSettings) => setSettings((s) => ({ ...s, ...newSettings }))}
          smsCount={smsCount}
          waCount={waCount}
          autoSentCount={autoSentCount}
          isDeviceConnected={isDeviceConnected}
          onOpenPhoneLink={() => setIsPhoneModalOpen(true)}
        />

        {/* View Content Switcher */}
        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {activeView === 'chat' && (
            <div className="flex-1 flex flex-col min-h-0">
              <GeminiChatStream
                conversation={activeConversation}
                settings={settings}
                onApproveReply={handleApproveReply}
                onRejectReply={handleRejectReply}
                onRegenerateReply={(convId, st) => setSettings((s) => ({ ...s, communicationStyle: st }))}
                onRunQuickPrompt={handleRunQuickPrompt}
              />
              <GeminiComposer
                contacts={contacts}
                onSendMessage={handleComposerSend}
                disabled={settings.emergencyStop}
                lastMessageText={
                  activeConversation?.messages
                    .slice()
                    .reverse()
                    .find((m) => m.senderType === 'contact')?.body
                }
                lastMessageCategory={
                  activeConversation?.messages
                    .slice()
                    .reverse()
                    .find((m) => m.senderType === 'contact')?.category
                }
              />
            </div>
          )}

          {activeView === 'scenarios' && (
            <div className="p-4 sm:p-6 flex-1">
              <ScenariosView
                contacts={contacts}
                settings={settings}
                onUpdateSettings={(newSettings) => setSettings((s) => ({ ...s, ...newSettings }))}
                onExecutePipeline={handleExecutePipeline}
                onApplyPipelineResultToConversation={handleApplyPipelineResultToConversation}
              />
            </div>
          )}

          {activeView === 'settings' && (
            <div className="p-4 sm:p-6 flex-1">
              <SettingsView
                settings={settings}
                contacts={contacts}
                onUpdateSettings={(newSettings) => setSettings((s) => ({ ...s, ...newSettings }))}
                onUpdateContactPermission={(id, perm) => {
                  setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, isPermittedForAuto: perm } : c)));
                }}
                onAddContact={(contactData) => {
                  setContacts((prev) => [...prev, { ...contactData, id: `contact-${Date.now()}` }]);
                }}
                onClearAllData={handleClearAllData}
              />
            </div>
          )}

          {activeView === 'activity' && (
            <div className="p-4 sm:p-6 flex-1">
              <ActivityLogView
                logs={auditLogs}
                onClearLogs={() => setAuditLogs([])}
              />
            </div>
          )}

          {activeView === 'architecture' && (
            <div className="p-4 sm:p-6 flex-1">
              <ArchitectureView />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
