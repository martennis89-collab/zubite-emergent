export const CITIES = {
  sofia: { slug: 'sofia', name: 'София', nameEn: 'Sofia' },
  plovdiv: { slug: 'plovdiv', name: 'Пловдив', nameEn: 'Plovdiv' },
  varna: { slug: 'varna', name: 'Варна', nameEn: 'Varna' }
} as const;

export const TREATMENTS = {
  orthodontics: { 
    slug: 'orthodontics', 
    name: 'Ортодонтско лечение', 
    nameEn: 'Orthodontic Treatment',
    description: 'Алайнери и брекети',
    descriptionEn: 'Aligners and braces'
  },
  implants: { 
    slug: 'implants', 
    name: 'Зъбни импланти', 
    nameEn: 'Dental Implants',
    description: 'Трайно решение за липсващи зъби',
    descriptionEn: 'Permanent solution for missing teeth'
  },
  'full-mouth': { 
    slug: 'full-mouth', 
    name: 'Пълна възстановителна терапия', 
    nameEn: 'Full Mouth Restoration',
    description: 'Комплексно възстановяване',
    descriptionEn: 'Comprehensive restoration'
  },
  bonding: { 
    slug: 'bonding', 
    name: 'Естетика на усмивката', 
    nameEn: 'Smile Aesthetics',
    description: 'Бондинг, форма, дължина',
    descriptionEn: 'Bonding, shape, length'
  }
} as const;

export type CitySlug = keyof typeof CITIES;
export type TreatmentSlug = keyof typeof TREATMENTS;

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

  if (treatmentType === 'orthodontics' || treatmentType === 'invisalign') {
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
        id: 'previous_ortho',
        question: 'Имате ли предишно ортодонтско лечение?',
        questionEn: 'Do you have previous orthodontic treatment?',
        options: [
          { value: 'yes', label: 'Да', labelEn: 'Yes' },
          { value: 'no', label: 'Не', labelEn: 'No' }
        ]
      },
      {
        id: 'bite_problem',
        question: 'Имате ли проблем със захапката или дискомфорт?',
        questionEn: 'Do you have bite problems or discomfort?',
        options: [
          { value: 'yes', label: 'Да', labelEn: 'Yes' },
          { value: 'no', label: 'Не', labelEn: 'No' }
        ]
      },
      {
        id: 'readiness',
        question: 'Готови ли сте да пристъпите към качествено дентално решение при одобрение?',
        questionEn: 'Are you ready to proceed with a quality dental solution if approved?',
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
        id: 'chewing_difficulty',
        question: 'Имате ли затруднение с дъвченето?',
        questionEn: 'Do you have difficulty chewing?',
        options: [
          { value: 'yes', label: 'Да', labelEn: 'Yes' },
          { value: 'sometimes', label: 'Понякога', labelEn: 'Sometimes' },
          { value: 'no', label: 'Не', labelEn: 'No' }
        ]
      },
      {
        id: 'pain',
        question: 'Имате ли болка или възпаление?',
        questionEn: 'Do you have pain or inflammation?',
        options: [
          { value: 'yes', label: 'Да', labelEn: 'Yes' },
          { value: 'no', label: 'Не', labelEn: 'No' }
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

  // full-mouth and bonding
  return [
    {
      id: 'situation',
      question: 'Какво описва ситуацията ви?',
      questionEn: 'What describes your situation?',
      options: [
        { value: 'many_missing', label: 'Много липсващи/разрушени зъби', labelEn: 'Many missing/damaged teeth' },
        { value: 'worn', label: 'Силно износване', labelEn: 'Severely worn teeth' },
        { value: 'aesthetic', label: 'Основно естетика', labelEn: 'Mainly aesthetics' }
      ]
    },
    {
      id: 'main_problem',
      question: 'Кой е основният ви проблем?',
      questionEn: 'What is your main problem?',
      options: [
        { value: 'function', label: 'Функция/дъвчене/болка', labelEn: 'Function/chewing/pain' },
        { value: 'aesthetic', label: 'Естетика', labelEn: 'Aesthetics' },
        { value: 'curiosity', label: 'Любопитство', labelEn: 'Curiosity' }
      ]
    },
    {
      id: 'consulted_before',
      question: 'Консултирали ли сте се преди?',
      questionEn: 'Have you consulted before?',
      options: [
        { value: 'yes', label: 'Да', labelEn: 'Yes' },
        { value: 'no', label: 'Не', labelEn: 'No' }
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
      id: 'complex_plan',
      question: 'Готови ли сте за комплексен план с няколко посещения?',
      questionEn: 'Are you ready for a complex plan with multiple visits?',
      options: [
        { value: 'yes', label: 'Да', labelEn: 'Yes' },
        { value: 'maybe', label: 'Възможно е', labelEn: 'Maybe' },
        { value: 'no', label: 'Не', labelEn: 'No' }
      ]
    },
    canVisitQuestion
  ];
};
