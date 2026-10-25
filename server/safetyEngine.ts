import { PipelineDecision, SystemSettings } from '../src/types';
import { ClassificationResult } from './classifier';
import { AIDraftResult } from './geminiDrafting';

export interface SafetyEvaluationResult {
  decision: PipelineDecision;
  reason: string;
  isAutoEligible: boolean;
  rateLimitRemaining: number;
}

export class SafetyEngine {
  private autoSendTimestampsByContact: Map<string, number[]> = new Map();
  private globalAutoSendTimestamps: number[] = [];
  private recentMessages: Map<string, { text: string; timestamp: number }> = new Map();

  public isDuplicate(contactId: string, channel: string, text: string): boolean {
    const key = `${contactId}-${channel}`;
    const prev = this.recentMessages.get(key);
    const now = Date.now();

    if (prev && prev.text.trim().toLowerCase() === text.trim().toLowerCase()) {
      if (now - prev.timestamp < 15000) {
        return true;
      }
    }

    this.recentMessages.set(key, { text, timestamp: now });
    return false;
  }

  public recordAutoSend(contactId: string): void {
    const now = Date.now();
    this.globalAutoSendTimestamps.push(now);

    const contactTimestamps = this.autoSendTimestampsByContact.get(contactId) || [];
    contactTimestamps.push(now);
    this.autoSendTimestampsByContact.set(contactId, contactTimestamps);
  }

  private cleanOldTimestamps(now: number): void {
    const oneHourAgo = now - 60 * 60 * 1000;
    this.globalAutoSendTimestamps = this.globalAutoSendTimestamps.filter((ts) => ts > oneHourAgo);

    for (const [cid, timestamps] of this.autoSendTimestampsByContact.entries()) {
      const filtered = timestamps.filter((ts) => ts > oneHourAgo);
      if (filtered.length > 0) {
        this.autoSendTimestampsByContact.set(cid, filtered);
      } else {
        this.autoSendTimestampsByContact.delete(cid);
      }
    }
  }

  public evaluateDecision(
    settings: SystemSettings,
    contactId: string,
    isContactPermittedForAuto: boolean,
    classification: ClassificationResult,
    generation: AIDraftResult,
    isTestContact: boolean = false
  ): SafetyEvaluationResult {
    const now = Date.now();
    this.cleanOldTimestamps(now);

    // Invariant 1: Master Emergency Stop
    if (settings.emergencyStop) {
      return {
        decision: 'BLOCKED_BY_SAFETY',
        reason: 'Blocked by Master Emergency Stop. All automatic dispatches and drafts are suspended.',
        isAutoEligible: false,
        rateLimitRemaining: 0,
      };
    }

    // Invariant 2: Prompt Injection / Adversarial Threat
    if (classification.isSuspicious) {
      return {
        decision: 'BLOCKED_BY_SAFETY',
        reason: 'Blocked: Adversarial prompt injection or instruction override threat identified.',
        isAutoEligible: false,
        rateLimitRemaining: 0,
      };
    }

    // Invariant 3: Sensitive Personal / Financial / OTP Disclosure
    if (classification.isSensitive || classification.category === 'sensitive_personal') {
      return {
        decision: 'REQUIRES_APPROVAL',
        reason: 'Safety Hold: Message requests sensitive credentials or financial details. Human authorization mandatory.',
        isAutoEligible: false,
        rateLimitRemaining: 0,
      };
    }

    // Invariant 4: Mode A (Draft Only)
    if (settings.automationMode === 'draft_only') {
      return {
        decision: 'DRAFT_ONLY',
        reason: 'Mode A active (Draft Only). AI suggested reply stored safely for manual review.',
        isAutoEligible: false,
        rateLimitRemaining: 1,
      };
    }

    // Invariant 5: Mode B (Approval Required)
    if (settings.automationMode === 'approval_required') {
      return {
        decision: 'REQUIRES_APPROVAL',
        reason: 'Mode B active (Approval Required). Suggested reply queued for user review & device dispatch.',
        isAutoEligible: false,
        rateLimitRemaining: 1,
      };
    }

    // Mode C: Restricted Automatic Replies
    // Invariant 6: Master Automation Switch
    if (!settings.automationEnabled) {
      return {
        decision: 'REQUIRES_APPROVAL',
        reason: 'Automation switch is toggled OFF. Human review required.',
        isAutoEligible: false,
        rateLimitRemaining: 0,
      };
    }

    // Invariant 7: Contact Authorization Check
    if (!isContactPermittedForAuto) {
      return {
        decision: 'REQUIRES_APPROVAL',
        reason: `Contact is not on the permitted Mode C allowlist. Approval required.`,
        isAutoEligible: false,
        rateLimitRemaining: 0,
      };
    }

    // Invariant 8: Category Allowlist Check
    if (!settings.allowedCategories.includes(classification.category)) {
      return {
        decision: 'REQUIRES_APPROVAL',
        reason: `Category '${classification.category}' is not in the allowed auto-reply categories list.`,
        isAutoEligible: false,
        rateLimitRemaining: 0,
      };
    }

    // Invariant 9: Personal Decision / Calendar / Commitment Check
    if (generation.requiresPersonalDecision) {
      return {
        decision: 'REQUIRES_APPROVAL',
        reason: 'Inquiry requires user judgment or calendar schedule check. Assistant refused to fabricate commitments.',
        isAutoEligible: false,
        rateLimitRemaining: 0,
      };
    }

    // Invariant 10: Rate Limits (Global & Per Contact)
    const contactSentCount = (this.autoSendTimestampsByContact.get(contactId) || []).length;
    if (contactSentCount >= settings.maxPerContactPerHour) {
      return {
        decision: 'REQUIRES_APPROVAL',
        reason: `Contact hourly limit reached (${contactSentCount}/${settings.maxPerContactPerHour}). Throttled to approval.`,
        isAutoEligible: false,
        rateLimitRemaining: 0,
      };
    }

    const globalSentCount = this.globalAutoSendTimestamps.length;
    if (globalSentCount >= settings.maxGlobalPerHour) {
      return {
        decision: 'REQUIRES_APPROVAL',
        reason: `Global hourly limit reached (${globalSentCount}/${settings.maxGlobalPerHour}). Throttled to approval.`,
        isAutoEligible: false,
        rateLimitRemaining: 0,
      };
    }

    // All 7 safety invariants passed!
    return {
      decision: 'AUTO_SEND_ELIGIBLE',
      reason: 'All safety invariants satisfied. Message eligible for automated dispatch via device bridge.',
      isAutoEligible: true,
      rateLimitRemaining: settings.maxPerContactPerHour - contactSentCount,
    };
  }
}

export const safetyEngine = new SafetyEngine();
