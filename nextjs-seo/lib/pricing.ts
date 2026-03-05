// Centralized pricing configuration - Single source of truth
// All prices in BGN with EUR equivalent (€1 ≈ 2.00 лв for display)

export interface PriceRange {
  minBGN: number
  maxBGN: number
  minEUR: number
  maxEUR: number
  note?: string
}

export interface TreatmentPricing {
  [key: string]: PriceRange
}

// Core pricing data - BGN primary, EUR secondary
export const TREATMENT_PRICES: TreatmentPricing = {
  // Orthodontics
  'orthodontics-aligners': {
    minBGN: 3000,
    maxBGN: 12000,
    minEUR: 1500,
    maxEUR: 6000,
    note: 'Invisalign и други прозрачни алайнери'
  },
  'orthodontics-braces': {
    minBGN: 2000,
    maxBGN: 8000,
    minEUR: 1000,
    maxEUR: 4000,
    note: 'Метални и керамични брекети'
  },
  
  // Implants
  'implant-single': {
    minBGN: 1600,
    maxBGN: 4000,
    minEUR: 800,
    maxEUR: 2000,
    note: 'Един зъб (имплант + корона)'
  },
  'implant-all-on-4': {
    minBGN: 12000,
    maxBGN: 40000,
    minEUR: 6000,
    maxEUR: 20000,
    note: 'All-on-4 / All-on-6 (една челюст)'
  },
  
  // Cosmetic Dentistry
  'veneers': {
    minBGN: 500,
    maxBGN: 1800,
    minEUR: 250,
    maxEUR: 900,
    note: 'На зъб (порцеланови фасети)'
  },
  'bonding': {
    minBGN: 160,
    maxBGN: 500,
    minEUR: 80,
    maxEUR: 250,
    note: 'На зъб (композитен бондинг)'
  },
  'whitening': {
    minBGN: 300,
    maxBGN: 800,
    minEUR: 150,
    maxEUR: 400,
    note: 'Професионално избелване'
  },
  
  // TMJ
  'tmj-therapy': {
    minBGN: 400,
    maxBGN: 3000,
    minEUR: 200,
    maxEUR: 1500,
    note: 'Шини и TMJ терапия'
  },
  
  // Sleep Apnea
  'sleep-apnea': {
    minBGN: 1000,
    maxBGN: 5000,
    minEUR: 500,
    maxEUR: 2500,
    note: 'Орални апарати за сънна апнея'
  }
}

// Price disclaimer - must appear under every price block
export const PRICE_DISCLAIMER = 'Цените са ориентировъчни и зависят от сложност, план и клиника.'

// Orthodontics special note
export const ORTHODONTICS_COMPLEX_NOTE = 'При много сложни случаи с висока сложност и лечение при топ специалисти, цената може да достигне горната граница.'

// Educational disclaimer
export const EDUCATIONAL_DISCLAIMER = 'Информацията е образователна и не замества преглед.'

// Helper function to format price with BGN primary, EUR secondary
export function formatPrice(price: PriceRange): string {
  const bgnMin = price.minBGN.toLocaleString('bg-BG')
  const bgnMax = price.maxBGN.toLocaleString('bg-BG')
  const eurMin = price.minEUR.toLocaleString('bg-BG')
  const eurMax = price.maxEUR.toLocaleString('bg-BG')
  
  return `${bgnMin} – ${bgnMax} лв. (≈ €${eurMin} – €${eurMax})`
}

// Helper to format just BGN
export function formatPriceBGN(price: PriceRange): string {
  const bgnMin = price.minBGN.toLocaleString('bg-BG')
  const bgnMax = price.maxBGN.toLocaleString('bg-BG')
  return `${bgnMin} – ${bgnMax} лв.`
}

// Helper to format just EUR
export function formatPriceEUR(price: PriceRange): string {
  const eurMin = price.minEUR.toLocaleString('bg-BG')
  const eurMax = price.maxEUR.toLocaleString('bg-BG')
  return `≈ €${eurMin} – €${eurMax}`
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
      'Съвременната ортодонтия предлага разнообразие от методи за изправяне на зъбите — от традиционните метални брекети до почти невидимите прозрачни алайнери като Invisalign. Изборът на метод зависи от конкретния проблем, възрастта на пациента и личните предпочитания.',
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
