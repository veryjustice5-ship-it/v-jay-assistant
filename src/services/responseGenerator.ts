import { ClassificationResult } from './classifier';
import { CommunicationStyle } from '../types';

export interface GenerationResult {
  suggestedText: string;
  alternatives: string[];
  requiresPersonalDecision: boolean;
  confidence: number;
  reasoning: string;
}

export function generateReply(
  messageText: string,
  classification: ClassificationResult,
  senderName: string,
  style: CommunicationStyle = 'concise'
): GenerationResult {
  const { category, isSuspicious, isSensitive } = classification;

  // 1. Prompt Injection / Malicious Instruction Defense
  if (isSuspicious) {
    return {
      suggestedText: '[Security Alert] This message contained instructions attempting to override system behavior or extract protected credentials. It has been blocked.',
      alternatives: [
        'I cannot fulfill commands aimed at bypassing safety safeguards or disclosing private configurations.',
        'Administrative override instructions are ignored and logged for security review.',
      ],
      requiresPersonalDecision: true,
      confidence: 0.99,
      reasoning: 'Security threat detected. Automatic response is a protective refusal; human review flagged.',
    };
  }

  // 2. Sensitive / OTP / Verification Code Protection
  if (isSensitive) {
    return {
      suggestedText: 'I do not share verification codes, passwords, or personal credentials via message. Please call me directly if you need verification.',
      alternatives: [
        'Security reminder: Passcodes and confidential codes are never sent over SMS or WhatsApp.',
        'Let’s connect via an authorized voice call before discussing any security or account codes.',
      ],
      requiresPersonalDecision: true,
      confidence: 0.96,
      reasoning: 'Message requested private security codes or financial info. Auto-disclosure strictly blocked.',
    };
  }

  // 3. Scheduling & Calendar (Strictly avoid hallucinating commitments)
  if (category === 'scheduling') {
    let suggested = 'I need to check my calendar first. What time were you thinking?';
    let alt1 = 'Let me check my availability and follow up with you shortly.';
    let alt2 = 'Could you share the proposed time? I will verify my schedule and confirm.';

    if (style === 'casual') {
      suggested = 'Hey! Let me double check my schedule and get back to you shortly.';
      alt1 = 'Sounds fun, but let me check what time works best before locking it in!';
      alt2 = 'Can’t confirm right this second, but I’ll text you as soon as I check my calendar.';
    } else if (style === 'professional') {
      suggested = 'Thank you for reaching out. I will review my calendar and follow up with my availability shortly.';
      alt1 = 'Could you suggest a couple of times that work on your end? I’ll cross-reference my schedule.';
      alt2 = 'I need to verify my commitments for tomorrow and will confirm as soon as possible.';
    } else if (style === 'direct') {
      suggested = 'Checking my calendar now. Will reply shortly.';
      alt1 = 'Need to check my schedule first. What time?';
      alt2 = 'Not sure yet. Let me verify.';
    }

    return {
      suggestedText: suggested,
      alternatives: [alt1, alt2],
      requiresPersonalDecision: true,
      confidence: 0.89,
      reasoning: 'Scheduling inquiry requires verified calendar availability. System refused to invent commitments.',
    };
  }

  // 4. Greetings
  if (category === 'greetings') {
    let suggested = `Hey! Hope you're having a good day. What's up?`;
    let alt1 = `Hi ${senderName}, how's everything going?`;
    let alt2 = `Hey there! How can I help you today?`;

    if (style === 'casual') {
      suggested = `Hey ${senderName}! How's it going?`;
      alt1 = `Hey! Good to hear from you. What's up?`;
      alt2 = `Yo! Hope your week is going great.`;
    } else if (style === 'professional') {
      suggested = `Hello ${senderName}. How can I assist you today?`;
      alt1 = `Good day. I hope you are doing well. Please let me know how I can assist.`;
      alt2 = `Greetings. Thank you for reaching out.`;
    } else if (style === 'direct') {
      suggested = `Hi ${senderName}. How can I help?`;
      alt1 = `Hey. What's up?`;
      alt2 = `Hello.`;
    }

    return {
      suggestedText: suggested,
      alternatives: [alt1, alt2],
      requiresPersonalDecision: false,
      confidence: 0.95,
      reasoning: `Standard social greeting generated matching the configured '${style}' tone.`,
    };
  }

  // 5. School-related
  if (category === 'school_related') {
    return {
      suggestedText: `Thanks for the note on class. Let me check the syllabus and materials and get back to you shortly.`,
      alternatives: [
        `Got it! Let's compare notes after I review the assignment instructions.`,
        `Checking the coursework details now, will update you in a bit.`,
      ],
      requiresPersonalDecision: true,
      confidence: 0.86,
      reasoning: 'Academic communication requires checking specific coursework and assignments.',
    };
  }

  // 6. Work-related
  if (category === 'work_related') {
    return {
      suggestedText: `Received your update. Reviewing this now and will send over my notes shortly.`,
      alternatives: [
        `Thanks for keeping me in the loop. I'll review the deliverables as soon as I'm back at my desk.`,
        `Got the message. Let me verify the latest project status and follow up.`,
      ],
      requiresPersonalDecision: true,
      confidence: 0.88,
      reasoning: 'Work items require human verification of deadlines, deliverables, or deliverables.',
    };
  }

  // 7. Requests for Information
  if (category === 'requests_for_information') {
    return {
      suggestedText: `Sure, let me locate that information and send it right over.`,
      alternatives: [
        `I will look up the details in a moment and share the link.`,
        `Let me grab that file/address and text you back shortly.`,
      ],
      requiresPersonalDecision: true,
      confidence: 0.84,
      reasoning: 'Information retrieval requires looking up specific user files, locations, or links.',
    };
  }

  // 8. Business inquiries
  if (category === 'business_inquiries') {
    return {
      suggestedText: `Thank you for the inquiry. Could you share a few more details so I can provide an accurate response?`,
      alternatives: [
        `Thanks for reaching out! What is the scope and timeline you have in mind?`,
        `Received your proposal. I will review and get back to you with next steps.`,
      ],
      requiresPersonalDecision: true,
      confidence: 0.85,
      reasoning: 'Business proposals require human evaluation of terms and pricing.',
    };
  }

  // 9. Questions & Casual conversation
  if (category === 'questions' || category === 'casual_conversation') {
    return {
      suggestedText: `Thanks for reaching out! Let me check on that and get back to you in just a bit.`,
      alternatives: [
        `Got your message! Let me look into that and text you back soon.`,
        `Appreciate the note! Talk to you shortly.`,
      ],
      requiresPersonalDecision: true,
      confidence: 0.80,
      reasoning: 'General inquiry requires personal judgment or factual lookup.',
    };
  }

  // Default / Unknown
  return {
    suggestedText: `Hey, saw your message! Let me know if you need anything specific.`,
    alternatives: [
      `Got your message! Hope all is well on your end.`,
      `Could you clarify a bit more? Just want to make sure I understand.`,
    ],
    requiresPersonalDecision: true,
    confidence: 0.65,
    reasoning: 'Message is ambiguous or underspecified; requesting clarification.',
  };
}
