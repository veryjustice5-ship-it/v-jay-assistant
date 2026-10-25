import { GoogleGenAI } from '@google/genai';
import { CommunicationStyle } from '../src/types';
import { ClassificationResult } from './classifier';

export interface AIDraftResult {
  suggestedText: string;
  alternatives: string[];
  requiresPersonalDecision: boolean;
  confidence: number;
  reasoning: string;
  source: 'gemini' | 'rule_fallback';
}

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI | null {
  if (aiClient) return aiClient;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    return aiClient;
  } catch (err) {
    console.warn('[AI Studio] Failed to initialize GoogleGenAI client:', err);
    return null;
  }
}

export async function generateServerSideDraft(
  incomingText: string,
  classification: ClassificationResult,
  senderName: string,
  style: CommunicationStyle = 'concise',
  userName: string = 'Alex'
): Promise<AIDraftResult> {
  const { category, isSuspicious, isSensitive } = classification;

  // Invariant 1: Prompt Injection / Malicious Override
  if (isSuspicious) {
    return {
      suggestedText: '[Security Alert] This message contained instructions attempting to override system behavior or extract protected credentials. It has been blocked.',
      alternatives: [
        'I cannot fulfill commands aimed at bypassing safety safeguards or disclosing private configurations.',
        'Administrative override instructions are ignored and logged for security review.',
      ],
      requiresPersonalDecision: true,
      confidence: 0.99,
      reasoning: 'Security threat detected. Automatic response is a protective refusal; flagged for review.',
      source: 'rule_fallback',
    };
  }

  // Invariant 2: Sensitive OTP / Financial Credential Defense
  if (isSensitive) {
    return {
      suggestedText: 'I do not share verification codes, passwords, or personal credentials via message. Please call me directly if you need verification.',
      alternatives: [
        'Security reminder: Passcodes and confidential codes are never sent over SMS or WhatsApp.',
        'Let’s connect via an authorized voice call before discussing any security or account codes.',
      ],
      requiresPersonalDecision: true,
      confidence: 0.98,
      reasoning: 'Message requested private security codes or financial info. Auto-disclosure strictly blocked.',
      source: 'rule_fallback',
    };
  }

  // Invariant 3: Scheduling / Calendar availability (Anti-Hallucination)
  if (category === 'scheduling') {
    const schedulingDrafts = getSchedulingDrafts(style, senderName);
    return {
      ...schedulingDrafts,
      requiresPersonalDecision: true,
      confidence: 0.90,
      reasoning: 'Scheduling inquiry requires verified calendar availability. System strictly refuses to hallucinate commitments.',
      source: 'rule_fallback',
    };
  }

  // Attempt real Gemini AI generation if API client is available
  const client = getAIClient();
  if (client) {
    try {
      const prompt = `
You are v jay, a personal AI messaging assistant drafting a reply for ${userName} to ${senderName}.
The incoming message is: "${incomingText}"
Category: "${category}".
Desired communication style: "${style}".

Strict Safety Rules:
1. Never commit to a specific meeting time or place without user approval.
2. Never disclose passwords, verification codes, or financial details.
3. Be natural, polite, and context-appropriate in the tone: ${style}.
4. Provide 1 primary suggested reply and 2 alternative variations.
5. Decide if this requires personal knowledge or decision from ${userName}.

Return ONLY valid JSON with this exact structure:
{
  "suggestedText": "string",
  "alternatives": ["string", "string"],
  "requiresPersonalDecision": boolean,
  "confidence": number,
  "reasoning": "short explanation of why this reply was chosen"
}
`;

      const response = await client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      const responseText = response.text?.trim() || '';
      if (responseText) {
        const parsed = JSON.parse(responseText);
        if (parsed.suggestedText) {
          return {
            suggestedText: parsed.suggestedText,
            alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : [],
            requiresPersonalDecision: Boolean(parsed.requiresPersonalDecision),
            confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.92,
            reasoning: parsed.reasoning || `Gemini 3.8 Flash synthesized response matching ${style} style.`,
            source: 'gemini',
          };
        }
      }
    } catch (error) {
      console.warn('[AI Studio] Gemini AI drafting fallback triggered:', error);
    }
  }

  // Deterministic rule-based fallback
  return getFallbackDraft(incomingText, classification, senderName, style);
}

function getSchedulingDrafts(style: CommunicationStyle, senderName: string) {
  if (style === 'casual') {
    return {
      suggestedText: 'Hey! Let me double check my schedule and get back to you shortly.',
      alternatives: [
        'Sounds fun, but let me check what time works best before locking it in!',
        'Can’t confirm right this second, but I’ll text you as soon as I check my calendar.',
      ],
    };
  }
  if (style === 'professional') {
    return {
      suggestedText: 'Thank you for reaching out. I will review my calendar and follow up with my availability shortly.',
      alternatives: [
        'Could you suggest a couple of times that work on your end? I will cross-reference my schedule.',
        'I need to verify my commitments for tomorrow and will confirm as soon as possible.',
      ],
    };
  }
  if (style === 'direct') {
    return {
      suggestedText: 'Checking my calendar now. Will reply shortly.',
      alternatives: [
        'Need to check my schedule first. What time?',
        'Not sure yet. Let me verify.',
      ],
    };
  }
  // concise
  return {
    suggestedText: 'I need to check my calendar first. What time were you thinking?',
    alternatives: [
      'Let me check my availability and follow up with you shortly.',
      'Could you share the proposed time? I will verify my schedule and confirm.',
    ],
  };
}

function getFallbackDraft(
  messageText: string,
  classification: ClassificationResult,
  senderName: string,
  style: CommunicationStyle
): AIDraftResult {
  const { category } = classification;

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
      source: 'rule_fallback',
    };
  }

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
      source: 'rule_fallback',
    };
  }

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
      source: 'rule_fallback',
    };
  }

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
      source: 'rule_fallback',
    };
  }

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
      source: 'rule_fallback',
    };
  }

  return {
    suggestedText: `Hey, saw your message! Let me know if you need anything specific.`,
    alternatives: [
      `Got your message! Hope all is well on your end.`,
      `Could you clarify a bit more? Just want to make sure I understand.`,
    ],
    requiresPersonalDecision: true,
    confidence: 0.70,
    reasoning: 'Message requires personal attention; generated polite check-in.',
    source: 'rule_fallback',
  };
}
