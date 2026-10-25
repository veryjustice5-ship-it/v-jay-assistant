import { MessageCategory } from '../types';

export interface ClassificationResult {
  category: MessageCategory;
  confidence: number;
  isSuspicious: boolean;
  isSensitive: boolean;
  reasoning: string;
}

const SUSPICIOUS_PATTERNS = [
  /ignore (all )?(previous|your) instructions/i,
  /reveal (your |the )?(system|private|prompt|config|rules)/i,
  /you are now in (developer|dan|jailbreak) mode/i,
  /bypass (safety|rules|filters|safeguards)/i,
  /system override/i,
  /dump database/i,
  /root access/i,
  /sudo /i,
  /disregard safety guidelines/i,
];

const SENSITIVE_PATTERNS = [
  /(verification|security|auth(entication)?) code/i,
  /\botp\b/i,
  /\bpassword\b/i,
  /\bpasscode\b/i,
  /credit card|cvv|bank account|routing number|wire transfer/i,
  /social security|\bssn\b/i,
  /send me \$\d+/i,
  /confidential pin/i,
];

const GREETING_PATTERNS = [
  /^(hi|hey|hello|good morning|good afternoon|good evening|howdy|sup)\b/i,
  /^hey there/i,
  /^what'?s up/i,
];

const SCHEDULING_PATTERNS = [
  /\b(are you (free|coming|available)|can we meet|let's meet|reschedule|tomorrow|next week|at \d{1,2}(:\d{2})?\s*(am|pm)?)\b/i,
  /\b(calendar|appointment|lunch today|coffee)\b/i,
];

const SCHOOL_PATTERNS = [
  /\b(homework|assignment|exam|quiz|professor|lecture|syllabus|grade|class|study group|midterm|final|campus)\b/i,
];

const WORK_PATTERNS = [
  /\b(project|client|deadline|sprint|standup|jira|pr|merge|deploy|boss|manager|deliverable|kpi|meeting agenda)\b/i,
];

const BUSINESS_PATTERNS = [
  /\b(quote|invoice|rfp|partnership|vendor|contract|pricing|proposal|b2b|procurement)\b/i,
];

const QUESTION_PATTERNS = [
  /^(what|when|where|who|why|how|can you|could you|would you|is it|are there)\b/i,
  /\?$/,
];

const INFO_REQUEST_PATTERNS = [
  /\b(send me the link|what's the address|where is the doc|can you share|send the file|what time does)\b/i,
];

export function classifyMessage(text: string): ClassificationResult {
  if (!text || !text.trim()) {
    return {
      category: 'unknown_or_ambiguous',
      confidence: 0.1,
      isSuspicious: false,
      isSensitive: false,
      reasoning: 'Empty or whitespace message.',
    };
  }

  const cleaned = text.trim();

  // 1. Prompt Injection / Security Threats
  for (const pat of SUSPICIOUS_PATTERNS) {
    if (pat.test(cleaned)) {
      return {
        category: 'suspicious_messages',
        confidence: 0.98,
        isSuspicious: true,
        isSensitive: false,
        reasoning: `Prompt injection or system override detected matching pattern: ${pat.source}`,
      };
    }
  }

  // 2. Sensitive / OTP / Credentials
  for (const pat of SENSITIVE_PATTERNS) {
    if (pat.test(cleaned)) {
      return {
        category: 'sensitive_personal',
        confidence: 0.95,
        isSuspicious: false,
        isSensitive: true,
        reasoning: `Sensitive data or authentication code request identified matching pattern: ${pat.source}`,
      };
    }
  }

  // 3. Scheduling & Availability (Requires personal calendar knowledge)
  for (const pat of SCHEDULING_PATTERNS) {
    if (pat.test(cleaned)) {
      return {
        category: 'scheduling',
        confidence: 0.90,
        isSuspicious: false,
        isSensitive: false,
        reasoning: 'Inquiry requires user availability or personal calendar confirmation.',
      };
    }
  }

  // 4. School-related
  for (const pat of SCHOOL_PATTERNS) {
    if (pat.test(cleaned)) {
      return {
        category: 'school_related',
        confidence: 0.88,
        isSuspicious: false,
        isSensitive: false,
        reasoning: 'Academic or coursework context identified.',
      };
    }
  }

  // 5. Work-related
  for (const pat of WORK_PATTERNS) {
    if (pat.test(cleaned)) {
      return {
        category: 'work_related',
        confidence: 0.88,
        isSuspicious: false,
        isSensitive: false,
        reasoning: 'Professional workplace or project terminology identified.',
      };
    }
  }

  // 6. Business inquiries
  for (const pat of BUSINESS_PATTERNS) {
    if (pat.test(cleaned)) {
      return {
        category: 'business_inquiries',
        confidence: 0.87,
        isSuspicious: false,
        isSensitive: false,
        reasoning: 'Commercial proposal, vendor, or contract inquiry detected.',
      };
    }
  }

  // 7. Greetings
  for (const pat of GREETING_PATTERNS) {
    if (pat.test(cleaned)) {
      return {
        category: 'greetings',
        confidence: 0.95,
        isSuspicious: false,
        isSensitive: false,
        reasoning: 'Standard social greeting or salutation.',
      };
    }
  }

  // 8. Requests for Information
  for (const pat of INFO_REQUEST_PATTERNS) {
    if (pat.test(cleaned)) {
      return {
        category: 'requests_for_information',
        confidence: 0.85,
        isSuspicious: false,
        isSensitive: false,
        reasoning: 'Direct request for shared link, address, or document.',
      };
    }
  }

  // 9. Questions
  for (const pat of QUESTION_PATTERNS) {
    if (pat.test(cleaned)) {
      return {
        category: 'questions',
        confidence: 0.80,
        isSuspicious: false,
        isSensitive: false,
        reasoning: 'Informational question requiring specific response.',
      };
    }
  }

  // 10. Casual Conversation
  if (cleaned.split(/\s+/).length >= 3) {
    return {
      category: 'casual_conversation',
      confidence: 0.75,
      isSuspicious: false,
      isSensitive: false,
      reasoning: 'General conversational exchange.',
    };
  }

  return {
    category: 'unknown_or_ambiguous',
    confidence: 0.40,
    isSuspicious: false,
    isSensitive: false,
    reasoning: 'Short or underspecified message without distinct category keywords.',
  };
}
