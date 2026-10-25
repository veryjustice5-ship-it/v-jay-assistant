export type ChannelType = 'sms' | 'whatsapp';

export type AutomationMode = 'draft_only' | 'approval_required' | 'restricted_auto';

export type CommunicationStyle = 'concise' | 'casual' | 'professional' | 'direct';

export type PipelineDecision = 
  | 'AUTO_SEND_ELIGIBLE' 
  | 'REQUIRES_APPROVAL' 
  | 'DRAFT_ONLY' 
  | 'BLOCKED_BY_SAFETY'
  | 'REJECTED_AT_INGRESS';

export type MessageCategory = 
  | 'greetings'
  | 'casual_conversation'
  | 'questions'
  | 'school_related'
  | 'work_related'
  | 'scheduling'
  | 'requests_for_information'
  | 'business_inquiries'
  | 'unknown_or_ambiguous'
  | 'sensitive_personal'
  | 'suspicious_messages';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  channel: ChannelType;
  avatarColor: string;
  isPermittedForAuto: boolean; // For Mode C
  relationship: string;
  lastActive: string;
  isTestContact?: boolean; // For safe testing workflow
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: 'contact' | 'user' | 'assistant';
  senderName: string;
  body: string;
  channel: ChannelType;
  timestamp: string;
  category?: MessageCategory;
  isFlagged?: boolean;
  flagReason?: string;
  deliveryStatus?: 'received' | 'draft' | 'pending_approval' | 'pending_device_ack' | 'delivered' | 'simulated_sent' | 'rejected' | 'failed';
  transmissionId?: string;
  dispatchId?: string;
  deviceAckTimestamp?: string;
  suggestedReply?: SuggestedReply;
}

export interface SuggestedReply {
  text: string;
  alternatives: string[];
  confidence: number;
  reasoning: string;
  requiresPersonalDecision: boolean;
  appliedStyle: CommunicationStyle;
  decision: PipelineDecision;
  decisionReason: string;
  isAutoSent?: boolean;
  transmissionId?: string;
}

export interface Conversation {
  id: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  channel: ChannelType;
  avatarColor: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  hasPendingApproval: boolean;
  messages: Message[];
}

export interface PipelineStageResult {
  stage: string;
  title: string;
  passed: boolean;
  detail: string;
  data?: any;
}

export interface PipelineExecutionResult {
  messageId: string;
  channel: ChannelType;
  senderName: string;
  incomingText: string;
  category: MessageCategory;
  confidence: number;
  isSuspicious: boolean;
  isSensitive: boolean;
  classificationReason: string;
  requiresPersonalDecision: boolean;
  suggestedText: string;
  alternatives: string[];
  decision: PipelineDecision;
  decisionReason: string;
  isAutoEligible: boolean;
  simulatedTransmissionId?: string;
  stages: PipelineStageResult[];
  elapsedMs: number;
  timestamp: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  eventType: 'MESSAGE_INGRESS' | 'AUTO_REPLY_SENT' | 'MANUAL_APPROVED' | 'REPLY_REJECTED' | 'EMERGENCY_TRIGGER' | 'CONFIG_CHANGE';
  channel: ChannelType | 'system';
  senderOrRecipient: string;
  actionTaken: string;
  category?: string;
  details: string;
  decision: PipelineDecision | 'SYSTEM_EVENT';
  isSimulated: boolean;
}

export interface SystemSettings {
  automationMode: AutomationMode;
  automationEnabled: boolean;
  emergencyStop: boolean;
  communicationStyle: CommunicationStyle;
  allowedCategories: MessageCategory[];
  maxGlobalPerHour: number;
  maxPerContactPerHour: number;
  escalateSensitiveAlways: boolean;
  escalateUnknownAlways: boolean;
}

export interface OutboundDispatch {
  id: string;
  messageId: string;
  conversationId: string;
  channel: ChannelType;
  recipient: string;
  recipientPhone: string;
  text: string;
  status: 'pending' | 'delivered' | 'failed';
  method: 'android_sms_manager' | 'whatsapp_remote_input' | 'simulated';
  createdAt: string;
  confirmedAt?: string;
  deviceTxId?: string;
  error?: string;
}

export interface DevicePermissions {
  smsReceive: boolean;
  smsSend: boolean;
  whatsappNotificationAccess: boolean;
  contacts: boolean;
}

export interface DeviceRegistration {
  id: string;
  name: string;
  platform: 'android' | 'termux' | 'emulator' | 'other';
  token: string;
  pairedAt: string;
  lastSeen: string;
  permissions?: DevicePermissions;
  capabilities: {
    smsSend: boolean;
    smsReceive: boolean;
    whatsappRemoteInput: boolean;
    contactSync: boolean;
  };
}

export interface PairingSession {
  pin: string;
  token: string;
  expiresAt: number;
  qrPayload: string;
}

export interface E2ETestStageResult {
  id: string;
  name: string;
  description: string;
  passed: boolean;
  details: string;
  timestamp: string;
  evidence?: any;
}

export interface E2ETestSuiteResult {
  allPassed: boolean;
  timestamp: string;
  stages: E2ETestStageResult[];
}

export interface ServerStateResponse {
  contacts: Contact[];
  conversations: Conversation[];
  settings: SystemSettings;
  auditLogs: AuditLogEntry[];
  connectedDevice: DeviceRegistration | null;
  pendingDispatches: OutboundDispatch[];
  activePairing: PairingSession | null;
  geminiActive: boolean;
  lastTestRun?: E2ETestSuiteResult | null;
}

