// Centralized pricing configuration - Single source of truth
// EUR primary, BGN secondary (€1 ≈ 2.00 лв for display approximation)

export interface PriceRange {
  minEUR: number
  maxEUR: number
  minBGN: number
  maxBGN: number
  note?: string
}

export interface TreatmentPricing {
  [key: string]: PriceRange
}

// Core pricing data - EUR primary, BGN secondary
export const TREATMENT_PRICES: TreatmentPricing = {
  // Orthodontics
  'orthodontics-aligners': {
    minEUR: 1500,
    maxEUR: 6000,
    minBGN: 3000,
    maxBGN: 12000,
    note: 'Прозрачни алайнери (Invisalign, Spark, Angel Aligner и др.)'
  },
  'orthodontics-braces': {
    minEUR: 1000,
    maxEUR: 4000,
    minBGN: 2000,
    maxBGN: 8000,
    note: 'Метални и керамични брекети'
  },
  
  // Implants
  'implant-single': {
    minEUR: 800,
    maxEUR: 2000,
    minBGN: 1600,
    maxBGN: 4000,
    note: 'Един зъб (имплант + корона)'
  },
  'implant-all-on-4': {
    minEUR: 6000,
    maxEUR: 20000,
    minBGN: 12000,
    maxBGN: 40000,
    note: 'All-on-4 / All-on-6 (една челюст)'
  },
  
  // Cosmetic Dentistry
  'veneers': {
    minEUR: 250,
    maxEUR: 900,
    minBGN: 500,
    maxBGN: 1800,
    note: 'На зъб (порцеланови фасети)'
  },
  'bonding': {
    minEUR: 80,
    maxEUR: 250,
    minBGN: 160,
    maxBGN: 500,
    note: 'На зъб (композитен бондинг)'
  },
  'whitening': {
    minEUR: 150,
    maxEUR: 400,
    minBGN: 300,
    maxBGN: 800,
    note: 'Професионално избелване'
  },
  
  // TMJ
  'tmj-therapy': {
    minEUR: 200,
    maxEUR: 1500,
    minBGN: 400,
    maxBGN: 3000,
    note: 'Шини и TMJ терапия'
  },
  
  // Sleep Apnea
  'sleep-apnea': {
    minEUR: 500,
    maxEUR: 2500,
    minBGN: 1000,
    maxBGN: 5000,
    note: 'Орални апарати за сънна апнея'
  }
}

// Price disclaimer - must appear under every price block
export const PRICE_DISCLAIMER = 'Цените са ориентировъчни и зависят от сложност, план и клиника.'

// Orthodontic treatment duration — ORIENTATION ONLY.
// These are general market ranges for Bulgaria, NOT a per-case prediction:
// the quiz reads reported symptoms, it cannot forecast how long a given
// patient's treatment will run. Figures mirror the already-approved copy in
// TREATMENT_EXPLANATIONS.orthodontics ('обикновено продължава между 12 и 24
// месеца, но леките случаи могат да се коригират и за 6 месеца') and
// ALIGNERS_FAQS ('Леките случаи могат да се завършат за 6-12 месеца'), so
// there is a single source of truth rather than a second set of numbers.
export const ORTHO_DURATION = {
  typical: '12 – 24 месеца',
  mild: '6 – 12 месеца',
  note: 'Срокът зависи от сложността на случая и от това колко редовно се носи апаратът.',
}

// Shown wherever a price/duration range is presented as orientation rather
// than a quote — keeps the "not a personal estimate" framing consistent.
export const PRICE_NOT_PERSONAL_NOTE =
  'Това са общи диапазони за България, не оценка на твоя случай. Точна цена и срок се определят след преглед.'

// Orthodontics special note for aligners
export const ALIGNERS_COMPLEX_NOTE = 'При много сложни случаи при топ специалисти може да достигне горната граница.'

// Brand comparison disclaimer
export const BRAND_COMPARISON_DISCLAIMER = 'Най-важният фактор е опитът на ортодонта и правилната диагноза. Марката сама по себе си не гарантира резултат.'

// Educational disclaimer
export const EDUCATIONAL_DISCLAIMER = 'Информацията е образователна и не замества преглед.'

// Helper function to format price (EUR only — Bulgaria has adopted EUR)
export function formatPrice(price: PriceRange): string {
  return `€${price.minEUR.toLocaleString('bg-BG')} – €${price.maxEUR.toLocaleString('bg-BG')}`
}

// Helper to format just EUR
export function formatPriceEUR(price: PriceRange): string {
  return `€${price.minEUR.toLocaleString('bg-BG')} – €${price.maxEUR.toLocaleString('bg-BG')}`
}

// Helper to format just BGN
export function formatPriceBGN(price: PriceRange): string {
  return `≈ ${price.minBGN.toLocaleString('bg-BG')} – ${price.maxBGN.toLocaleString('bg-BG')} лв.`
}

// Get prices for a treatment type
export function getTreatmentPrices(treatmentSlug: string): PriceRange[] {
  switch (treatmentSlug) {
    case 'orthodontics':
      return [
        TREATMENT_PRICES['orthodontics-aligners'],
        TREATMENT_PRICES['orthodontics-braces']
      ]
    case 'implants':
      return [
        TREATMENT_PRICES['implant-single'],
        TREATMENT_PRICES['implant-all-on-4']
      ]
    case 'cosmetic-dentistry':
      return [
        TREATMENT_PRICES['veneers'],
        TREATMENT_PRICES['bonding'],
        TREATMENT_PRICES['whitening']
      ]
    case 'tmj':
      return [TREATMENT_PRICES['tmj-therapy']]
    case 'sleep-airway':
      return [TREATMENT_PRICES['sleep-apnea']]
    default:
      return []
  }
}

// Aligner brand comparison data
export interface AlignerBrand {
  name: string
  slug: string
  suitableCases: string
  comfort: string
  aesthetics: string
  availability: string
  orthodontistControl: string
  priceRange: string
  priceBGN: string
}

export const ALIGNER_BRANDS: AlignerBrand[] = [
  {
    name: 'Invisalign',
    slug: 'invisalign',
    suitableCases: 'Леки до сложни случаи (зависи от плана и лекаря)',
    comfort: 'Висок комфорт, тънък материал (може да варира)',
    aesthetics: 'Почти невидими',
    availability: 'Широко разпространен в България',
    orthodontistControl: 'Пълен контрол от ортодонта, дигитално планиране',
    priceRange: '€2 000 – €6 000',
    priceBGN: ''
  },
  {
    name: 'Spark',
    slug: 'spark',
    suitableCases: 'Леки до средни случаи (зависи от плана и лекаря)',
    comfort: 'Висок комфорт, по-ясен материал (може да варира)',
    aesthetics: 'Почти невидими',
    availability: 'Нарастваща наличност в България',
    orthodontistControl: 'Пълен контрол от ортодонта, дигитално планиране',
    priceRange: '€1 800 – €5 000',
    priceBGN: ''
  },
  {
    name: 'Angel Aligner',
    slug: 'angel-aligner',
    suitableCases: 'Леки до средни случаи (зависи от плана и лекаря)',
    comfort: 'Добър комфорт (може да варира)',
    aesthetics: 'Почти невидими',
    availability: 'Налични в избрани клиники',
    orthodontistControl: 'Пълен контрол от ортодонта, дигитално планиране',
    priceRange: '€1 500 – €4 000',
    priceBGN: ''
  }
]

// How we select clinic options - replaces fake clinic lists
export const HOW_WE_SELECT_CLINICS = {
  title: 'Как подбираме опции за клиники',
  description: 'Работим само с клиники, които отговарят на нашите критерии за качество и прозрачност. Не класираме и не препоръчваме конкретна клиника като "най-добра" — изборът зависи от вашия случай и предпочитания.',
  criteria: [
    'Проверена квалификация на специалистите',
    'Прозрачно ценообразуване',
    'Положителна обратна връзка от пациенти'
  ]
}

// What you will get section
export const WHAT_YOU_GET = {
  title: 'Какво ще получите',
  items: [
    'Препоръка за подходящ тип лечение според вашия случай',
    'Ориентировъчни цени преди да говорите с клиника',
    '2–3 опции за клиники, които отговарят на критериите ни',
    'Възможност за безплатна консултация'
  ]
}

// When to seek specialist - common content for city pages
export const WHEN_TO_SEEK_SPECIALIST: Record<string, string[]> = {
  orthodontics: [
    'Криви или накривени зъби',
    'Препокриване на зъбите',
    'Разстояния между зъбите',
    'Неправилна захапка (overbite, underbite, crossbite)',
    'Трудности при дъвчене или говорене',
    'Челюстни болки или главоболие от захапката',
    'Желание за по-красива усмивка',
    'Препоръка от общопрактикуващ зъболекар'
  ],
  implants: [
    'Липсващ един или повече зъби',
    'Нестабилна зъбна протеза',
    'Трудности при дъвчене на храна',
    'Костна загуба в челюстта',
    'Желание за трайно решение',
    'Здрави съседни зъби (за избягване на мост)',
    'Дискомфорт от подвижна протеза',
    'Препоръка от зъболекар'
  ],
  'cosmetic-dentistry': [
    'Потъмнели или оцветени зъби',
    'Счупени или напукани зъби',
    'Неравномерни или неправилни форми',
    'Разстояния между зъбите',
    'Стари пломби, които се виждат',
    'Желание за по-бяла усмивка',
    'Подготовка за важно събитие',
    'Ниско самочувствие заради усмивката'
  ],
  'sleep-airway': [
    'Силно хъркане',
    'Прекъсване на дишането по време на сън',
    'Събуждане с усещане за задушаване',
    'Прекомерна дневна сънливост',
    'Главоболие сутрин',
    'Затруднена концентрация',
    'Диагностицирана сънна апнея',
    'Непоносимост към CPAP апарат'
  ],
  tmj: [
    'Болка в челюстната става',
    'Щракане или скърцане при отваряне на устата',
    'Затруднено отваряне на устата',
    'Болка при дъвчене',
    'Честа главоболие или мигрена',
    'Болка в ушите без инфекция',
    'Скърцане със зъби (бруксизъм)',
    'Напрежение в лицевите мускули'
  ]
}

// Treatment explanations for city pages
export const TREATMENT_EXPLANATIONS: Record<string, { intro: string; paragraphs: string[] }> = {
  orthodontics: {
    intro: 'Ортодонтията е специализиран клон на денталната медицина, който се занимава с диагностика, превенция и корекция на неправилно позиционирани зъби и челюсти.',
    paragraphs: [
      'Съвременната ортодонтия предлага разнообразие от методи за изправяне на зъбите — от традиционните метални брекети до почти невидимите прозрачни алайнери като Invisalign, Spark и Angel Aligner. Изборът на метод зависи от конкретния проблем, възрастта на пациента и личните предпочитания.',
      'Ортодонтското лечение не е само козметично — правилната захапка подобрява функцията на дъвчене, улеснява хигиената и предотвратява бъдещи проблеми като износване на емайла, заболявания на венците и челюстни дисфункции.',
      'Лечението обикновено продължава между 12 и 24 месеца, но леките случаи могат да се коригират и за 6 месеца. След приключване на активното лечение се носи ретейнер за запазване на резултата.'
    ]
  },
  implants: {
    intro: 'Зъбните импланти са съвременното решение за заместване на липсващи зъби, което най-близко имитира естествените зъби по функция и външен вид.',
    paragraphs: [
      'Имплантът представлява титанов винт, който се поставя в челюстната кост и служи като изкуствен корен. Върху него се монтира корона, мост или протеза. Титанът се интегрира с костта (остеоинтеграция), осигурявайки стабилна основа.',
      'За разлика от мостовете, имплантите не изискват пилене на съседните здрави зъби. Те предотвратяват костната загуба, която настъпва след загуба на зъб, и възстановяват пълноценно функцията на дъвчене.',
      'Процедурата се извършва под локална анестезия и е безболезнена. Периодът на възстановяване е 3-6 месеца, през които костта зараства около импланта. При подходящи условия е възможно незабавно натоварване с временни зъби.'
    ]
  },
  'cosmetic-dentistry': {
    intro: 'Естетичната стоматология обхваща процедури, насочени към подобряване на външния вид на усмивката — цвят, форма, подредба и цялостна хармония на зъбите.',
    paragraphs: [
      'Професионалното избелване е една от най-популярните процедури, която може да изсветли зъбите с 3-8 нюанса за едно посещение. Използват се безопасни формули, които не увреждат емайла.',
      'Порцелановите фасети са тънки керамични пластини, които се залепват върху предната повърхност на зъбите. Те коригират цвят, форма и малки несъвършенства, създавайки идеална усмивка за 10-15 години.',
      'Композитният бондинг е по-достъпна алтернатива за корекция на малки дефекти — счупвания, разстояния или неравности. Процедурата се извършва за едно посещение без изпиляване на зъба.'
    ]
  },
  'sleep-airway': {
    intro: 'Денталната медицина предлага ефективни решения за проблеми със съня като хъркане и обструктивна сънна апнея чрез специализирани орални апарати.',
    paragraphs: [
      'Оралните апарати (мандибуларни advancement устройства) позиционират долната челюст леко напред по време на сън, което отваря дихателните пътища и намалява или премахва хъркането и апнеята.',
      'Тези апарати са одобрена алтернатива на CPAP машините при лека до умерена сънна апнея. Те са удобни за пътуване, не издават шум и не изискват електричество.',
      'Индивидуално изработеният апарат се прави по отпечатък на вашите зъби, което гарантира комфорт и ефективност. Повечето пациенти свикват за 1-2 седмици.'
    ]
  },
  tmj: {
    intro: 'TMJ (темпоромандибуларната става) е ставата, която свързва долната челюст с черепа. Дисфункциите в тази област причиняват болка и ограничена подвижност.',
    paragraphs: [
      'Симптомите на TMJ дисфункция включват болка в челюстта, щракане или скърцане при отваряне на устата, главоболие, болки в ушите и затруднено дъвчене. Причините са разнообразни — стрес, бруксизъм, травма или неправилна захапка.',
      'Лечението обикновено започва с консервативни методи — шини за нощно носене, физиотерапевтични упражнения и промени в навиците. В повечето случаи това е достатъчно за облекчаване на симптомите.',
      'Стабилизиращата шина (сплинт) е основен инструмент в терапията. Тя се носи предимно през нощта и предпазва зъбите от скърцане, като същевременно релаксира челюстните мускули.'
    ]
  }
}

// Aligners vs Braces comparison
export const ALIGNERS_VS_BRACES = {
  aligners: {
    title: 'Алайнери (прозрачни)',
    pros: [
      'Почти невидими',
      'Свалят се при хранене и хигиена',
      'По-малко дискомфорт (може да варира)',
      'По-лесна орална хигиена',
      'По-малко посещения при лекаря (може да варира)'
    ],
    cons: [
      'Изискват дисциплина (22+ часа носене)',
      'Не са подходящи за всички случаи',
      'Могат да се изгубят или счупят',
      'Обикновено по-висока цена'
    ]
  },
  braces: {
    title: 'Брекети',
    pros: [
      'Подходящи за всички случаи',
      'Не изискват самодисциплина',
      'Постоянно действие 24/7',
      'Обикновено по-ниска цена',
      'По-предвидими резултати при сложни случаи'
    ],
    cons: [
      'Видими (освен лингвалните)',
      'Ограничения в храната',
      'По-трудна хигиена',
      'Може да причинят дискомфорт',
      'По-чести посещения при лекаря'
    ]
  }
}

// FAQs for aligners comparison page
export const ALIGNERS_FAQS = [
  {
    q: 'Коя марка алайнери е най-добра?',
    a: 'Няма универсално "най-добра" марка. Резултатът зависи преди всичко от опита на ортодонта и правилната диагноза. Invisalign, Spark и Angel Aligner са качествени системи с доказана ефективност.'
  },
  {
    q: 'Каква е разликата в цената между марките?',
    a: 'Invisalign обикновено е в диапазона €2 000 – €6 000, Spark €1 800 – €5 000, Angel Aligner €1 500 – €4 000. Цените зависят от сложността на случая и клиниката.'
  },
  {
    q: 'Мога ли да избера марката сам?',
    a: 'Можете да изразите предпочитание, но ортодонтът ще препоръча системата, която е най-подходяща за вашия конкретен случай.'
  },
  {
    q: 'Колко време трае лечението с алайнери?',
    a: 'Обикновено между 6 и 24 месеца, в зависимост от сложността. Леките случаи могат да се завършат за 6-12 месеца.'
  },
  {
    q: 'Болезнено ли е носенето на алайнери?',
    a: 'Може да има лек дискомфорт при смяна на нов алайнер, но обикновено отминава за 1-2 дни. Повечето пациенти свикват бързо.'
  },
  {
    q: 'Какво се случва след лечението?',
    a: 'След приключване на активното лечение се носи ретейнер (фиксиран или подвижен), за да се запази резултатът.'
  },
  {
    q: 'Подходящи ли са алайнерите за деца?',
    a: 'Да, има специални системи за тийнейджъри. За по-малки деца обикновено се препоръчват други методи, определени от ортодонта.'
  },
  {
    q: 'Покрива ли здравната каса алайнерите?',
    a: 'Обикновено не. Ортодонтското лечение рядко се покрива от НЗОК. Много клиники предлагат разсрочено плащане.'
  }
]
