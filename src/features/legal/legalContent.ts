/**
 * Legal page copy — ported verbatim (English locale) from the old app's
 * `app/src/locales/en/legal.json` (read-only reference at
 * `/www/wwwroot/dev.operatora`). That app drives this copy through
 * `react-i18next`; this app has no i18n layer, so the English strings are
 * inlined here as plain data instead of wiring up a translation library for
 * three static pages. Do not invent/alter legal text — if the copy needs to
 * change, it should change in lockstep with the old app's source of truth
 * (or with legal/product sign-off), not silently drift here.
 */

export const LEGAL_LAST_UPDATED = "2026-05-12";

export const LEGAL_CONTACT = {
  email: "sales@operatora.uz",
  phone: "+998 78 555 19 34",
  address: "Tashkent city, Shahristan 1",
};

export interface LegalSection {
  title: string;
  /** Rendered before `items`/`orderedItems`. */
  paragraphs?: string[];
  items?: string[];
  orderedItems?: string[];
  /** Rendered after `items`/`orderedItems` (e.g. a closing caveat). */
  trailingParagraphs?: string[];
  showContact?: boolean;
}

export interface LegalPageContent {
  badge: string;
  title: string;
  sections: LegalSection[];
  /** Highlight callout rendered above the sections (Refund page only). */
  highlight?: { badge: string; title: string; body: string };
}

export const PRIVACY_CONTENT: LegalPageContent = {
  badge: "PRIVACY · LEGAL",
  title: "Privacy Policy",
  sections: [
    {
      title: "1. General Provisions",
      paragraphs: [
        'This Privacy Policy explains how personal data is collected, processed, and protected within the SaaS service provided by Operatora LLC (hereinafter — "Operatora", "we") through the operatora.xyz and operatora.uz domains and the Operatora mobile app.',
        "By using the service, the User consents to the terms of this policy. If the User does not agree with any of the terms, they should not continue using the service.",
      ],
    },
    {
      title: "2. What Data We Collect",
      items: [
        "Account data: email, name, phone number, password (stored only in hashed form).",
        "Workspace data: team name, user list, roles, and settings.",
        "Call and message data: uploaded audio files, transcripts, AI analysis results, lead data, and conversion history.",
        "Payment data: subscription type, payment status, amount, and history. We do not store full card details such as card number, CVV, or expiry date — payments are processed directly via Payme and Click.",
        "Technical data: IP address, browser type, device type, login time — for security and service quality monitoring.",
      ],
    },
    {
      title: "3. How We Use Data",
      items: [
        "Providing, configuring, and personalizing the service.",
        "Transcribing audio files and generating AI analysis (using Gemini and similar models).",
        "Managing subscriptions, processing payments, and sending invoices.",
        "Sending service updates, account notifications, and essential technical messages via email.",
        "Fulfilling legal obligations and security requirements.",
      ],
    },
    {
      title: "4. Sharing Data with Third Parties",
      paragraphs: ["We do not sell User data. We share data with third-party services only in the following limited cases:"],
      items: [
        "AI providers (Google Gemini, OpenAI) — audio/text fragments are sent via API for transcription and analysis. Providers do not use this data to train their models (per API agreement).",
        "Payment providers (HAAD payment service → Payme, Click) — only order_id, amount, and workspace data are transmitted.",
        "Hosting and infrastructure — data is stored through encrypted channels.",
        "Legal requirement — when officially requested by an authorized authority.",
      ],
    },
    {
      title: "5. Retention Period",
      paragraphs: [
        "Uploaded audio files and their transcripts are retained for 365 days on the Pro plan and 30 days on the Free plan. When an account is deleted, all data is permanently removed from our servers within 30 days. Payment history is retained for 5 years due to legal obligations.",
      ],
    },
    {
      title: "6. Security",
      paragraphs: [
        "All data is transmitted through TLS 1.3 encrypted channels. Passwords are hashed using the bcrypt algorithm. The database and file storage are protected with encryption-at-rest. We conduct regular security audits and vulnerability scans.",
      ],
    },
    {
      title: "7. User Rights",
      items: [
        "Access your data and obtain a copy.",
        "Correct inaccurate data.",
        "Delete your account and associated data.",
        'Opt out of marketing emails (via the "unsubscribe" link in each message or by sending a request to sales@operatora.uz).',
      ],
    },
    {
      title: "8. Cookies and Similar Technologies",
      paragraphs: [
        "We use cookies and localStorage only for essential purposes: maintaining login sessions, remembering language and theme preferences, and page activity statistics. Third-party tracking cookies are not used.",
      ],
    },
    {
      title: "9. Children's Privacy",
      paragraphs: [
        "Operatora is not directed at users under 16 years of age, and we do not knowingly collect information about persons under 16. If you become aware of such a case, please notify sales@operatora.uz — the data will be promptly deleted.",
      ],
    },
    {
      title: "10. Policy Changes",
      paragraphs: [
        'This policy may be updated from time to time. For significant changes, we will notify the User via email or in-service notification. The "Last updated" field always reflects the latest version.',
      ],
    },
    {
      title: "11. Contact",
      paragraphs: ["For any privacy-related questions or requests:"],
      showContact: true,
    },
  ],
};

export const TERMS_CONTENT: LegalPageContent = {
  badge: "TERMS · LEGAL",
  title: "Terms of Service",
  sections: [
    {
      title: "1. Acceptance of Terms",
      paragraphs: [
        'By using Operatora services (operatora.xyz, operatora.uz websites, the Operatora mobile app, and its APIs), the User confirms that they have read, understood, and agree to the following terms. These terms constitute a legal agreement between Operatora LLC (hereinafter — "Operatora", "we") and the individual or organization using the service (hereinafter — "User", "you").',
      ],
    },
    {
      title: "2. Description of Service",
      paragraphs: [
        "Operatora is a multi-tenant SaaS platform that provides AI-powered transcription, analysis, mentoring, and lead management tools for sales calls. The service includes the following capabilities (which may be expanded in future versions):",
      ],
      items: [
        "Automatic transcription of audio files (Uzbek/Russian/English)",
        "AI analysis: score, sentiment, key points, recommendations",
        "Lead boards and conversion tracking",
        "Mentor chat and feedback for operators",
        "Workspace and team management",
      ],
    },
    {
      title: "3. Plans and Payment",
      items: [
        "Free plan: 100 calls per month, 500 MB storage, 30-day retention. Permanently free.",
        "Pro plan: 10,000 calls per month, 50 GB storage, 365-day retention. 99,000 UZS per month or 948,000 UZS per year.",
        "Team / Enterprise: by agreement. Contact: sales@operatora.uz.",
      ],
      paragraphs: [
        "Payments are processed via Payme or Click through HAAD payment service. A 7-day money-back guarantee applies to the Pro plan — if a request is sent to sales@operatora.uz within 7 days of the first payment, the full amount will be refunded. After this period, refunds are considered only in cases of technical failure.",
      ],
    },
    {
      title: "4. Account and Security",
      paragraphs: [
        "The User agrees to register with accurate and complete information, keep their password confidential, and accept responsibility for all activity conducted through their account. If account security is suspected to be compromised, sales@operatora.uz must be notified immediately.",
      ],
    },
    {
      title: "5. Acceptable Use",
      paragraphs: ["The User must not use the service for the following purposes:"],
      items: [
        "Activities contrary to the laws of the Republic of Uzbekistan or international law.",
        "Creating and distributing spam, fraud, defamation, false information, or content that harms third parties.",
        "Recording audio without the consent of the recorded party (where covert recording is prohibited by law).",
        "Reverse engineering the service, automated scraping, or attempting to bypass defined rate limits.",
        "Unauthorized access to other Users' account data.",
      ],
    },
    {
      title: "6. Intellectual Property",
      paragraphs: [
        "The service's code, design, logo, brand marks, and AI model prompts are the intellectual property of Operatora LLC. Audio files, transcripts, and lead data uploaded by the User remain the User's property — Operatora processes them only within the scope of providing the service and never sells or shares them with other Users.",
      ],
    },
    {
      title: "7. Availability and SLA",
      paragraphs: [
        "Operatora strives to keep the service available 24/7, but temporary outages may occur due to scheduled maintenance, infrastructure failures, or third-party provider issues (Payme, Click, AI providers). No SLA guarantee is provided for the Free plan. Target availability for the Pro plan is 99.0% per month.",
      ],
    },
    {
      title: "8. Limitation of Liability",
      paragraphs: [
        'The service is provided "as-is". To the maximum extent permitted by law, Operatora is not liable for indirect, incidental, or consequential damages (including loss of business revenue, data loss, or reputational harm). Operatora\'s total liability for any incident is limited to the subscription amount paid by the User in the preceding 12 months.',
        "AI analyses (scores, recommendations, transcripts) are generated by automated tools and may contain errors — business decisions should not rely solely on these results.",
      ],
    },
    {
      title: "9. Cancellation and Suspension",
      paragraphs: [
        "The User may delete their account at any time (Settings → Delete Account). Operatora will permanently delete all data from servers within 30 days. The Pro plan subscription remains active until the end of the current billing period.",
        "Operatora reserves the right to immediately suspend accounts in cases of serious violation of these terms. For significant violations, suspension will be carried out with 7 days' notice.",
      ],
    },
    {
      title: "10. Changes to Terms",
      paragraphs: [
        "Operatora may update these terms from time to time. For significant changes, notice will be provided at least 14 days in advance via email or in-service notification. Users who do not agree with the new terms have the right to cancel their subscription.",
      ],
    },
    {
      title: "11. Legal Disputes and Governing Law",
      paragraphs: [
        "These terms are interpreted in accordance with the laws of the Republic of Uzbekistan. Disputes shall first be resolved through negotiation. If negotiation fails, the dispute shall be submitted to the jurisdiction of the Tashkent City Economic Court.",
      ],
    },
    {
      title: "12. Contact",
      paragraphs: ["For any questions regarding this agreement:"],
      showContact: true,
    },
  ],
};

export const REFUND_CONTENT: LegalPageContent = {
  badge: "PAYMENT · LEGAL",
  title: "Refund Policy",
  highlight: {
    badge: "KEY GUARANTEE",
    title: "Full refund within 7 days for the Pro plan.",
    body: "If you are not satisfied with the service within 7 calendar days from your first payment date, send a single message to sales@operatora.uz — your payment will be refunded in full, no questions asked, without penalties or deductions.",
  },
  sections: [
    {
      title: "1. Which Payments Are Covered",
      items: [
        "Pro plan (monthly or annual) — full refund guarantee applies within 7 days from the first payment date.",
        "Free plan — free of charge; refund concept does not apply.",
        "Team / Enterprise plans — governed by a separate agreement, arranged via sales@operatora.uz.",
      ],
    },
    {
      title: "2. How to Submit a Request",
      orderedItems: [
        "Send an email to sales@operatora.uz.",
        'Email subject: "Refund — <workspace name>".',
        "In the email body, include: registered email, workspace ID (from the Settings page), payment date, and order_id.",
        "Optional: briefly describe the reason for the refund — this helps us improve the service, but is not required.",
      ],
      paragraphs: ["You may also submit a request by phone: +998 78 555 19 34 (weekdays 09:00–18:00 Tashkent time)."],
    },
    {
      title: "3. Refund Timelines",
      items: [
        "Request confirmation: confirmed via email within 1 business day.",
        "Funds return: if paid via Payme or Click, funds are returned to the original card or account within 3–10 business days. Timing may vary depending on bank policies.",
        "Refunds are processed only through the original payment channel (Payme or Click) — no alternative payment methods or bank transfers are available.",
      ],
    },
    {
      title: "4. Cases Where Refund Is Denied",
      paragraphs: ["Refunds are denied in the following cases:"],
      items: [
        "More than 7 calendar days have passed since the first payment date.",
        "The account was suspended for violating the Terms of Service (Section 5 — Acceptable Use).",
        "A refund request has already been accepted for the same workspace (one-time guarantee).",
        "After Pro plan renewal — the refund guarantee does not apply to renewal payments, only to the initial purchase.",
      ],
      trailingParagraphs: [
        "Refunds beyond the 7-day limit may be considered in cases of technical error or complete service unavailability — contact sales@operatora.uz with full details.",
      ],
    },
    {
      title: "5. Account Deletion vs. Refund",
      paragraphs: ["Account deletion and refund are two separate actions:"],
      items: [
        "Account deletion — stops future renewals; account and data are permanently deleted from servers within 30 days. Payment is not automatically refunded.",
        "Refund — payment is returned to your card/account through the process described above.",
      ],
      trailingParagraphs: [
        'To do both at once, indicate "delete account and refund" in your email — we will process both actions together.',
      ],
    },
    {
      title: "6. Partial Refund (Prorating)",
      paragraphs: [
        "Partial refunds are generally not issued if you have used more than half of the Pro plan. However, if you request a refund within the first 7 days of an annual plan, the full amount is returned even with high usage.",
      ],
    },
    {
      title: "7. Anti-Abuse Policy",
      paragraphs: [
        "In cases of guarantee system abuse (for example, the same company opening multiple accounts to repeatedly use the guarantee), accounts will be suspended and future refund requests may be denied.",
      ],
    },
    {
      title: "8. Contact",
      paragraphs: ["For refund requests or questions:"],
      showContact: true,
    },
  ],
};
