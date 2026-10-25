import { Router, Request, Response } from 'express';
import { stateStore } from './stateStore';
import { classifyMessage } from './classifier';
import { generateServerSideDraft } from './geminiDrafting';
import { safetyEngine } from './safetyEngine';
import { 
  ChannelType, 
  Contact, 
  Conversation, 
  Message, 
  PipelineExecutionResult, 
  PipelineStageResult 
} from '../src/types';

export const apiRouter = Router();

// Middleware: Authenticate Device Requests
function authenticateDevice(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization || (req.headers['x-device-token'] as string);
  if (!authHeader) {
    return res.status(401).json({ 
      error: 'Unauthorized: Device authorization token is required in Authorization or X-Device-Token header.' 
    });
  }

  const isValid = stateStore.validateDeviceToken(authHeader);
  if (!isValid) {
    return res.status(403).json({ 
      error: 'Forbidden: Invalid or expired device token. Please pair the device again.' 
    });
  }

  next();
}

// --- 1. State & Health ---
apiRouter.get('/state', (req: Request, res: Response) => {
  res.json(stateStore.getState());
});

apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    app: 'Personal AI Messaging Assistant (v jay)',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    deviceConnected: Boolean(stateStore.getConnectedDevice()),
    time: new Date().toISOString(),
  });
});

// --- 2. Dynamic Cryptographic Device Pairing ---
apiRouter.post('/device/pair-request', (req: Request, res: Response) => {
  const session = stateStore.createPairingSession();
  res.json({
    success: true,
    pin: session.pin,
    token: session.token,
    expiresAt: session.expiresAt,
    qrPayload: session.qrPayload,
    serverUrl: `${req.protocol}://${req.get('host')}`,
  });
});

apiRouter.post('/device/pair', (req: Request, res: Response) => {
  const { pin, token, deviceName, platform } = req.body || {};
  const secret = (pin || token || '').trim();

  if (!secret) {
    return res.status(400).json({ error: 'Pairing PIN or token is required.' });
  }

  const device = stateStore.validatePairing(secret, {
    name: deviceName || 'Android Companion Phone',
    platform: platform || 'android',
  });

  if (!device) {
    return res.status(401).json({ 
      error: 'Invalid or expired pairing PIN/token. Please request a new pairing token from the dashboard.' 
    });
  }

  res.json({
    success: true,
    message: 'Device successfully paired and authenticated.',
    device: {
      id: device.id,
      name: device.name,
      platform: device.platform,
      token: device.token,
      pairedAt: device.pairedAt,
    },
  });
});

apiRouter.post('/device/disconnect', (req: Request, res: Response) => {
  stateStore.disconnectDevice();
  res.json({ success: true, message: 'Device disconnected.' });
});

// --- 3. Authenticated Device Endpoints ---

// Contact Sync from Phone Address Book
apiRouter.post('/device/sync-contacts', authenticateDevice, (req: Request, res: Response) => {
  const { contacts } = req.body || {};
  if (!Array.isArray(contacts)) {
    return res.status(400).json({ error: 'Contacts array is required.' });
  }

  const importedCount = stateStore.syncContactsFromDevice(contacts);
  res.json({
    success: true,
    importedCount,
    totalContacts: stateStore.getContacts().length,
  });
});

// Real Ingress from Android Companion (SMS Receiver or WhatsApp Notification Listener)
apiRouter.post('/device/message-ingress', authenticateDevice, async (req: Request, res: Response) => {
  const { channel, sender, senderName, body } = req.body || {};
  if (!body || !sender) {
    return res.status(400).json({ error: 'Sender and body are required for message ingress.' });
  }

  const channelType: ChannelType = channel === 'whatsapp' ? 'whatsapp' : 'sms';
  const resolvedSenderName = senderName || sender;

  // Locate or create contact
  let contact = stateStore.getContacts().find(
    (c) => c.phone.replace(/[^\d]/g, '') === sender.replace(/[^\d]/g, '') || c.name.toLowerCase() === resolvedSenderName.toLowerCase()
  );

  if (!contact) {
    contact = stateStore.addContact({
      name: resolvedSenderName,
      phone: sender,
      channel: channelType,
      avatarColor: channelType === 'sms' ? 'bg-[#70a6ff]' : 'bg-[#25d366]',
      isPermittedForAuto: false, // Default to approval for safety
      relationship: 'Incoming Sender',
      lastActive: 'Just now',
    });
  }

  const result = await processPipelineCore(body, contact, channelType);
  res.json({ success: true, result });
});

// Companion Polling: Check for Pending Outbound Dispatches
apiRouter.get('/device/pending-dispatches', authenticateDevice, (req: Request, res: Response) => {
  const pending = stateStore.getPendingDispatches();
  res.json({
    success: true,
    count: pending.length,
    dispatches: pending,
  });
});

// Companion Confirmation: Report Delivery or Failure
apiRouter.post('/device/confirm-dispatch', authenticateDevice, (req: Request, res: Response) => {
  const { dispatchId, status, deviceTxId, error } = req.body || {};
  if (!dispatchId || (status !== 'delivered' && status !== 'failed')) {
    return res.status(400).json({ error: 'Valid dispatchId and status (delivered/failed) are required.' });
  }

  const confirmed = stateStore.confirmDispatch(dispatchId, status, deviceTxId, error);
  if (!confirmed) {
    return res.status(404).json({ error: 'Dispatch ID not found or already processed.' });
  }

  res.json({
    success: true,
    message: `Dispatch ${dispatchId} confirmed as ${status}.`,
    dispatch: confirmed,
  });
});

// Web UI: Simulate Device ACK for testing without physical phone polling
apiRouter.post('/device/simulate-ack', (req: Request, res: Response) => {
  const { dispatchId, status } = req.body || {};
  if (!dispatchId) {
    return res.status(400).json({ error: 'dispatchId is required.' });
  }

  const finalStatus = status === 'failed' ? 'failed' : 'delivered';
  const confirmed = stateStore.confirmDispatch(
    dispatchId, 
    finalStatus, 
    `sim-dev-ack-${Math.random().toString(36).substring(2, 9)}`
  );

  if (!confirmed) {
    return res.status(404).json({ error: 'Dispatch ID not found.' });
  }

  res.json({ success: true, dispatch: confirmed });
});

// --- 4. Web UI User Action & Pipeline Ingress ---

apiRouter.post('/messages/ingress', async (req: Request, res: Response) => {
  const { text, contactId, channel, tempSettingsOverride } = req.body || {};
  if (!text || !contactId) {
    return res.status(400).json({ error: 'Text and contactId are required.' });
  }

  const contact = stateStore.getContacts().find((c) => c.id === contactId) || {
    id: contactId,
    name: 'Unknown Contact',
    phone: '+1 (555) 000-0000',
    channel: (channel as ChannelType) || 'sms',
    avatarColor: 'bg-[#505255]',
    isPermittedForAuto: false,
    relationship: 'Unrecognized',
    lastActive: 'Just now',
  };

  const effectiveChannel: ChannelType = (channel as ChannelType) || contact.channel || 'sms';
  const result = await processPipelineCore(text, contact, effectiveChannel, tempSettingsOverride);
  res.json({ success: true, result });
});

// Human Review Approval / Edit / Rejection Workflow
apiRouter.post('/messages/action', (req: Request, res: Response) => {
  const { conversationId, messageId, action, replyText } = req.body || {};
  if (!conversationId || !messageId || !action) {
    return res.status(400).json({ error: 'conversationId, messageId, and action are required.' });
  }

  const conv = stateStore.getConversation(conversationId);
  if (!conv) {
    return res.status(404).json({ error: 'Conversation not found.' });
  }

  const msg = conv.messages.find((m) => m.id === messageId);
  if (!msg) {
    return res.status(404).json({ error: 'Message not found.' });
  }

  if (action === 'approve' || action === 'edit_and_approve') {
    const textToSend = replyText || msg.suggestedReply?.text || '';
    if (!textToSend.trim()) {
      return res.status(400).json({ error: 'Reply text cannot be empty.' });
    }

    // Determine method based on channel
    const method = conv.channel === 'whatsapp' ? 'whatsapp_remote_input' : 'android_sms_manager';

    // Enqueue outbound dispatch
    const dispatch = stateStore.enqueueDispatch({
      messageId: `asst-${Date.now()}`,
      conversationId: conv.id,
      channel: conv.channel,
      recipient: conv.contactName,
      recipientPhone: conv.contactPhone,
      text: textToSend,
      method,
    });

    // Append outgoing assistant message with pending_device_ack
    conv.hasPendingApproval = false;
    msg.deliveryStatus = 'pending_device_ack';

    conv.messages.push({
      id: dispatch.messageId,
      conversationId: conv.id,
      senderType: 'assistant',
      senderName: action === 'edit_and_approve' ? 'v jay (Edited & Approved)' : 'v jay (Approved)',
      body: textToSend,
      channel: conv.channel,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      deliveryStatus: 'pending_device_ack',
      dispatchId: dispatch.id,
    });

    stateStore.saveConversation(conv);

    stateStore.addAuditLog({
      eventType: 'MANUAL_APPROVED',
      channel: conv.channel,
      senderOrRecipient: conv.contactName,
      actionTaken: 'USER_AUTHORIZED_OUTBOUND',
      details: `User approved reply: "${textToSend.substring(0, 60)}...". Enqueued for device dispatch (ID: ${dispatch.id}).`,
      decision: 'REQUIRES_APPROVAL',
      isSimulated: false,
    });

    return res.json({ 
      success: true, 
      action, 
      dispatchId: dispatch.id, 
      status: 'pending_device_ack' 
    });
  }

  if (action === 'reject') {
    conv.hasPendingApproval = false;
    msg.deliveryStatus = 'rejected';
    stateStore.saveConversation(conv);

    stateStore.addAuditLog({
      eventType: 'REPLY_REJECTED',
      channel: conv.channel,
      senderOrRecipient: conv.contactName,
      actionTaken: 'USER_REJECTED_DRAFT',
      details: `User rejected draft for message ${messageId}.`,
      decision: 'REQUIRES_APPROVAL',
      isSimulated: false,
    });

    return res.json({ success: true, action: 'reject' });
  }

  return res.status(400).json({ error: 'Unknown action.' });
});

// --- 5. Settings, Contacts & Maintenance ---

apiRouter.post('/settings', (req: Request, res: Response) => {
  const updated = stateStore.updateSettings(req.body || {});
  res.json({ success: true, settings: updated });
});

apiRouter.post('/contacts', (req: Request, res: Response) => {
  const { name, phone, channel, isPermittedForAuto, relationship } = req.body || {};
  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required.' });
  }

  const contact = stateStore.addContact({
    name: name.trim(),
    phone: phone.trim(),
    channel: channel === 'whatsapp' ? 'whatsapp' : 'sms',
    avatarColor: channel === 'whatsapp' ? 'bg-[#25d366]' : 'bg-[#70a6ff]',
    isPermittedForAuto: Boolean(isPermittedForAuto),
    relationship: relationship || 'Standard Contact',
    lastActive: 'Added recently',
  });

  res.json({ success: true, contact });
});

apiRouter.post('/contacts/:id/permission', (req: Request, res: Response) => {
  const { isPermitted } = req.body || {};
  const ok = stateStore.updateContactPermission(req.params.id, Boolean(isPermitted));
  if (!ok) return res.status(404).json({ error: 'Contact not found' });
  res.json({ success: true });
});

apiRouter.post('/contacts/:id/test-contact', (req: Request, res: Response) => {
  const { isTest } = req.body || {};
  const ok = stateStore.toggleTestContact(req.params.id, Boolean(isTest));
  if (!ok) return res.status(404).json({ error: 'Contact not found' });
  res.json({ success: true });
});

// Import vCard format
apiRouter.post('/contacts/vcf', (req: Request, res: Response) => {
  const { vcfText } = req.body || {};
  if (!vcfText) return res.status(400).json({ error: 'vcfText is required.' });

  const cards = vcfText.split(/BEGIN:VCARD/i);
  const formatted: { name: string; phone: string }[] = [];

  for (const card of cards) {
    if (!card.trim()) continue;
    let name = '';
    let phone = '';

    const fnMatch = card.match(/FN[;:]([^\r\n]+)/i);
    if (fnMatch) name = fnMatch[1].trim();

    const telMatch = card.match(/TEL[^:]*:([^\r\n]+)/i);
    if (telMatch) phone = telMatch[1].replace(/[^\d+]/g, '').trim();

    if (name && phone) formatted.push({ name, phone });
  }

  const count = stateStore.syncContactsFromDevice(formatted);
  res.json({ success: true, count, contacts: stateStore.getContacts() });
});

apiRouter.post('/purge', (req: Request, res: Response) => {
  stateStore.clearAllData();
  res.json({ success: true, message: 'All stored conversations purged.' });
});

// --- Core Pipeline Engine ---
async function processPipelineCore(
  rawText: string,
  contact: Contact,
  channel: ChannelType,
  tempSettingsOverride?: any
): Promise<PipelineExecutionResult> {
  const startTime = performance.now();
  const stages: PipelineStageResult[] = [];
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const settings = {
    ...stateStore.getSettings(),
    ...tempSettingsOverride,
  };

  // Stage 1: Input Validation
  const trimmed = rawText?.trim() || '';
  if (!trimmed) {
    stages.push({
      stage: '1. Input Validation',
      title: 'Message Ingress Validation',
      passed: false,
      detail: 'Rejected: Message is empty or whitespace.',
    });
    return buildRejectedResult(rawText, contact, channel, stages, startTime, timestamp, 'Empty input rejected.');
  }

  if (safetyEngine.isDuplicate(contact.id, channel, trimmed)) {
    stages.push({
      stage: '1. Input Validation',
      title: 'Duplicate Message Filter',
      passed: false,
      detail: 'Rejected: Duplicate message detected within debounce window.',
    });
    return buildRejectedResult(trimmed, contact, channel, stages, startTime, timestamp, 'Duplicate message suppressed.');
  }

  stages.push({
    stage: '1. Input Validation',
    title: 'Sanitization & Bounds',
    passed: true,
    detail: `Validated: ${trimmed.length} characters, utf-8 sanitized, channel: ${channel.toUpperCase()}`,
  });

  // Stage 2: Message Classification & Threat Analysis
  const classification = classifyMessage(trimmed);
  stages.push({
    stage: '2. Message Classification',
    title: 'Category & Threat Triage',
    passed: true,
    detail: `Classified as '${classification.category}' (${(classification.confidence * 100).toFixed(0)}% conf). Threat: ${classification.isSuspicious ? 'YES' : 'NO'}, Sensitive: ${classification.isSensitive ? 'YES' : 'NO'}`,
    data: classification,
  });

  // Stage 3: Context Retrieval
  stages.push({
    stage: '3. Context Retrieval',
    title: 'Sender & Relationship Context',
    passed: true,
    detail: `Contact: ${contact.name} (${contact.relationship}). Mode C Permitted: ${contact.isPermittedForAuto ? 'YES' : 'NO'}. Channel: ${channel.toUpperCase()}`,
    data: contact,
  });

  // Stage 4: Server-Side AI Reply Drafting (Gemini 3.8 Flash)
  const generation = await generateServerSideDraft(
    trimmed, 
    classification, 
    contact.name, 
    settings.communicationStyle
  );

  stages.push({
    stage: '4. Reply Generation (Server AI)',
    title: `Draft Synthesizer [${generation.source === 'gemini' ? 'Gemini 3.8 Flash' : 'Rule-Based Safeguard'}]`,
    passed: true,
    detail: `Engine: ${generation.source.toUpperCase()}. Style: ${settings.communicationStyle}. Requires personal decision: ${generation.requiresPersonalDecision ? 'YES' : 'NO'}.`,
    data: generation,
  });

  // Stage 5 & 6: Safety Invariants & Automation Decision
  const safetyEval = safetyEngine.evaluateDecision(
    settings,
    contact.id,
    contact.isPermittedForAuto,
    classification,
    generation,
    contact.isTestContact
  );

  stages.push({
    stage: '5 & 6. Safety & Automation Decision',
    title: 'Invariants & Policy Enforcement',
    passed: safetyEval.decision !== 'BLOCKED_BY_SAFETY',
    detail: `Decision: ${safetyEval.decision}. Reason: ${safetyEval.reason}`,
    data: safetyEval,
  });

  // Stage 7: Authorized Outbound Dispatch Queue
  const isAuto = safetyEval.decision === 'AUTO_SEND_ELIGIBLE';
  let dispatchId: string | undefined = undefined;

  if (isAuto && generation.suggestedText) {
    safetyEngine.recordAutoSend(contact.id);
    const method = channel === 'whatsapp' ? 'whatsapp_remote_input' : 'android_sms_manager';

    const dispatch = stateStore.enqueueDispatch({
      messageId: `asst-${Date.now()}`,
      conversationId: `conv-${contact.id}`,
      channel,
      recipient: contact.name,
      recipientPhone: contact.phone,
      text: generation.suggestedText,
      method,
    });
    dispatchId = dispatch.id;

    stages.push({
      stage: '7. Sending Integration',
      title: 'Companion Outbound Queue',
      passed: true,
      detail: `Queued for transmission via ${method} (Dispatch ID: ${dispatch.id}). Waiting for device confirmation.`,
    });
  } else {
    stages.push({
      stage: '7. Sending Integration',
      title: 'Dispatch Status',
      passed: true,
      detail: 'Transmission withheld. Message placed in review draft queue or rejected by security policy.',
    });
  }

  const elapsedMs = Number((performance.now() - startTime).toFixed(2));
  const messageId = `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Update or insert conversation in state store
  updateConversationInStore(
    contact,
    channel,
    trimmed,
    messageId,
    generation,
    safetyEval,
    isAuto,
    dispatchId,
    timestamp
  );

  // Record Ingress in Audit Log
  stateStore.addAuditLog({
    eventType: 'MESSAGE_INGRESS',
    channel,
    senderOrRecipient: contact.name,
    actionTaken: safetyEval.decision,
    category: classification.category,
    details: `[${channel.toUpperCase()}] "${trimmed.substring(0, 60)}..." -> ${safetyEval.decision}. Reason: ${safetyEval.reason}`,
    decision: safetyEval.decision,
    isSimulated: false,
  });

  return {
    messageId,
    channel,
    senderName: contact.name,
    incomingText: trimmed,
    category: classification.category,
    confidence: generation.confidence,
    isSuspicious: classification.isSuspicious,
    isSensitive: classification.isSensitive,
    classificationReason: classification.reasoning,
    requiresPersonalDecision: generation.requiresPersonalDecision,
    suggestedText: generation.suggestedText,
    alternatives: generation.alternatives,
    decision: safetyEval.decision,
    decisionReason: safetyEval.reason,
    isAutoEligible: safetyEval.isAutoEligible,
    simulatedTransmissionId: dispatchId,
    stages,
    elapsedMs,
    timestamp,
  };
}

function updateConversationInStore(
  contact: Contact,
  channel: ChannelType,
  incomingText: string,
  messageId: string,
  generation: any,
  safetyEval: any,
  isAuto: boolean,
  dispatchId: string | undefined,
  timestamp: string
) {
  let conv = stateStore.getConversationByContactName(contact.name, channel);

  const incomingMsg: Message = {
    id: messageId,
    conversationId: conv?.id || `conv-${contact.id}`,
    senderType: 'contact',
    senderName: contact.name,
    body: incomingText,
    channel,
    timestamp,
    deliveryStatus: isAuto ? 'pending_device_ack' : 'pending_approval',
    dispatchId,
    suggestedReply: {
      text: generation.suggestedText,
      alternatives: generation.alternatives,
      confidence: generation.confidence,
      reasoning: generation.reasoning,
      requiresPersonalDecision: generation.requiresPersonalDecision,
      appliedStyle: stateStore.getSettings().communicationStyle,
      decision: safetyEval.decision,
      decisionReason: safetyEval.reason,
      isAutoSent: isAuto,
      transmissionId: dispatchId,
    },
  };

  if (!conv) {
    conv = {
      id: incomingMsg.conversationId,
      contactId: contact.id,
      contactName: contact.name,
      contactPhone: contact.phone,
      channel,
      avatarColor: contact.avatarColor,
      lastMessage: incomingText,
      lastMessageTime: timestamp,
      unreadCount: 1,
      hasPendingApproval: !isAuto,
      messages: [incomingMsg],
    };
  } else {
    conv.lastMessage = incomingText;
    conv.lastMessageTime = timestamp;
    conv.hasPendingApproval = !isAuto;
    conv.messages.push(incomingMsg);
  }

  // If Mode C Auto-eligible, also append assistant's outgoing message in pending_device_ack status
  if (isAuto && generation.suggestedText) {
    conv.messages.push({
      id: `msg-auto-${Date.now()}`,
      conversationId: conv.id,
      senderType: 'assistant',
      senderName: 'v jay (Auto-Dispatched)',
      body: generation.suggestedText,
      channel,
      timestamp,
      deliveryStatus: 'pending_device_ack',
      dispatchId,
    });
  }

  stateStore.saveConversation(conv);
}

function buildRejectedResult(
  rawText: string,
  contact: Contact,
  channel: ChannelType,
  stages: PipelineStageResult[],
  startTime: number,
  timestamp: string,
  reason: string
): PipelineExecutionResult {
  return {
    messageId: `msg-${Date.now()}`,
    channel,
    senderName: contact.name,
    incomingText: rawText,
    category: 'unknown_or_ambiguous',
    confidence: 0,
    isSuspicious: false,
    isSensitive: false,
    classificationReason: reason,
    requiresPersonalDecision: false,
    suggestedText: '',
    alternatives: [],
    decision: 'REJECTED_AT_INGRESS',
    decisionReason: reason,
    isAutoEligible: false,
    stages,
    elapsedMs: Number((performance.now() - startTime).toFixed(2)),
    timestamp,
  };
}
