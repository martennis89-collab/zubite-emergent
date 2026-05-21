/**
 * Temporary Manual Clinic Recommendation Mode — used while Zubite.bg is
 * building partner clinic supply. Remove/replace when automated clinic
 * matching is ready.
 *
 * Why this file exists:
 *   While the partner clinic network is still being built, every patient
 *   funnel must avoid implying instant automated matching, guaranteed
 *   booking, "best clinic" promises or medical diagnosis. Instead, the
 *   patient submits a lead and the Zubite team reviews it manually and
 *   reaches out with relevant clinic guidance.
 *
 *   This module is the single source of truth for that copy. Every quiz,
 *   result page, contact form and clinic-fallback empty state should
 *   import from here — no scattered hard-coded strings. When automated
 *   matching ships, swap the constants below (or delete this file and
 *   replace the imports) in ONE place.
 *
 * Hard rules baked into the copy:
 *   • Zubite does NOT diagnose. Always uses "ориентир" / "насочване" /
 *     "възможности" — never "диагноза", "лечение", "гарантиран".
 *   • Care Pass is given by the partner clinic AFTER a consultation and
 *     contains discounts for ORAL HYGIENE PRODUCTS only — not a treatment
 *     discount, not insurance, not a guaranteed medical benefit.
 *   • CTAs frame the manual follow-up as a higher-care, human-guided
 *     step — never as "we are not ready yet".
 *
 * Banned phrases — DO NOT add anywhere in the patient funnel:
 *   "Запази час", "Избери клиника веднага", "Най-добрата клиника",
 *   "Гарантирана консултация", "Диагноза", "Автоматично избрана клиника",
 *   "Моментално ще получиш клиники", "Алгоритъмът избра най-доброто за теб".
 */

export const MANUAL_RECOMMENDATION_COPY = {
  /** Headline + intro shown above the contact form on every quiz. */
  formIntroHeadline: 'Заяви насочване към подходяща клиника',
  formIntroBody:
    'След като оставиш данните си, екипът на Zubite.bg ще прегледа отговорите ти и ще се свърже с теб с подходящи насоки и клиники, които могат да имат смисъл за твоя случай.',

  /** Compact one-liner — used in card sub-headers and tooltips. */
  shortIntro:
    'Екипът на Zubite.bg ще прегледа отговорите ти и ще се свърже с теб.',

  /** Mandatory safety note — must appear near every lead form / result. */
  safetyNote:
    'Zubite.bg не поставя диагноза и не замества преглед при стоматолог. Информацията е ориентировъчна.',

  /** Explainer shown on clinic-empty / manual-matching fallback states. */
  manualMatchingExplainer:
    'В момента изграждаме подбрана партньорска мрежа от клиники. Затова преглеждаме част от заявките ръчно, за да дадем по-смислено насочване според случая.',

  /** Submitted / thank-you confirmation. */
  submittedTitle: 'Благодарим ти — заявката е получена',
  submittedBody:
    'Екипът на Zubite.bg ще прегледа отговорите ти и ще се свърже с теб с подходящи насоки и клиники.',
}

/**
 * Whitelist of CTA strings. Use exactly these — keeps the funnel tone
 * consistent across all 8 quiz routes.
 */
export const MANUAL_RECOMMENDATION_CTA = {
  /** Primary lead-form submit button (post quiz result). */
  primary: 'Остави детайли и ще се свържем с теб',
  /** Result-screen "open the lead form" trigger. */
  requestGuidance: 'Заяви насочване към подходяща клиника',
  /** Variant for already-engaged users (e.g. clinic empty state). */
  askForHelp: 'Искам Zubite да ми помогне с насочване',
  /** Soft variant for content/blog inline CTAs. */
  getNextStep: 'Получете препоръка за следваща стъпка',
} as const

/**
 * /quiz/success CTA copy. When recommended clinics exist we still want to
 * surface them, but framed as "възможности", NOT as instant guaranteed
 * matches. When no clinics exist for the patient's segment/city, the
 * manual lead form takes over as the primary action.
 */
export const QUIZ_SUCCESS_COPY = {
  withClinics: {
    primaryCta: 'Виж възможни клиники',
    secondaryCta: 'Към началната страница',
    framing:
      'Виж следващи възможности на базата на отговорите ти. Това не е окончателна препоръка — Zubite не поставя диагноза.',
  },
  noClinics: {
    primaryCta: 'Остави детайли и ще се свържем с теб',
    secondaryCta: 'Към началната страница',
    framing:
      'Все още изграждаме подбрана партньорска мрежа в твоя район. Остави детайли и екипът на Zubite.bg ще се свърже с теб с подходящи насоки.',
  },
}

/**
 * Care Pass — correct phrasing. Used by /results, /quiz/success, clinic
 * profile, Care Pass section on the homepage, etc. The benefit is **oral
 * hygiene product discounts only**, given AFTER a consultation.
 */
export const CARE_PASS_COPY = {
  badge: 'Zubite Care Pass',
  oneLiner:
    'Ако посетиш консултация чрез Zubite.bg, партньорската клиника ще ти предостави Zubite Care Pass след проведената консултация — с отстъпки за продукти за орална хигиена.',
  shortBody:
    'След консултация в партньорска клиника получаваш Care Pass — отстъпки за продукти за орална хигиена. Не е отстъпка за лечение, не е застраховка, не е абонамент.',
}
