// Quiz questions data for all treatment types
// City question removed - now using city_slug from URL
// Added travel question to all quizzes

export const invisalignQuiz = {
  id: 'invisalign',
  title: 'Invisalign',
  subtitle: 'Невидимо подреждане на зъбите',
  estimatedTime: '60-90 секунди',
  questions: [
    {
      id: 'seriousness',
      question: 'Колко сериозно обмисляте подреждане на зъбите?',
      type: 'single',
      options: [
        { value: 'searching', label: 'Активно търся решение', points: 15 },
        { value: 'considering', label: 'Обмислям го', points: 8 },
        { value: 'browsing', label: 'Просто разглеждам', points: 2 },
      ],
    },
    {
      id: 'timing',
      question: 'Кога искате да започнете лечението?',
      type: 'single',
      options: [
        { value: '0-3', label: 'В следващите 0-3 месеца', points: 15 },
        { value: '3-6', label: 'След 3-6 месеца', points: 10 },
        { value: '6+', label: 'След повече от 6 месеца', points: 5 },
        { value: 'not_sure', label: 'Не съм сигурен/а', points: 4 },
      ],
    },
    {
      id: 'importance',
      question: 'Кое е най-важно за вас?',
      type: 'single',
      options: [
        { value: 'quality', label: 'Качество и дългосрочен резултат', points: 15 },
        { value: 'comfort', label: 'Комфорт и дискретност', points: 10 },
        { value: 'price', label: 'Най-ниска цена', points: 0 },
      ],
    },
    {
      id: 'previous_ortho',
      question: 'Имали ли сте ортодонтско лечение преди?',
      type: 'single',
      options: [
        { value: 'yes', label: 'Да', points: 6 },
        { value: 'no', label: 'Не', points: 5 },
      ],
    },
    {
      id: 'pain_bite',
      question: 'Имате ли болка или проблем със захапката?',
      type: 'single',
      options: [
        { value: 'yes', label: 'Да', points: 8 },
        { value: 'no', label: 'Не', points: 5 },
      ],
    },
    {
      id: 'readiness',
      question: 'Готови ли сте да инвестирате в премиум лечение, ако сте клинично одобрени?',
      type: 'single',
      options: [
        { value: 'yes', label: 'Да, готов/а съм', points: 20 },
        { value: 'maybe', label: 'Възможно е', points: 10 },
        { value: 'no', label: 'Не', points: 0 },
      ],
    },
    {
      id: 'call_availability',
      question: 'Кога можете да отговорите на телефонно обаждане?',
      type: 'single',
      options: [
        { value: 'today', label: 'Днес или утре', points: 6 },
        { value: '3days', label: 'До 3 дни', points: 4 },
        { value: 'week', label: 'След седмица', points: 1 },
      ],
    },
    {
      id: 'can_travel',
      question: 'Можете ли да посетите клиника в {cityName} (до ~30 мин път)?',
      type: 'travel',
      options: [
        { value: 'yes', label: 'Да, мога' },
        { value: 'no', label: 'Не, не мога' },
      ],
    },
  ],
};

export const implantsQuiz = {
  id: 'implants',
  title: 'Зъбни импланти',
  subtitle: 'Трайно решение за липсващи зъби',
  estimatedTime: '60-90 секунди',
  questions: [
    {
      id: 'missing_teeth',
      question: 'Колко липсващи зъба имате?',
      type: 'single',
      options: [
        { value: '1-2', label: '1-2 зъба', points: 10 },
        { value: '3-5', label: '3-5 зъба', points: 12 },
        { value: '6+', label: '6 или повече', points: 15 },
      ],
    },
    {
      id: 'chewing_issues',
      question: 'Имате ли проблеми с дъвченето или комфорта?',
      type: 'single',
      options: [
        { value: 'yes', label: 'Да, постоянно', points: 15 },
        { value: 'sometimes', label: 'Понякога', points: 8 },
        { value: 'no', label: 'Не', points: 3 },
      ],
    },
    {
      id: 'pain_inflammation',
      question: 'Имате ли болка или възпаление в областта?',
      type: 'single',
      options: [
        { value: 'yes', label: 'Да', points: 12 },
        { value: 'no', label: 'Не', points: 6 },
      ],
    },
    {
      id: 'timing',
      question: 'Кога искате да решите проблема?',
      type: 'single',
      options: [
        { value: '0-3', label: 'В следващите 0-3 месеца', points: 15 },
        { value: '3-6', label: 'След 3-6 месеца', points: 10 },
        { value: '6+', label: 'След повече от 6 месеца', points: 5 },
        { value: 'not_sure', label: 'Не съм сигурен/а', points: 4 },
      ],
    },
    {
      id: 'importance',
      question: 'Кое е най-важно за вас?',
      type: 'single',
      options: [
        { value: 'quality', label: 'Качество и дълготрайност', points: 15 },
        { value: 'speed', label: 'Бързина на лечението', points: 8 },
        { value: 'price', label: 'Най-ниска цена', points: 0 },
      ],
    },
    {
      id: 'readiness',
      question: 'Готови ли сте да инвестирате в премиум лечение, ако сте клинично одобрени?',
      type: 'single',
      options: [
        { value: 'yes', label: 'Да, готов/а съм', points: 20 },
        { value: 'maybe', label: 'Възможно е', points: 10 },
        { value: 'no', label: 'Не', points: 0 },
      ],
    },
    {
      id: 'can_travel',
      question: 'Можете ли да посетите клиника в {cityName} (до ~30 мин път)?',
      type: 'travel',
      options: [
        { value: 'yes', label: 'Да, мога' },
        { value: 'no', label: 'Не, не мога' },
      ],
    },
  ],
};

export const fullMouthQuiz = {
  id: 'full_mouth',
  title: 'Пълна възстановителна терапия',
  subtitle: 'Комплексно решение за цялостно възстановяване',
  estimatedTime: '90 секунди',
  questions: [
    {
      id: 'situation',
      question: 'Какво описва най-добре вашата ситуация?',
      type: 'single',
      options: [
        { value: 'many_missing', label: 'Много липсващи или разрушени зъби', points: 15 },
        { value: 'worn_aesthetic', label: 'Силно износване или естетични проблеми', points: 12 },
        { value: 'cosmetic', label: 'Само козметични корекции', points: 5 },
      ],
    },
    {
      id: 'main_problem',
      question: 'Кой е основният ви проблем?',
      type: 'single',
      options: [
        { value: 'function', label: 'Функция (дъвчене, болка)', points: 15 },
        { value: 'aesthetic', label: 'Естетика', points: 10 },
        { value: 'curiosity', label: 'Просто любопитство', points: 2 },
      ],
    },
    {
      id: 'consulted_before',
      question: 'Консултирали ли сте се вече с дентален специалист?',
      type: 'single',
      options: [
        { value: 'yes_better', label: 'Да, имам план, но търся по-добър вариант', points: 12 },
        { value: 'no', label: 'Не', points: 8 },
      ],
    },
    {
      id: 'timing',
      question: 'Какъв е вашият времеви хоризонт?',
      type: 'single',
      options: [
        { value: '0-3', label: 'В следващите 0-3 месеца', points: 15 },
        { value: '3-6', label: 'След 3-6 месеца', points: 10 },
        { value: '6+', label: 'След повече от 6 месеца', points: 5 },
        { value: 'not_sure', label: 'Не съм сигурен/а', points: 4 },
      ],
    },
    {
      id: 'importance',
      question: 'Кое е най-важно за вас?',
      type: 'single',
      options: [
        { value: 'quality', label: 'Дългосрочен резултат и качество', points: 15 },
        { value: 'price', label: 'Най-ниска цена', points: 0 },
      ],
    },
    {
      id: 'readiness',
      question: 'Готови ли сте да инвестирате в премиум лечение, ако сте клинично одобрени?',
      type: 'single',
      options: [
        { value: 'yes', label: 'Да, готов/а съм', points: 20 },
        { value: 'maybe', label: 'Възможно е', points: 10 },
        { value: 'no', label: 'Не', points: 0 },
      ],
    },
    {
      id: 'complex_plan_ready',
      question: 'Готови ли сте за комплексен план с няколко посещения?',
      type: 'single',
      options: [
        { value: 'yes', label: 'Да', points: 5 },
        { value: 'no', label: 'Не', points: 0 },
      ],
    },
    {
      id: 'can_travel',
      question: 'Можете ли да посетите клиника в {cityName} (до ~30 мин път)?',
      type: 'travel',
      options: [
        { value: 'yes', label: 'Да, мога' },
        { value: 'no', label: 'Не, не мога' },
      ],
    },
  ],
};

export const getQuizByType = (type) => {
  switch (type) {
    case 'invisalign':
      return invisalignQuiz;
    case 'implants':
      return implantsQuiz;
    case 'full_mouth':
      return fullMouthQuiz;
    default:
      return null;
  }
};
