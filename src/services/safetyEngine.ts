import { ClassificationResult } from './classifier';
import { GenerationResult } from './responseGenerator';
import { SystemSettings, PipelineDecision } from '../types';

interface AutoReplyRecord {
  timestamp: number;
  contactId: string;
}

class SafetyEngineManager {
  private history: AutoReplyRecord[] = [];
  private seenSignatures: Set<string> = new Set();

  public isDuplicate(contactId: string, channel: string, text: string): boolean {
    const raw = `${contactId}:${channel}:${text.trim().toLowerCase()}`;
    if (this.seenSignatures.has(raw)) {
      return true;
    }
    this.seenSignatures.add(raw);
    // Remove old signatures after 5 minutes
    setTimeout(() => {
      this.seenSignatures.delete(raw);
    }, 300000);
    return false;
  }

  public checkRateLimits(
    contactId: string,
    maxGlobalPerHour: number = 10,
    maxContactPerHour: number = 3
  ): { passed: boolean; reason: string } {
    const now = Date.now();
    const windowMs = 3600 * 1000;
    this.history = this.history.filter((rec) => now - rec.timestamp < windowMs);

    if (this.history.length >= maxGlobalPerHour) {
      return {
        passed: false,
        reason: `Global safety rate limit exceeded (${this.history.length}/${maxGlobalPerHour} auto-replies in current hour).`,
      };
    }

    const contactCount = this.history.filter((rec) => rec.contactId === contactId).length;
    if (contactCount >= maxContactPerHour) {
      return {
        passed: false,
        reason: `Contact rate limit exceeded (${contactCount}/${maxContactPerHour} auto-replies to this sender in current hour).`,
      };
    }

    return {
      passed: true,
      reason: `Rate limits clear (${this.history.length}/${maxGlobalPerHour} global, ${contactCount}/${maxContactPerHour} sender).`,
    };
  }

  public recordAutoSend(contactId: string): void {
    this.history.push({ timestamp: Date.now(), contactId });
  }

  public evaluateDecision(
    settings: SystemSettings,
    contactId: string,
    isContactPermitted: boolean,
    classification: ClassificationResult,
    generation: GenerationResult
  ): { decision: PipelineDecision; isAutoEligible: boolean; reason: string } {
    // 1. Emergency Stop is Absolute
    if (settings.emergencyStop) {
      return {
        decision: 'BLOCKED_BY_SAFETY',
        isAutoEligible: false,
        reason: 'EMERGENCY STOP is ACTIVE. All automatic outbound transmission is globally blocked.',
      };
    }

    // 2. Automation Master Switch
    if (!settings.automationEnabled) {
      return {
        decision: 'DRAFT_ONLY',
        isAutoEligible: false,
        reason: 'Master Automation is switched OFF. Generating draft only for manual handling.',
      };
    }

    // 3. Prompt Injection Defense
    if (classification.isSuspicious) {
      return {
        decision: 'BLOCKED_BY_SAFETY',
        isAutoEligible: false,
        reason: 'Security invariant violated: Message classified as suspicious prompt injection attempt.',
      };
    }

    // 4. Sensitive Information / OTP Protection
    if (classification.isSensitive) {
      return {
        decision: 'REQUIRES_APPROVAL',
        isAutoEligible: false,
        reason: 'Sensitive data, authentication code, or financial credentials detected. Human review strictly required.',
      };
    }

    // 5. Operating Mode A: Draft Only
    if (settings.automationMode === 'draft_only') {
      return {
        decision: 'DRAFT_ONLY',
        isAutoEligible: false,
        reason: 'System operating in Mode A (Draft Only). All replies are prepared as drafts without automatic dispatch.',
      };
    }

    // 6. Operating Mode B: Approval Required
    if (settings.automationMode === 'approval_required') {
      return {
        decision: 'REQUIRES_APPROVAL',
        isAutoEligible: false,
        reason: 'System operating in Mode B (Approval Required). Suggested response queued for explicit human review.',
      };
    }

    // 7. Operating Mode C: Restricted Automatic Replies
    if (settings.automationMode === 'restricted_auto') {
      // Condition 7a: Contact Authorization
      if (!isContactPermitted) {
        return {
          decision: 'REQUIRES_APPROVAL',
          isAutoEligible: false,
          reason: 'Sender is not on the authorized auto-reply contact list (Contact restriction enforced).',
        };
      }

      // Condition 7b: Category Allowlist
      if (!settings.allowedCategories.includes(classification.category)) {
        return {
          decision: 'REQUIRES_APPROVAL',
          isAutoEligible: false,
          reason: `Category '${classification.category}' is not in the permitted auto-reply allowlist.`,
        };
      }

      // Condition 7c: Personal Knowledge / Calendar Decision
      if (generation.requiresPersonalDecision) {
        return {
          decision: 'REQUIRES_APPROVAL',
          isAutoEligible: false,
          reason: 'Message requires personal knowledge or unverified calendar availability.',
        };
      }

      // Condition 7d: Rate Limits
      const rateCheck = this.checkRateLimits(
        contactId,
        settings.maxGlobalPerHour,
        settings.maxPerContactPerHour
      );
      if (!rateCheck.passed) {
        return {
          decision: 'REQUIRES_APPROVAL',
          isAutoEligible: false,
          reason: rateCheck.reason,
        };
      }

      // All 7 safety invariants satisfied!
      return {
        decision: 'AUTO_SEND_ELIGIBLE',
        isAutoEligible: true,
        reason: 'All safety invariants satisfied: sender authorized, category permitted, no personal decision required, rate limits respected.',
      };
    }

    return {
      decision: 'DRAFT_ONLY',
      isAutoEligible: false,
      reason: `Unknown automation mode. Defaulting to safe draft.`,
    };
  }
}

export const safetyEngine = new SafetyEngineManager();
