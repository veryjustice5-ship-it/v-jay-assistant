import { MessageCategory } from '../src/types';

export interface ClassificationResult {
  category: MessageCategory;
  confidence: number;
  reasoning: string;
  isSuspicious: boolean;
  isSensitive: boolean;
  suspiciousIndicators: string[];
}

// 1. Suspicious / Prompt Injection Patterns
const SUSPICIOUS_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /system\s+prompt/i,
  /you\s+are\s+now\s+in\s+developer\s+mode/i,
  /override\s+safety/i,
  /jailbreak/i,
  /reveal\s+(your|the)\s+(secret|instructions|key|tokens)/i,
  /bypass\s+restrictions/i,
  /pretend\s+you\s+have\s+no\s+rules/i,
  /administrative\s+override/i,
];

// 2. Sensitive / OTP / Financial Patterns
const SENSITIVE_PATTERNS = [
  /\b(otp|verification\s*code|one-time\s*password|security\s*code)\b/i,
  /\bpassword\b/i,
  /\bcredit\s*card\b/i,
  /\bssn\b/i,
  /\bbank\s*account\b/i,
  /\bpin\s*number\b/i,
  /\bcvv\b/i,
  /\bpasscode\b/i,
];

// 3. Category Heuristic Matchers
const GREETINGS_PATTERNS = [
  /\b(hi|hello|hey|good\s+morning|good\s+afternoon|good\s+evening|what's\s+up|sup|howdy|yo)\b/i,
];

const SCHEDULING_PATTERNS = [
  /\b(meet|meeting|lunch|coffee|dinner|tomorrow|today|tonight|weekend|next\s+week|schedule|calendar|free\s+at|available|what\s+time|reschedule)\b/i,
  /\b\d{1,2}(:\d{2})?\s*(am|pm)\b/i,
];

const SCHOOL_PATTERNS = [
  /\b(homework|assignment|class|lecture|exam|quiz|professor|ta|grade|coursework|study\s+group|syllabus|due\s+date|canvas|blackboard)\b/i,
];

const WORK_PATTERNS = [
  /\b(project|deadline|client|standup|sprint|pr|pull\s+request|jira|deploy|release|roadmap|deck|presentation|deliverable|kpi)\b/i,
];

const INFO_REQUEST_PATTERNS = [
  /\b(send\s+me|share\s+the|can\s+you\s+send|where\s+is\s+the|link\s+to|address|file|document|pdf|spreadsheet)\b/i,
];

const BUSINESS_PATTERNS = [
  /\b(quote|pricing|contract|proposal|invoice|partnership|vendor|rfp|collaboration|agreement)\b/i,
];

const QUESTION_PATTERNS = [
  /\?/,
  /\b(what|why|how|when|where|who|which|is\s+it|can\s+we|could\s+you)\b/i,
];

export function classifyMessage(text: string): ClassificationResult {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // Check 1: Suspicious / Prompt Injection
  const suspiciousMatches: string[] = [];
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(lower)) {
      suspiciousMatches.push(pattern.source);
    }
  }

  if (suspiciousMatches.length > 0) {
    return {
      category: 'suspicious_messages',
      confidence: 0.99,
      reasoning: 'Potential prompt injection or adversarial system prompt extraction detected.',
      isSuspicious: true,
      isSensitive: false,
      suspiciousIndicators: suspiciousMatches,
    };
  }

  // Check 2: Sensitive Personal / Financial / OTP
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        category: 'sensitive_personal',
        confidence: 0.98,
        reasoning: 'Verification code, password, or financial credential request detected.',
        isSuspicious: false,
        isSensitive: true,
        suspiciousIndicators: [],
      };
    }
  }

  // Check 3: Scheduling (Important for anti-hallucination)
  for (const pattern of SCHEDULING_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        category: 'scheduling',
        confidence: 0.92,
        reasoning: 'Meeting, calendar inquiry, or time availability request identified.',
        isSuspicious: false,
        isSensitive: false,
        suspiciousIndicators: [],
      };
    }
  }

  // Check 4: School / Academic
  for (const pattern of SCHOOL_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        category: 'school_related',
        confidence: 0.88,
        reasoning: 'Academic coursework, homework, or class-related context detected.',
        isSuspicious: false,
        isSensitive: false,
        suspiciousIndicators: [],
      };
    }
  }

  // Check 5: Work / Professional
  for (const pattern of WORK_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        category: 'work_related',
        confidence: 0.89,
        reasoning: 'Professional project, deadline, or deliverable context detected.',
        isSuspicious: false,
        isSensitive: false,
        suspiciousIndicators: [],
      };
    }
  }

  // Check 6: Requests for Information
  for (const pattern of INFO_REQUEST_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        category: 'requests_for_information',
        confidence: 0.85,
        reasoning: 'Request to share links, files, addresses, or documents.',
        isSuspicious: false,
        isSensitive: false,
        suspiciousIndicators: [],
      };
    }
  }

  // Check 7: Business Inquiries
  for (const pattern of BUSINESS_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        category: 'business_inquiries',
        confidence: 0.86,
        reasoning: 'Commercial inquiry regarding pricing, contracts, or partnership.',
        isSuspicious: false,
        isSensitive: false,
        suspiciousIndicators: [],
      };
    }
  }

  // Check 8: Greetings
  for (const pattern of GREETINGS_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        category: 'greetings',
        confidence: 0.94,
        reasoning: 'Standard social greeting or salutation.',
        isSuspicious: false,
        isSensitive: false,
        suspiciousIndicators: [],
      };
    }
  }

  // Check 9: Questions
  for (const pattern of QUESTION_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        category: 'questions',
        confidence: 0.82,
        reasoning: 'General inquiry or question requiring personal knowledge or judgment.',
        isSuspicious: false,
        isSensitive: false,
        suspiciousIndicators: [],
      };
    }
  }

  // Check 10: Casual banter vs ambiguous
  if (trimmed.length > 0 && trimmed.length < 80) {
    return {
      category: 'casual_conversation',
      confidence: 0.75,
      reasoning: 'Brief conversational message or casual check-in.',
      isSuspicious: false,
      isSensitive: false,
      suspiciousIndicators: [],
    };
  }

  return {
    category: 'unknown_or_ambiguous',
    confidence: 0.50,
    reasoning: 'Unclassified or complex message requiring clarification.',
    isSuspicious: false,
    isSensitive: false,
    suspiciousIndicators: [],
  };
}
