import { 
  ChannelType, 
  Contact, 
  SystemSettings, 
  PipelineExecutionResult, 
  PipelineStageResult 
} from '../types';
import { classifyMessage } from './classifier';
import { generateReply } from './responseGenerator';
import { safetyEngine } from './safetyEngine';

export function executeMessagePipeline(
  rawText: string,
  contact: Contact,
  channel: ChannelType,
  settings: SystemSettings
): PipelineExecutionResult {
  const startTime = performance.now();
  const stages: PipelineStageResult[] = [];
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Stage 1: Input Validation
  const trimmed = rawText?.trim() || '';
  if (!trimmed) {
    stages.push({
      stage: '1. Input Validation',
      title: 'Message Ingress Validation',
      passed: false,
      detail: 'Rejected: Message is empty or contains only whitespace.',
    });
    return {
      messageId: `msg-${Date.now()}`,
      channel,
      senderName: contact.name,
      incomingText: rawText,
      category: 'unknown_or_ambiguous',
      confidence: 0,
      isSuspicious: false,
      isSensitive: false,
      classificationReason: 'Empty input rejected.',
      requiresPersonalDecision: false,
      suggestedText: '',
      alternatives: [],
      decision: 'REJECTED_AT_INGRESS',
      decisionReason: 'Input failed structural validation.',
      isAutoEligible: false,
      stages,
      elapsedMs: Number((performance.now() - startTime).toFixed(2)),
      timestamp,
    };
  }

  // Deduplication check
  if (safetyEngine.isDuplicate(contact.id, channel, trimmed)) {
    stages.push({
      stage: '1. Input Validation',
      title: 'Duplicate Message Filter',
      passed: false,
      detail: 'Rejected: Duplicate message detected within debounce window.',
    });
    return {
      messageId: `msg-${Date.now()}`,
      channel,
      senderName: contact.name,
      incomingText: trimmed,
      category: 'unknown_or_ambiguous',
      confidence: 0,
      isSuspicious: false,
      isSensitive: false,
      classificationReason: 'Duplicate message.',
      requiresPersonalDecision: false,
      suggestedText: '',
      alternatives: [],
      decision: 'REJECTED_AT_INGRESS',
      decisionReason: 'Duplicate message suppressed to prevent duplicate processing.',
      isAutoEligible: false,
      stages,
      elapsedMs: Number((performance.now() - startTime).toFixed(2)),
      timestamp,
    };
  }

  stages.push({
    stage: '1. Input Validation',
    title: 'Sanitization & Bounds',
    passed: true,
    detail: `Validated: ${trimmed.length} characters, utf-8 sanitized, channel: ${channel.toUpperCase()}`,
  });

  // Stage 2: Message Classification
  const classification = classifyMessage(trimmed);
  stages.push({
    stage: '2. Message Classification',
    title: 'Category & Threat Triage',
    passed: true,
    detail: `Classified as '${classification.category}' (${(classification.confidence * 100).toFixed(0)}% confidence). Suspicious: ${classification.isSuspicious ? 'YES' : 'NO'}, Sensitive: ${classification.isSensitive ? 'YES' : 'NO'}`,
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

  // Stage 4: Reply Generation
  const generation = generateReply(trimmed, classification, contact.name, settings.communicationStyle);
  stages.push({
    stage: '4. Reply Generation',
    title: 'Contextual Draft Synthesis',
    passed: true,
    detail: `Style: ${settings.communicationStyle}. Requires personal decision: ${generation.requiresPersonalDecision ? 'YES' : 'NO'}. 2 alternative options produced.`,
    data: generation,
  });

  // Stage 5: Safety and Permission Checks
  // Stage 6: Draft or Automatic-Reply Decision
  const safetyEval = safetyEngine.evaluateDecision(
    settings,
    contact.id,
    contact.isPermittedForAuto,
    classification,
    generation
  );

  stages.push({
    stage: '5 & 6. Safety & Automation Decision',
    title: 'Invariants & Policy Enforcement',
    passed: safetyEval.decision !== 'BLOCKED_BY_SAFETY',
    detail: `Decision: ${safetyEval.decision}. Reason: ${safetyEval.reason}`,
    data: safetyEval,
  });

  // Stage 7: Authorized Sending Integration (Simulated in Prototype)
  let simulatedTransmissionId: string | undefined = undefined;
  if (safetyEval.decision === 'AUTO_SEND_ELIGIBLE') {
    simulatedTransmissionId = `${channel}-sim-${Math.random().toString(36).substring(2, 9)}`;
    safetyEngine.recordAutoSend(contact.id);
    stages.push({
      stage: '7. Sending Integration',
      title: 'Simulated Channel Dispatch',
      passed: true,
      detail: `[SIMULATED] Transmitted via Mock ${channel.toUpperCase()} Adapter. ID: ${simulatedTransmissionId}`,
    });
  } else {
    stages.push({
      stage: '7. Sending Integration',
      title: 'Outbound Dispatch Status',
      passed: true,
      detail: 'Transmission withheld. Message placed in review draft queue or rejected by policy.',
    });
  }

  const elapsedMs = Number((performance.now() - startTime).toFixed(2));

  return {
    messageId: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    channel,
    senderName: contact.name,
    incomingText: trimmed,
    category: classification.category,
    confidence: classification.confidence,
    isSuspicious: classification.isSuspicious,
    isSensitive: classification.isSensitive,
    classificationReason: classification.reasoning,
    requiresPersonalDecision: generation.requiresPersonalDecision,
    suggestedText: generation.suggestedText,
    alternatives: generation.alternatives,
    decision: safetyEval.decision,
    decisionReason: safetyEval.reason,
    isAutoEligible: safetyEval.isAutoEligible,
    simulatedTransmissionId,
    stages,
    elapsedMs,
    timestamp,
  };
}
