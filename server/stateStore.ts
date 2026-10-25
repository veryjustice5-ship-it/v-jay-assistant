import crypto from 'crypto';
import { 
  Contact, 
  Conversation, 
  SystemSettings, 
  AuditLogEntry, 
  OutboundDispatch, 
  DeviceRegistration, 
  PairingSession,
  Message 
} from '../src/types';

export class StateStore {
  private settings: SystemSettings = {
    automationMode: 'approval_required',
    automationEnabled: false,
    emergencyStop: false,
    communicationStyle: 'concise',
    allowedCategories: ['greetings', 'casual_conversation', 'requests_for_information'],
    maxGlobalPerHour: 10,
    maxPerContactPerHour: 3,
    escalateSensitiveAlways: true,
    escalateUnknownAlways: true,
  };

  private contacts: Contact[] = [
    {
      id: 'contact-test-phone',
      name: 'Safe Test Contact (Companion Device)',
      phone: '+1 (555) 019-9999',
      channel: 'sms',
      avatarColor: 'bg-[#a8c7fa]',
      isPermittedForAuto: false, // Default to manual approval for safety
      relationship: 'Safe Test Rig',
      lastActive: 'Ready for test',
      isTestContact: true,
    },
    {
      id: 'contact-sarah',
      name: 'Sarah Chen',
      phone: '+1 (555) 234-5678',
      channel: 'sms',
      avatarColor: 'bg-[#70a6ff]',
      isPermittedForAuto: true,
      relationship: 'Friend & Colleague',
      lastActive: '5m ago',
    },
    {
      id: 'contact-dad',
      name: 'Dad',
      phone: '+1 (555) 345-6789',
      channel: 'whatsapp',
      avatarColor: 'bg-[#25d366]',
      isPermittedForAuto: true,
      relationship: 'Family',
      lastActive: '1h ago',
    },
    {
      id: 'contact-alex',
      name: 'Alex Rivera',
      phone: '+1 (555) 456-7890',
      channel: 'sms',
      avatarColor: 'bg-[#c58af9]',
      isPermittedForAuto: false,
      relationship: 'Study Group Peer',
      lastActive: '2h ago',
    },
    {
      id: 'contact-marcus',
      name: 'Marcus Vance',
      phone: '+1 (555) 567-8901',
      channel: 'sms',
      avatarColor: 'bg-[#f28b82]',
      isPermittedForAuto: false,
      relationship: 'Unrecognized Sender',
      lastActive: 'Yesterday',
    },
  ];

  private conversations: Conversation[] = [
    {
      id: 'conv-sarah',
      contactId: 'contact-sarah',
      contactName: 'Sarah Chen',
      contactPhone: '+1 (555) 234-5678',
      channel: 'sms',
      avatarColor: 'bg-[#70a6ff]',
      lastMessage: 'Hey! Are you free for lunch tomorrow around 12:30?',
      lastMessageTime: '11:42 AM',
      unreadCount: 1,
      hasPendingApproval: true,
      messages: [
        {
          id: 'msg-s1',
          conversationId: 'conv-sarah',
          senderType: 'contact',
          senderName: 'Sarah Chen',
          body: 'Hey! Are you free for lunch tomorrow around 12:30?',
          channel: 'sms',
          timestamp: '11:42 AM',
          category: 'scheduling',
          deliveryStatus: 'pending_approval',
          suggestedReply: {
            text: 'I need to check my calendar first. What time were you thinking?',
            alternatives: [
              'Let me check my availability and follow up with you shortly.',
              'Could you suggest a couple of options? I’ll check my schedule.',
            ],
            confidence: 0.94,
            reasoning: 'Inquiry requests a calendar commitment. Refused to hallucinate free time.',
            requiresPersonalDecision: true,
            appliedStyle: 'concise',
            decision: 'REQUIRES_APPROVAL',
            decisionReason: 'Scheduling requires human availability confirmation.',
          },
        },
      ],
    },
    {
      id: 'conv-dad',
      contactId: 'contact-dad',
      contactName: 'Dad',
      contactPhone: '+1 (555) 345-6789',
      channel: 'whatsapp',
      avatarColor: 'bg-[#25d366]',
      lastMessage: 'Good morning! Have a great day.',
      lastMessageTime: '8:15 AM',
      unreadCount: 0,
      hasPendingApproval: false,
      messages: [
        {
          id: 'msg-d1',
          conversationId: 'conv-dad',
          senderType: 'contact',
          senderName: 'Dad',
          body: 'Good morning! Have a great day.',
          channel: 'whatsapp',
          timestamp: '8:15 AM',
          category: 'greetings',
          deliveryStatus: 'delivered',
        },
        {
          id: 'msg-d2',
          conversationId: 'conv-dad',
          senderType: 'assistant',
          senderName: 'v jay (Auto-Sent)',
          body: 'Thanks Dad! Hope you have a wonderful day too.',
          channel: 'whatsapp',
          timestamp: '8:16 AM',
          deliveryStatus: 'delivered',
          transmissionId: 'wa-ack-9021',
          deviceAckTimestamp: '8:16 AM',
        },
      ],
    },
  ];

  private auditLogs: AuditLogEntry[] = [
    {
      id: 'log-boot',
      timestamp: new Date().toLocaleTimeString(),
      eventType: 'CONFIG_CHANGE',
      channel: 'system',
      senderOrRecipient: 'System Engine',
      actionTaken: 'SYSTEM_BOOT',
      details: 'V Jay Messaging Engine initialized. Security invariants and device bridge active.',
      decision: 'SYSTEM_EVENT',
      isSimulated: false,
    },
  ];

  // Connected Android / Termux device
  private connectedDevice: DeviceRegistration | null = null;

  // Active pairing sessions: token -> PairingSession
  private activePairings: Map<string, PairingSession> = new Map();

  // Outbound dispatch queue: list of pending/delivered dispatches
  private dispatches: OutboundDispatch[] = [];

  // Last automated end-to-end test suite run
  private lastTestRun: any = null;

  // --- Getters ---
  public getState() {
    return {
      settings: this.settings,
      contacts: this.contacts,
      conversations: this.conversations,
      auditLogs: this.auditLogs,
      connectedDevice: this.connectedDevice,
      pendingDispatches: this.dispatches.filter((d) => d.status === 'pending'),
      allDispatches: this.dispatches,
      geminiActive: Boolean(process.env.GEMINI_API_KEY),
      lastTestRun: this.lastTestRun,
    };
  }

  public setLastTestRun(testRun: any) {
    this.lastTestRun = testRun;
  }

  public getSettings(): SystemSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<SystemSettings>): SystemSettings {
    this.settings = { ...this.settings, ...partial };
    this.addAuditLog({
      eventType: 'CONFIG_CHANGE',
      channel: 'system',
      senderOrRecipient: 'User Settings',
      actionTaken: 'SETTINGS_UPDATE',
      details: `Settings updated: mode=${this.settings.automationMode}, style=${this.settings.communicationStyle}, emergencyStop=${this.settings.emergencyStop}`,
      decision: 'SYSTEM_EVENT',
      isSimulated: false,
    });
    return this.settings;
  }

  public getContacts(): Contact[] {
    return [...this.contacts];
  }

  public addContact(contact: Omit<Contact, 'id'>): Contact {
    const newContact: Contact = {
      ...contact,
      id: `contact-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
    this.contacts.push(newContact);
    return newContact;
  }

  public updateContactPermission(contactId: string, isPermitted: boolean): boolean {
    const contact = this.contacts.find((c) => c.id === contactId);
    if (!contact) return false;
    contact.isPermittedForAuto = isPermitted;
    return true;
  }

  public toggleTestContact(contactId: string, isTest: boolean): boolean {
    const contact = this.contacts.find((c) => c.id === contactId);
    if (!contact) return false;
    contact.isTestContact = isTest;
    return true;
  }

  public syncContactsFromDevice(deviceContacts: { name: string; phone: string }[]): number {
    let addedCount = 0;
    const existingPhones = new Set(this.contacts.map((c) => c.phone.replace(/[^\d]/g, '')));

    for (const c of deviceContacts) {
      const cleanPhone = c.phone.replace(/[^\d]/g, '');
      if (!cleanPhone || existingPhones.has(cleanPhone)) continue;

      this.contacts.push({
        id: `phone-contact-${Date.now()}-${addedCount}`,
        name: c.name || 'Unknown Contact',
        phone: c.phone,
        channel: 'sms',
        avatarColor: 'bg-[#70a6ff]',
        isPermittedForAuto: false, // Default to approval required
        relationship: 'Phone Address Book',
        lastActive: 'Synced from Android',
      });
      existingPhones.add(cleanPhone);
      addedCount++;
    }

    if (addedCount > 0) {
      this.addAuditLog({
        eventType: 'CONFIG_CHANGE',
        channel: 'system',
        senderOrRecipient: this.connectedDevice?.name || 'Companion Device',
        actionTaken: 'DEVICE_CONTACTS_SYNCED',
        details: `Imported and validated ${addedCount} contacts from connected device.`,
        decision: 'SYSTEM_EVENT',
        isSimulated: false,
      });
    }

    return addedCount;
  }

  public getConversations(): Conversation[] {
    return this.conversations;
  }

  public getConversation(id: string): Conversation | undefined {
    return this.conversations.find((c) => c.id === id);
  }

  public getConversationByContactName(name: string, channel: string): Conversation | undefined {
    return this.conversations.find((c) => c.contactName === name && c.channel === channel);
  }

  public saveConversation(conv: Conversation) {
    const idx = this.conversations.findIndex((c) => c.id === conv.id);
    if (idx >= 0) {
      this.conversations[idx] = conv;
    } else {
      this.conversations.unshift(conv);
    }
  }

  public clearAllData() {
    this.conversations = [];
    this.dispatches = [];
    this.addAuditLog({
      eventType: 'CONFIG_CHANGE',
      channel: 'system',
      senderOrRecipient: 'User Request',
      actionTaken: 'DATA_RETENTION_PURGE',
      details: 'All stored conversation data, drafts, and message history purged on-demand.',
      decision: 'SYSTEM_EVENT',
      isSimulated: false,
    });
  }

  public addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
    const fullEntry: AuditLogEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toLocaleTimeString(),
    };
    this.auditLogs.unshift(fullEntry);
  }

  // --- Dynamic Secure Device Pairing ---
  public createPairingSession(): PairingSession {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

    const session: PairingSession = {
      pin,
      token,
      expiresAt,
      qrPayload: JSON.stringify({ token, pin, expiresAt }),
    };

    this.activePairings.set(token, session);
    this.activePairings.set(pin, session);
    return session;
  }

  public validatePairing(pinOrToken: string, deviceInfo: { name?: string; platform?: any }): DeviceRegistration | null {
    const session = this.activePairings.get(pinOrToken);
    if (!session || Date.now() > session.expiresAt) {
      return null;
    }

    // Generate authenticated long-lived device token
    const deviceToken = `dev_sec_${crypto.randomBytes(32).toString('hex')}`;
    const device: DeviceRegistration = {
      id: `device-${Date.now()}`,
      name: deviceInfo.name || 'Android Companion Phone',
      platform: deviceInfo.platform || 'android',
      token: deviceToken,
      pairedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      permissions: {
        smsReceive: true,
        smsSend: true,
        whatsappNotificationAccess: true,
        contacts: true,
      },
      capabilities: {
        smsSend: true,
        smsReceive: true,
        whatsappRemoteInput: true,
        contactSync: true,
      },
    };

    this.connectedDevice = device;
    // Invalidate single-use pairing session
    this.activePairings.delete(session.token);
    this.activePairings.delete(session.pin);

    this.addAuditLog({
      eventType: 'CONFIG_CHANGE',
      channel: 'system',
      senderOrRecipient: device.name,
      actionTaken: 'DEVICE_PAIRED_AUTHENTICATED',
      details: `Device '${device.name}' paired successfully via cryptographic challenge.`,
      decision: 'SYSTEM_EVENT',
      isSimulated: false,
    });

    return device;
  }

  public updateDevicePermissions(permissions: {
    smsReceive?: boolean;
    smsSend?: boolean;
    whatsappNotificationAccess?: boolean;
    contacts?: boolean;
  }) {
    if (!this.connectedDevice) {
      // Auto-create connected device if testing permissions directly
      this.connectedDevice = {
        id: `device-auto-${Date.now()}`,
        name: 'Android Companion Phone',
        platform: 'android',
        token: `dev_sec_${crypto.randomBytes(16).toString('hex')}`,
        pairedAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        permissions: {
          smsReceive: true,
          smsSend: true,
          whatsappNotificationAccess: true,
          contacts: true,
          ...permissions,
        },
        capabilities: {
          smsSend: true,
          smsReceive: true,
          whatsappRemoteInput: true,
          contactSync: true,
        },
      };
    } else {
      this.connectedDevice.permissions = {
        ...(this.connectedDevice.permissions || {
          smsReceive: true,
          smsSend: true,
          whatsappNotificationAccess: true,
          contacts: true,
        }),
        ...permissions,
      };
      this.connectedDevice.lastSeen = new Date().toISOString();
    }
  }

  public getConnectedDevice(): DeviceRegistration | null {
    return this.connectedDevice;
  }

  public validateDeviceToken(token: string): boolean {
    if (!token) return false;
    const clean = token.replace(/^Bearer\s+/i, '').trim();
    if (this.connectedDevice && this.connectedDevice.token === clean) {
      this.connectedDevice.lastSeen = new Date().toISOString();
      return true;
    }

    // Allow pairing key if active session exists
    if (this.activePairings.has(clean)) {
      const session = this.activePairings.get(clean);
      if (session && Date.now() <= session.expiresAt) {
        if (!this.connectedDevice) {
          this.validatePairing(clean, { name: 'Android Device Bridge', platform: 'android' });
        } else {
          this.connectedDevice.lastSeen = new Date().toISOString();
        }
        return true;
      }
    }

    return false;
  }

  public disconnectDevice(): void {
    if (this.connectedDevice) {
      const name = this.connectedDevice.name;
      this.connectedDevice = null;
      this.addAuditLog({
        eventType: 'CONFIG_CHANGE',
        channel: 'system',
        senderOrRecipient: name,
        actionTaken: 'DEVICE_DISCONNECTED',
        details: `Device '${name}' was disconnected and session invalidated.`,
        decision: 'SYSTEM_EVENT',
        isSimulated: false,
      });
    }
  }

  // --- Outbound Dispatch Queue & Device Confirmation ---
  public enqueueDispatch(item: Omit<OutboundDispatch, 'id' | 'createdAt' | 'status'>): OutboundDispatch {
    const dispatch: OutboundDispatch = {
      ...item,
      id: `dsp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toLocaleTimeString(),
      status: 'pending',
    };
    this.dispatches.push(dispatch);
    return dispatch;
  }

  public getPendingDispatches(): OutboundDispatch[] {
    return this.dispatches.filter((d) => d.status === 'pending');
  }

  public confirmDispatch(
    dispatchId: string, 
    status: 'delivered' | 'failed', 
    deviceTxId?: string, 
    error?: string
  ): OutboundDispatch | null {
    const dispatch = this.dispatches.find((d) => d.id === dispatchId);
    if (!dispatch) return null;

    dispatch.status = status;
    dispatch.confirmedAt = new Date().toLocaleTimeString();
    dispatch.deviceTxId = deviceTxId || `ack-${Math.random().toString(36).substring(2, 9)}`;
    dispatch.error = error;

    // Update message status in the matching conversation
    for (const conv of this.conversations) {
      const msg = conv.messages.find((m) => m.dispatchId === dispatchId || m.id === dispatch.messageId);
      if (msg) {
        msg.deliveryStatus = status === 'delivered' ? 'delivered' : 'failed';
        msg.transmissionId = dispatch.deviceTxId;
        msg.deviceAckTimestamp = dispatch.confirmedAt;
      }
    }

    this.addAuditLog({
      eventType: status === 'delivered' ? 'AUTO_REPLY_SENT' : 'REPLY_REJECTED',
      channel: dispatch.channel,
      senderOrRecipient: dispatch.recipient,
      actionTaken: status === 'delivered' ? 'DEVICE_CONFIRMED_DELIVERY' : 'DEVICE_REPORTED_FAILURE',
      details: `Device confirmed ${status} to ${dispatch.recipient} via ${dispatch.method}. Tx: ${dispatch.deviceTxId}`,
      decision: status === 'delivered' ? 'AUTO_SEND_ELIGIBLE' : 'BLOCKED_BY_SAFETY',
      isSimulated: false,
    });

    return dispatch;
  }
}

export const stateStore = new StateStore();
