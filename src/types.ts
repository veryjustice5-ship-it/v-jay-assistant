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
  deliveryStatus?: 'received' | 'draft' | 'pending_approval' | 'simulated_sent' | 'rejected';
  transmissionId?: string;
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
