// Updated data with treatment-first architecture

export const CITIES = {
  sofia: { slug: 'sofia', name: 'София', nameEn: 'Sofia' },
  plovdiv: { slug: 'plovdiv', name: 'Пловдив', nameEn: 'Plovdiv' },
  varna: { slug: 'varna', name: 'Варна', nameEn: 'Varna' }
} as const;

// Top 10 Bulgarian cities — used in the quiz dropdown, lead form and analytics.
// `CITIES` above keeps the 3 cities that have dedicated landing-page content.
// Adding new cities below keeps the quiz truly pan-Bulgarian without forcing
// us to author per-city pages for every one of them.
export const ALL_CITIES: { slug: string; name: string; nameEn: string }[] = [
  { slug: 'sofia', name: 'София', nameEn: 'Sofia' },
  { slug: 'plovdiv', name: 'Пловдив', nameEn: 'Plovdiv' },
  { slug: 'varna', name: 'Варна', nameEn: 'Varna' },
  { slug: 'burgas', name: 'Бургас', nameEn: 'Burgas' },
  { slug: 'ruse', name: 'Русе', nameEn: 'Ruse' },
  { slug: 'stara-zagora', name: 'Стара Загора', nameEn: 'Stara Zagora' },
  { slug: 'pleven', name: 'Плевен', nameEn: 'Pleven' },
  { slug: 'sliven', name: 'Сливен', nameEn: 'Sliven' },
  { slug: 'dobrich', name: 'Добрич', nameEn: 'Dobrich' },
  { slug: 'shumen', name: 'Шумен', nameEn: 'Shumen' },
];

export const TREATMENTS = {
  orthodontics: { 
    slug: 'orthodontics', 
    name: 'Ортодонтия', 
    nameEn: 'Orthodontics',
    fullName: 'Ортодонтско лечение',
    fullNameEn: 'Orthodontic Treatment',
    description: 'Алайнери, брекети и изправяне на зъби',
    descriptionEn: 'Aligners, braces and teeth straightening',
    icon: '🦷',
    ogImage: 'https://zubite.bg/og/og-orthodontics.jpg'
  },
  implants: { 
    slug: 'implants', 
    name: 'Зъбни импланти', 
    nameEn: 'Dental Implants',
    fullName: 'Зъбни импланти',
    fullNameEn: 'Dental Implants',
    description: 'Трайно решение за липсващи зъби',
    descriptionEn: 'Permanent solution for missing teeth',
    icon: '🔧',
    ogImage: 'https://zubite.bg/og/og-implants.jpg'
  },
  'cosmetic-dentistry': { 
    slug: 'cosmetic-dentistry', 
    name: 'Естетична стоматология', 
    nameEn: 'Cosmetic Dentistry',
    fullName: 'Естетична стоматология',
    fullNameEn: 'Cosmetic Dentistry',
    description: 'Избелване, фасети, бондинг и усмивка мечта',
    descriptionEn: 'Whitening, veneers, bonding and dream smile',
    icon: '✨',
    ogImage: 'https://zubite.bg/og/og-cosmetic.jpg'
  },
  'sleep-airway': { 
    slug: 'sleep-airway', 
    name: 'Сънна апнея', 
    nameEn: 'Sleep & Airway',
    fullName: 'Сънна апнея и дихателни пътища',
    fullNameEn: 'Sleep Apnea & Airway',
    description: 'Дентални решения за хъркане и апнея',
    descriptionEn: 'Dental solutions for snoring and apnea',
    icon: '😴',
    ogImage: 'https://zubite.bg/og/og-sleep.jpg'
  },
  tmj: { 
    slug: 'tmj', 
    name: 'TMJ / Челюстни стави', 
    nameEn: 'TMJ',
    fullName: 'TMJ и челюстни дисфункции',
    fullNameEn: 'TMJ and Jaw Dysfunction',
    description: 'Болка в челюстта, щракане, главоболие',
    descriptionEn: 'Jaw pain, clicking, headaches',
    icon: '🦴',
    ogImage: 'https://zubite.bg/og/og-tmj.jpg'
  }
} as const;

export type CitySlug = keyof typeof CITIES;
export type TreatmentSlug = keyof typeof TREATMENTS;

// City-specific clinic data (mock)
export const CITY_CLINICS: Record<string, Array<{
  name: string;
  address: string;
  rating: number;
  specialties: string[];
}>> = {
  sofia: [
    { name: 'Дентал Клиник София', address: 'бул. Витоша 100', rating: 4.9, specialties: ['orthodontics', 'implants'] },
    { name: 'SmileDesign Sofia', address: 'ул. Граф Игнатиев 45', rating: 4.8, specialties: ['cosmetic-dentistry', 'implants'] },
    { name: 'Орто Център', address: 'ж.к. Лозенец, бл. 12', rating: 4.7, specialties: ['orthodontics', 'tmj'] },
  ],
  plovdiv: [
    { name: 'Дентал Студио Пловдив', address: 'ул. Княз Александър I 50', rating: 4.8, specialties: ['implants', 'cosmetic-dentistry'] },
    { name: 'Усмивка Пловдив', address: 'бул. Руски 120', rating: 4.7, specialties: ['orthodontics', 'sleep-airway'] },
  ],
  varna: [
    { name: 'Дентална клиника Варна', address: 'бул. Владислав Варненчик 80', rating: 4.9, specialties: ['implants', 'tmj'] },
    { name: 'Морска Усмивка', address: 'ул. Осми приморски полк 25', rating: 4.6, specialties: ['cosmetic-dentistry', 'orthodontics'] },
  ]
};

// City-specific FAQs
export const CITY_FAQS: Record<string, Record<string, Array<{ q: string; a: string }>>> = {
  sofia: {
    orthodontics: [
      { q: 'Колко струва ортодонтско лечение в София?', a: 'Цените в София варират от 2,500 до 8,000 лв в зависимост от типа лечение (брекети или алайнери) и сложността на случая. Тези цени са ориентировъчни.' },
      { q: 'Кои са най-добрите ортодонти в София?', a: 'В София има множество сертифицирани ортодонти. Нашите партньорски клиники са внимателно подбрани въз основа на опит и отзиви на пациенти.' },
      { q: 'Колко време трае ортодонтското лечение?', a: 'Типичното лечение трае между 12 и 24 месеца, но леките случаи могат да се завършат за 6-12 месеца.' },
      { q: 'Invisalign или брекети - кое е по-добро?', a: 'И двете опции са ефективни. Invisalign е по-дискретен и удобен, но брекетите са по-подходящи за сложни случаи.' },
      { q: 'Предлагат ли се разсрочени плащания?', a: 'Да, повечето клиники в София предлагат разсрочено плащане на 6, 12 или 24 месеца.' }
    ],
    implants: [
      { q: 'Каква е цената на зъбен имплант в София?', a: 'Цената на единичен имплант в София варира от 800 до 2,500 лв. Цените са ориентировъчни и зависят от марката и необходимите процедури.' },
      { q: 'Колко време отнема поставянето на импланти?', a: 'Самата операция е 1-2 часа, но целият процес с възстановяване отнема 3-6 месеца.' },
      { q: 'Болезнена ли е процедурата?', a: 'Процедурата се извършва под локална анестезия и е безболезнена. След операцията може да има лек дискомфорт за няколко дни.' },
      { q: 'Какви марки импланти се използват?', a: 'Клиниките в София работят с водещи марки като Straumann, Nobel Biocare, Osstem и др.' },
      { q: 'Има ли гаранция на имплантите?', a: 'Да, повечето производители предлагат доживотна гаранция на самия имплант.' }
    ],
    'cosmetic-dentistry': [
      { q: 'Колко струват порцелановите фасети в София?', a: 'Цените на фасети в София варират от 400 до 1,200 лв на зъб. Тези цени са ориентировъчни.' },
      { q: 'Колко издържат фасетите?', a: 'При правилна грижа фасетите издържат 10-15 години или повече.' },
      { q: 'Какви опции за избелване има?', a: 'Предлага се професионално избелване в клиника (1 час) и домашни комплекти с индивидуални шини.' },
      { q: 'Боли ли поставянето на фасети?', a: 'Процедурата е минимално инвазивна и обикновено не изисква анестезия.' },
      { q: 'Мога ли да комбинирам няколко процедури?', a: 'Да, често се комбинират избелване, бондинг и фасети за цялостна трансформация на усмивката.' }
    ],
    'sleep-airway': [
      { q: 'Какви дентални решения има за хъркане в София?', a: 'Предлагат се индивидуални орални апарати, които позиционират долната челюст напред и отварят дихателните пътища.' },
      { q: 'Колко струва орален апарат за апнея?', a: 'Цените са ориентировъчни и варират от 800 до 2,000 лв в зависимост от типа апарат.' },
      { q: 'Ефективни ли са денталните решения за апнея?', a: 'Да, оралните апарати са доказано ефективни при лека до умерена сънна апнея и са алтернатива на CPAP.' },
      { q: 'Трябва ли ми направление от лекар?', a: 'Препоръчително е първо да се консултирате с лекар специалист по съня за диагностика.' },
      { q: 'Колко време отнема привикването?', a: 'Повечето пациенти свикват за 1-2 седмици.' }
    ],
    tmj: [
      { q: 'Какви симптоми показват TMJ проблеми?', a: 'Типични симптоми са болка в челюстта, щракане при отваряне на устата, главоболие и болки в ушите.' },
      { q: 'Как се лекува TMJ дисфункция в София?', a: 'Лечението включва шини за нощно носене, физиотерапия и понякога ортодонтско лечение.' },
      { q: 'Колко струва лечението на TMJ?', a: 'Цените са ориентировъчни и варират от 300 до 1,500 лв в зависимост от необходимото лечение.' },
      { q: 'Колко време трае лечението?', a: 'Лечението обикновено продължава от 3 до 12 месеца в зависимост от тежестта.' },
      { q: 'Покрива ли здравната каса TMJ лечение?', a: 'Частично, някои диагностични процедури могат да бъдат покрити.' }
    ]
  },
  plovdiv: {
    orthodontics: [
      { q: 'Какви са цените за ортодонтия в Пловдив?', a: 'Ортодонтското лечение в Пловдив струва ориентировъчно от 2,200 до 7,000 лв.' },
      { q: 'Има ли добри ортодонти в Пловдив?', a: 'Да, Пловдив има отлични сертифицирани ортодонти с богат опит.' },
      { q: 'Предлага ли се Invisalign в Пловдив?', a: 'Да, има няколко сертифицирани Invisalign доставчика в Пловдив.' },
      { q: 'На каква възраст може да се започне ортодонтия?', a: 'Препоръчва се първи преглед на 7 години, но лечение може да се започне на всяка възраст.' },
      { q: 'Колко често са прегледите?', a: 'Обикновено на всеки 4-8 седмици в зависимост от лечението.' }
    ],
    implants: [
      { q: 'Колко струват имплантите в Пловдив?', a: 'Цените на импланти в Пловдив са ориентировъчно от 700 до 2,200 лв на имплант.' },
      { q: 'Какъв е процентът на успеваемост?', a: 'Успеваемостта на зъбните импланти е над 95% при правилна грижа.' },
      { q: 'Мога ли да получа временни зъби?', a: 'Да, в много случаи се поставят временни зъби веднага след имплантацията.' },
      { q: 'Какви изследвания са необходими?', a: 'Необходими са панорамна снимка и/или 3D скенер за планиране.' },
      { q: 'Има ли възрастови ограничения?', a: 'Има ограничения за млади хора до завършване на растежа. Горна граница няма.' }
    ],
    'cosmetic-dentistry': [
      { q: 'Какви естетични процедури се предлагат в Пловдив?', a: 'Пловдив предлага избелване, фасети, бондинг, корекция на формата и Smile Design.' },
      { q: 'Колко струва избелването в Пловдив?', a: 'Професионалното избелване струва ориентировъчно от 200 до 500 лв.' },
      { q: 'Какво е Smile Design?', a: 'Smile Design е цялостно планиране на перфектната усмивка с дигитална визуализация.' },
      { q: 'Колко посещения са необходими?', a: 'Зависи от процедурата - от 1 посещение за избелване до 2-3 за фасети.' },
      { q: 'Болезнени ли са процедурите?', a: 'Повечето естетични процедури са безболезнени или минимално дискомфортни.' }
    ],
    'sleep-airway': [
      { q: 'Има ли специалисти по сънна апнея в Пловдив?', a: 'Да, има дентални специалисти, обучени в изработка на орални апарати за апнея.' },
      { q: 'Какви апарати се използват?', a: 'Използват се мандибуларни advancement устройства (MAD) и tongue retaining devices.' },
      { q: 'Колко бързо ще видя резултат?', a: 'Повечето пациенти забелязват подобрение от първата нощ.' },
      { q: 'Необходим ли е сънен тест?', a: 'Да, препоръчва се полисомнография или домашен тест за апнея.' },
      { q: 'Алтернатива ли е на CPAP?', a: 'Да, за лека до умерена апнея оралните апарати са призната алтернатива.' }
    ],
    tmj: [
      { q: 'Къде мога да получа TMJ лечение в Пловдив?', a: 'Има специализирани дентални клиники с опит в челюстни дисфункции.' },
      { q: 'Какво причинява TMJ проблемите?', a: 'Причините включват стрес, скърцане със зъби, травма или неправилна захапка.' },
      { q: 'Помага ли масаж при TMJ?', a: 'Да, масажът на челюстните мускули е част от терапията.' },
      { q: 'Трябва ли да нося шина през деня?', a: 'Зависи от случая - някои пациенти носят шина само нощем, други и през деня.' },
      { q: 'Може ли TMJ да се излекува напълно?', a: 'При повечето пациенти симптомите значително намаляват или изчезват с правилно лечение.' }
    ]
  },
  varna: {
    orthodontics: [
      { q: 'Какви са цените за брекети във Варна?', a: 'Металните брекети струват ориентировъчно от 2,000 до 3,500 лв, керамичните от 3,000 до 5,000 лв.' },
      { q: 'Има ли Invisalign във Варна?', a: 'Да, има сертифицирани доставчици на Invisalign във Варна.' },
      { q: 'За колко време може да се постигне резултат?', a: 'Зависи от случая - от 6 месеца за леки корекции до 24 месеца за сложни.' },
      { q: 'Какво включва консултацията?', a: 'Преглед, снимки, анализ и план за лечение с цена.' },
      { q: 'Може ли ортодонтия за възрастни?', a: 'Да, все повече възрастни избират ортодонтско лечение.' }
    ],
    implants: [
      { q: 'Къде мога да поставя импланти във Варна?', a: 'Варна има множество модерни клиники със специалисти по имплантология.' },
      { q: 'Какъв е периодът на възстановяване?', a: 'Костта зараства около импланта за 3-6 месеца преди поставяне на короната.' },
      { q: 'Цените по-ниски ли са от София?', a: 'Да, обикновено цените във Варна са с 10-20% по-ниски. Цените са ориентировъчни.' },
      { q: 'Какви са противопоказанията?', a: 'Диабет, остеопороза, пушене могат да усложнят, но не изключват имплантиране.' },
      { q: 'Може ли при пародонтит?', a: 'Първо трябва да се стабилизира пародонтитът, след това е възможно.' }
    ],
    'cosmetic-dentistry': [
      { q: 'Какви естетични услуги има във Варна?', a: 'Варна предлага пълен спектър - избелване, фасети, коронки, Hollywood Smile.' },
      { q: 'Какво е Hollywood Smile?', a: 'Пълна трансформация на усмивката с фасети или коронки на всички видими зъби.' },
      { q: 'Безопасно ли е избелването?', a: 'Да, професионалното избелване е безопасно и не уврежда емайла.' },
      { q: 'Колко бързо ще видя резултат?', a: 'При избелване резултатът е веднага, при фасети - след 1-2 седмици.' },
      { q: 'Какви материали се използват за фасети?', a: 'Порцелан (керамика) или композит, като порцеланът е по-траен.' }
    ],
    'sleep-airway': [
      { q: 'Предлага ли се лечение на апнея във Варна?', a: 'Да, има специалисти, които изработват индивидуални орални апарати.' },
      { q: 'Какъв тип апарат е най-добър?', a: 'Мандибуларните устройства са най-често препоръчвани и ефективни.' },
      { q: 'Колко е цената ориентировъчно?', a: 'Цените варират от 700 до 1,800 лв в зависимост от типа апарат.' },
      { q: 'Работят ли апаратите при хъркане без апнея?', a: 'Да, те са ефективни и само при хъркане.' },
      { q: 'Какви са страничните ефекти?', a: 'Възможна е лека болка в челюстта или зъбите в началото на адаптацията.' }
    ],
    tmj: [
      { q: 'Има ли TMJ специалисти във Варна?', a: 'Да, има дентални лекари със специализация в челюстни дисфункции.' },
      { q: 'Как се диагностицира TMJ?', a: 'Чрез клиничен преглед, снимки и понякога MRI на ставата.' },
      { q: 'Какви са опциите за лечение?', a: 'Шини, физиотерапия, медикаменти, в редки случаи хирургия.' },
      { q: 'Покрива ли каската лечението?', a: 'Частично - диагностиката може да бъде покрита.' },
      { q: 'Може ли стресът да причини TMJ?', a: 'Да, стресът води до стискане на зъбите и напрежение в челюстта.' }
    ]
  }
};

// City-specific pricing ranges (ориентировъчни)
export const CITY_PRICING: Record<string, Record<string, { min: number; max: number; note: string }>> = {
  sofia: {
    orthodontics: { min: 2500, max: 8000, note: 'В зависимост от типа (брекети/алайнери) и сложността' },
    implants: { min: 800, max: 2500, note: 'На имплант, без короната' },
    'cosmetic-dentistry': { min: 200, max: 1200, note: 'От избелване до порцеланови фасети на зъб' },
    'sleep-airway': { min: 800, max: 2000, note: 'За индивидуален орален апарат' },
    tmj: { min: 300, max: 1500, note: 'В зависимост от диагностиката и терапията' }
  },
  plovdiv: {
    orthodontics: { min: 2200, max: 7000, note: 'В зависимост от типа (брекети/алайнери) и сложността' },
    implants: { min: 700, max: 2200, note: 'На имплант, без короната' },
    'cosmetic-dentistry': { min: 180, max: 1000, note: 'От избелване до порцеланови фасети на зъб' },
    'sleep-airway': { min: 700, max: 1800, note: 'За индивидуален орален апарат' },
    tmj: { min: 250, max: 1300, note: 'В зависимост от диагностиката и терапията' }
  },
  varna: {
    orthodontics: { min: 2000, max: 6500, note: 'В зависимост от типа (брекети/алайнери) и сложността' },
    implants: { min: 650, max: 2000, note: 'На имплант, без короната' },
    'cosmetic-dentistry': { min: 170, max: 950, note: 'От избелване до порцеланови фасети на зъб' },
    'sleep-airway': { min: 700, max: 1800, note: 'За индивидуален орален апарат' },
    tmj: { min: 250, max: 1200, note: 'В зависимост от диагностиката и терапията' }
  }
};

export const getQuizQuestions = (treatmentType: string, cityName: string) => {
  const canVisitQuestion = {
    id: 'can_visit',
    question: `Можете ли да посетите клиника в ${cityName}?`,
    questionEn: `Can you visit a clinic in ${cityName}?`,
    type: 'travel',
    options: [
      { value: 'yes', label: 'Да', labelEn: 'Yes' },
      { value: 'no', label: 'Не', labelEn: 'No' }
    ]
  };

  if (treatmentType === 'orthodontics') {
    return [
      {
        id: 'seriousness',
        question: 'Колко сериозно обмисляте подреждане на зъбите?',
        questionEn: 'How seriously are you considering teeth alignment?',
        options: [
          { value: 'searching', label: 'Активно търся решение', labelEn: 'Actively looking for a solution' },
          { value: 'considering', label: 'Обмислям', labelEn: 'Considering' },
          { value: 'browsing', label: 'Просто разглеждам', labelEn: 'Just browsing' }
        ]
      },
      {
        id: 'timing',
        question: 'Кога искате да започнете?',
        questionEn: 'When do you want to start?',
        options: [
          { value: '0-3', label: '0–3 месеца', labelEn: '0–3 months' },
          { value: '3-6', label: '3–6 месеца', labelEn: '3–6 months' },
          { value: '6+', label: '6+ месеца', labelEn: '6+ months' },
          { value: 'not_sure', label: 'Не съм сигурен', labelEn: 'Not sure' }
        ]
      },
      {
        id: 'importance',
        question: 'Кое е най-важно за вас?',
        questionEn: 'What is most important to you?',
        options: [
          { value: 'quality', label: 'Качество и дългосрочен резултат', labelEn: 'Quality and long-term results' },
          { value: 'comfort', label: 'Комфорт и дискретност', labelEn: 'Comfort and discretion' },
          { value: 'price', label: 'Най-ниска цена', labelEn: 'Lowest price' }
        ]
      },
      {
        id: 'readiness',
        question: 'Готови ли сте да пристъпите към качествено дентално решение?',
        questionEn: 'Are you ready to proceed with a quality dental solution?',
        options: [
          { value: 'yes', label: 'Да', labelEn: 'Yes' },
          { value: 'maybe', label: 'Възможно е', labelEn: 'Maybe' },
          { value: 'no', label: 'Не', labelEn: 'No' }
        ]
      },
      canVisitQuestion
    ];
  }

  if (treatmentType === 'implants') {
    return [
      {
        id: 'missing_teeth',
        question: 'Колко липсващи зъба имате?',
        questionEn: 'How many missing teeth do you have?',
        options: [
          { value: '1-2', label: '1–2', labelEn: '1–2' },
          { value: '3-5', label: '3–5', labelEn: '3–5' },
          { value: '6+', label: '6+', labelEn: '6+' }
        ]
      },
      {
        id: 'timing',
        question: 'Кога искате да решите проблема?',
        questionEn: 'When do you want to solve the problem?',
        options: [
          { value: '0-3', label: '0–3 месеца', labelEn: '0–3 months' },
          { value: '3-6', label: '3–6 месеца', labelEn: '3–6 months' },
          { value: '6+', label: '6+ месеца', labelEn: '6+ months' },
          { value: 'not_sure', label: 'Не съм сигурен', labelEn: 'Not sure' }
        ]
      },
      {
        id: 'importance',
        question: 'Кое е най-важно за вас?',
        questionEn: 'What is most important to you?',
        options: [
          { value: 'quality', label: 'Качество и дългосрочен резултат', labelEn: 'Quality and long-term results' },
          { value: 'speed', label: 'Бързина', labelEn: 'Speed' },
          { value: 'price', label: 'Най-ниска цена', labelEn: 'Lowest price' }
        ]
      },
      {
        id: 'readiness',
        question: 'Готови ли сте да пристъпите към качествено дентално решение?',
        questionEn: 'Are you ready to proceed with a quality dental solution?',
        options: [
          { value: 'yes', label: 'Да', labelEn: 'Yes' },
          { value: 'maybe', label: 'Възможно е', labelEn: 'Maybe' },
          { value: 'no', label: 'Не', labelEn: 'No' }
        ]
      },
      canVisitQuestion
    ];
  }

  // cosmetic-dentistry, sleep-airway, tmj
  return [
    {
      id: 'main_problem',
      question: 'Кой е основният ви проблем?',
      questionEn: 'What is your main problem?',
      options: [
        { value: 'function', label: 'Функционален проблем', labelEn: 'Functional problem' },
        { value: 'aesthetic', label: 'Естетика', labelEn: 'Aesthetics' },
        { value: 'pain', label: 'Болка или дискомфорт', labelEn: 'Pain or discomfort' }
      ]
    },
    {
      id: 'timing',
      question: 'Кога искате да започнете?',
      questionEn: 'When do you want to start?',
      options: [
        { value: '0-3', label: '0–3 месеца', labelEn: '0–3 months' },
        { value: '3-6', label: '3–6 месеца', labelEn: '3–6 months' },
        { value: '6+', label: '6+ месеца', labelEn: '6+ months' },
        { value: 'not_sure', label: 'Не съм сигурен', labelEn: 'Not sure' }
      ]
    },
    {
      id: 'importance',
      question: 'Кое е най-важно за вас?',
      questionEn: 'What is most important to you?',
      options: [
        { value: 'quality', label: 'Дългосрочен резултат', labelEn: 'Long-term results' },
        { value: 'price', label: 'Най-ниска цена', labelEn: 'Lowest price' }
      ]
    },
    {
      id: 'readiness',
      question: 'Готови ли сте за консултация?',
      questionEn: 'Are you ready for a consultation?',
      options: [
        { value: 'yes', label: 'Да', labelEn: 'Yes' },
        { value: 'maybe', label: 'Възможно е', labelEn: 'Maybe' },
        { value: 'no', label: 'Не', labelEn: 'No' }
      ]
    },
    canVisitQuestion
  ];
};
