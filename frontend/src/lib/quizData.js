export const CITIES = {
  sofia: { slug: 'sofia', name: 'София' },
  plovdiv: { slug: 'plovdiv', name: 'Пловдив' },
  varna: { slug: 'varna', name: 'Варна' },
  haskovo: { slug: 'haskovo', name: 'Хасково' }
};

export const TREATMENTS = {
  invisalign: { slug: 'invisalign', name: 'Invisalign', description: 'Невидимо подреждане на зъбите' },
  implants: { slug: 'implants', name: 'Зъбни импланти', description: 'Трайно решение за липсващи зъби' },
  'full-mouth': { slug: 'full-mouth', name: 'Пълна възстановителна терапия', description: 'Комплексно възстановяване' }
};

export const getQuizQuestions = (treatmentType, cityName) => {
  const canVisitQuestion = {
    id: 'can_visit',
    question: `Можете ли да посетите клиника в ${cityName}?`,
    type: 'travel',
    options: [
      { value: 'yes', label: 'Да' },
      { value: 'no', label: 'Не' }
    ]
  };

  if (treatmentType === 'invisalign') {
    return [
      {
        id: 'seriousness',
        question: 'Колко сериозно обмисляте подреждане на зъбите?',
        options: [
          { value: 'searching', label: 'Активно търся решение' },
          { value: 'considering', label: 'Обмислям' },
          { value: 'browsing', label: 'Просто разглеждам' }
        ]
      },
      {
        id: 'timing',
        question: 'Кога искате да започнете?',
        options: [
          { value: '0-3', label: '0–3 месеца' },
          { value: '3-6', label: '3–6 месеца' },
          { value: '6+', label: '6+ месеца' },
          { value: 'not_sure', label: 'Не съм сигурен' }
        ]
      },
      {
        id: 'importance',
        question: 'Кое е най-важно за вас?',
        options: [
          { value: 'quality', label: 'Качество и дългосрочен резултат' },
          { value: 'comfort', label: 'Комфорт и дискретност' },
          { value: 'price', label: 'Най-ниска цена' }
        ]
      },
      {
        id: 'previous_ortho',
        question: 'Имате ли предишно ортодонтско лечение?',
        options: [
          { value: 'yes', label: 'Да' },
          { value: 'no', label: 'Не' }
        ]
      },
      {
        id: 'bite_problem',
        question: 'Имате ли проблем със захапката или дискомфорт?',
        options: [
          { value: 'yes', label: 'Да' },
          { value: 'no', label: 'Не' }
        ]
      },
      {
        id: 'readiness',
        question: 'Готови ли сте да пристъпите към качествено дентално решение при одобрение?',
        options: [
          { value: 'yes', label: 'Да' },
          { value: 'maybe', label: 'Възможно е' },
          { value: 'no', label: 'Не' }
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
        options: [
          { value: '1-2', label: '1–2' },
          { value: '3-5', label: '3–5' },
          { value: '6+', label: '6+' }
        ]
      },
      {
        id: 'chewing_difficulty',
        question: 'Имате ли затруднение с дъвченето?',
        options: [
          { value: 'yes', label: 'Да' },
          { value: 'sometimes', label: 'Понякога' },
          { value: 'no', label: 'Не' }
        ]
      },
      {
        id: 'pain',
        question: 'Имате ли болка или възпаление?',
        options: [
          { value: 'yes', label: 'Да' },
          { value: 'no', label: 'Не' }
        ]
      },
      {
        id: 'timing',
        question: 'Кога искате да решите проблема?',
        options: [
          { value: '0-3', label: '0–3 месеца' },
          { value: '3-6', label: '3–6 месеца' },
          { value: '6+', label: '6+ месеца' },
          { value: 'not_sure', label: 'Не съм сигурен' }
        ]
      },
      {
        id: 'importance',
        question: 'Кое е най-важно за вас?',
        options: [
          { value: 'quality', label: 'Качество и дългосрочен резултат' },
          { value: 'speed', label: 'Бързина' },
          { value: 'price', label: 'Най-ниска цена' }
        ]
      },
      {
        id: 'readiness',
        question: 'Готови ли сте да пристъпите към качествено дентално решение?',
        options: [
          { value: 'yes', label: 'Да' },
          { value: 'maybe', label: 'Възможно е' },
          { value: 'no', label: 'Не' }
        ]
      },
      canVisitQuestion
    ];
  }

  // full-mouth
  return [
    {
      id: 'situation',
      question: 'Какво описва ситуацията ви?',
      options: [
        { value: 'many_missing', label: 'Много липсващи/разрушени зъби' },
        { value: 'worn', label: 'Силно износване' },
        { value: 'aesthetic', label: 'Основно естетика' }
      ]
    },
    {
      id: 'main_problem',
      question: 'Кой е основният ви проблем?',
      options: [
        { value: 'function', label: 'Функция/дъвчене/болка' },
        { value: 'aesthetic', label: 'Естетика' },
        { value: 'curiosity', label: 'Любопитство' }
      ]
    },
    {
      id: 'consulted_before',
      question: 'Консултирали ли сте се преди?',
      options: [
        { value: 'yes', label: 'Да' },
        { value: 'no', label: 'Не' }
      ]
    },
    {
      id: 'timing',
      question: 'Кога искате да започнете?',
      options: [
        { value: '0-3', label: '0–3 месеца' },
        { value: '3-6', label: '3–6 месеца' },
        { value: '6+', label: '6+ месеца' },
        { value: 'not_sure', label: 'Не съм сигурен' }
      ]
    },
    {
      id: 'importance',
      question: 'Кое е най-важно за вас?',
      options: [
        { value: 'quality', label: 'Дългосрочен резултат' },
        { value: 'price', label: 'Най-ниска цена' }
      ]
    },
    {
      id: 'complex_plan',
      question: 'Готови ли сте за комплексен план с няколко посещения?',
      options: [
        { value: 'yes', label: 'Да' },
        { value: 'maybe', label: 'Възможно е' },
        { value: 'no', label: 'Не' }
      ]
    },
    canVisitQuestion
  ];
};
