// City/district picker + optional "help the clinic prepare" intake fields
// used by the quiz funnel's clinic-recommendation step
// (ClinicRecommendationChoice.tsx, rendered on /results/[leadId]). Moved
// out of MasterQuiz.tsx when city selection was re-sequenced to happen
// after contact capture instead of before lead creation.

export const CITIES = [
  { value: 'sofia', label: 'София' },
  { value: 'plovdiv', label: 'Пловдив' },
  { value: 'varna', label: 'Варна' },
  { value: 'burgas', label: 'Бургас' },
  { value: 'ruse', label: 'Русе' },
  { value: 'stara-zagora', label: 'Стара Загора' },
  { value: 'pleven', label: 'Плевен' },
  { value: 'sliven', label: 'Сливен' },
  { value: 'dobrich', label: 'Добрич' },
  { value: 'shumen', label: 'Шумен' },
  { value: 'haskovo', label: 'Хасково' },
]

// Sofia neighbourhoods only — no other city on the platform is large
// enough to have meaningful sub-city districts. Kept in sync manually
// with SOFIA_DISTRICTS in backend/config.py (same existing convention as
// CITIES above, which also has no shared source of truth with the
// backend copy).
export const SOFIA_DISTRICTS = [
  { value: 'lozenets', label: 'Лозенец' },
  { value: 'mladost', label: 'Младост' },
  { value: 'lyulin', label: 'Люлин' },
  { value: 'druzhba', label: 'Дружба' },
  { value: 'iztok', label: 'Изток' },
  { value: 'izgrev', label: 'Изгрев' },
  { value: 'studentski-grad', label: 'Студентски град' },
  { value: 'vitosha', label: 'Витоша' },
  { value: 'boyana', label: 'Бояна' },
  { value: 'center', label: 'Център' },
  { value: 'krasno-selo', label: 'Красно село' },
  { value: 'ovcha-kupel', label: 'Овча купел' },
  { value: 'nadezhda', label: 'Надежда' },
  { value: 'poduyane', label: 'Подуяне' },
]

// ─── Intake context (Clinical Brief) ──────────────────────────────
// Routing/logistics context, deliberately NOT part of the clinical
// question set: these don't affect scoring or the patient's orientation,
// they only help the clinic prepare. Asked only once the patient has
// opted into clinic recommendations (they're irrelevant otherwise).
//
// All optional by design — a skipped answer is honest missing data; a
// forced answer is noise in the brief.
//
// `importance` and `can_travel` reuse keys that already exist in the
// backend's label vocabulary (_QUIZ_QUESTION_LABELS/_QUIZ_VALUE_LABELS),
// so they surface in the Clinical Brief with no backend change.
export const INTAKE_FIELDS: Array<{
  key: 'importance' | 'can_travel' | 'has_files' | 'preferred_channel'
  label: string
  hint?: string
  multi?: boolean
  options: Array<{ value: string; label: string }>
}> = [
  {
    key: 'importance',
    label: 'Какво тежи най-много при избора?',
    options: [
      { value: 'quality', label: 'Качество и опит' },
      { value: 'comfort', label: 'Баланс цена / качество' },
      { value: 'price', label: 'Цената' },
    ],
  },
  {
    key: 'has_files',
    label: 'Имаш ли вече нещо от предишен преглед?',
    hint: 'Ако имаш, клиниката може да го прегледа предварително.',
    multi: true,
    options: [
      { value: 'photos', label: 'Снимки на зъбите' },
      { value: 'opg', label: 'OPG / скенер' },
      { value: 'plan', label: 'План или оферта' },
      { value: 'none', label: 'Нямам' },
    ],
  },
  {
    key: 'preferred_channel',
    label: 'Как предпочиташ да се свържат с теб?',
    options: [
      { value: 'call', label: 'Обаждане' },
      { value: 'message', label: 'Съобщение' },
      { value: 'any', label: 'Няма значение' },
    ],
  },
  {
    key: 'can_travel',
    label: 'Би ли пътувал/а до друг град за лечение?',
    options: [
      { value: 'no', label: 'Само в моя град' },
      { value: 'yes', label: 'Да, ако си струва' },
    ],
  },
]
