// Translations for Bulgarian (BG) and English (EN)

export const translations = {
  bg: {
    // Navigation
    nav: {
      home: 'Начало',
      contact: 'Контакти',
      symptoms: 'Симптоми',
      privacy: 'Поверителност',
      terms: 'Условия'
    },
    
    // Home Page
    home: {
      title: 'Изберете вашия град',
      subtitle: 'Намерете най-добрата дентална клиника във вашия регион',
      seeOptions: 'Избери',
      tagline: 'Навигатор за дентални решения'
    },
    
    // Treatment Selection
    treatments: {
      title: 'Изберете лечение',
      subtitle: 'в',
      orthodontics: {
        name: 'Ортодонтско лечение',
        description: 'Алайнери и брекети'
      },
      implants: {
        name: 'Зъбни импланти',
        description: 'Трайно решение за липсващи зъби'
      },
      'full-mouth': {
        name: 'Пълна възстановителна терапия',
        description: 'Комплексно възстановяване'
      },
      bonding: {
        name: 'Естетика на усмивката',
        description: 'Бондинг, форма, дължина'
      },
      startQuiz: 'Започни теста'
    },
    
    // Quiz
    quiz: {
      question: 'Въпрос',
      of: 'от',
      next: 'Напред',
      back: 'Назад',
      submit: 'Изпрати',
      loading: 'Зареждане...',
      canVisit: 'Можете ли да посетите клиника в'
    },
    
    // Quiz Questions - Invisalign
    invisalign: {
      seriousness: {
        question: 'Колко сериозно обмисляте подреждане на зъбите?',
        searching: 'Активно търся решение',
        considering: 'Обмислям',
        browsing: 'Просто разглеждам'
      },
      timing: {
        question: 'Кога искате да започнете?',
        '0-3': '0–3 месеца',
        '3-6': '3–6 месеца',
        '6+': '6+ месеца',
        not_sure: 'Не съм сигурен'
      },
      importance: {
        question: 'Кое е най-важно за вас?',
        quality: 'Качество и дългосрочен резултат',
        comfort: 'Комфорт и дискретност',
        price: 'Най-ниска цена'
      },
      previous_ortho: {
        question: 'Имате ли предишно ортодонтско лечение?',
        yes: 'Да',
        no: 'Не'
      },
      bite_problem: {
        question: 'Имате ли проблем със захапката или дискомфорт?',
        yes: 'Да',
        no: 'Не'
      },
      readiness: {
        question: 'Готови ли сте да пристъпите към качествено дентално решение при одобрение?',
        yes: 'Да',
        maybe: 'Възможно е',
        no: 'Не'
      }
    },
    
    // Quiz Questions - Implants
    implants: {
      missing_teeth: {
        question: 'Колко липсващи зъба имате?',
        '1-2': '1–2',
        '3-5': '3–5',
        '6+': '6+'
      },
      chewing_difficulty: {
        question: 'Имате ли затруднение с дъвченето?',
        yes: 'Да',
        sometimes: 'Понякога',
        no: 'Не'
      },
      pain: {
        question: 'Имате ли болка или възпаление?',
        yes: 'Да',
        no: 'Не'
      },
      timing: {
        question: 'Кога искате да решите проблема?',
        '0-3': '0–3 месеца',
        '3-6': '3–6 месеца',
        '6+': '6+ месеца',
        not_sure: 'Не съм сигурен'
      },
      importance: {
        question: 'Кое е най-важно за вас?',
        quality: 'Качество и дългосрочен резултат',
        speed: 'Бързина',
        price: 'Най-ниска цена'
      },
      readiness: {
        question: 'Готови ли сте да пристъпите към качествено дентално решение?',
        yes: 'Да',
        maybe: 'Възможно е',
        no: 'Не'
      }
    },
    
    // Quiz Questions - Full Mouth
    fullMouth: {
      situation: {
        question: 'Какво описва ситуацията ви?',
        many_missing: 'Много липсващи/разрушени зъби',
        worn: 'Силно износване',
        aesthetic: 'Основно естетика'
      },
      main_problem: {
        question: 'Кой е основният ви проблем?',
        function: 'Функция/дъвчене/болка',
        aesthetic: 'Естетика',
        curiosity: 'Любопитство'
      },
      consulted_before: {
        question: 'Консултирали ли сте се преди?',
        yes: 'Да',
        no: 'Не'
      },
      timing: {
        question: 'Кога искате да започнете?',
        '0-3': '0–3 месеца',
        '3-6': '3–6 месеца',
        '6+': '6+ месеца',
        not_sure: 'Не съм сигурен'
      },
      importance: {
        question: 'Кое е най-важно за вас?',
        quality: 'Дългосрочен резултат',
        price: 'Най-ниска цена'
      },
      complex_plan: {
        question: 'Готови ли сте за комплексен план с няколко посещения?',
        yes: 'Да',
        maybe: 'Възможно е',
        no: 'Не'
      }
    },
    
    // Results Page
    results: {
      green: {
        title: 'Благодарим. Ще се свържем с вас, за да обсъдим вашия случай.',
        cta: 'Заяви обаждане'
      },
      yellow: {
        title: 'Благодарим. Ще се свържем с вас, за да обсъдим вашия случай.',
        cta: 'Заяви обаждане'
      },
      red: {
        title: 'Благодарим. Ще се свържем с вас, за да обсъдим вашия случай.',
        cta: 'Заяви обаждане'
      },
      points: 'точки',
      form: {
        name: 'Име',
        namePlaceholder: 'Вашето име',
        phone: 'Телефон',
        email: 'Имейл',
        consent: 'Съгласен/а съм с',
        privacyPolicy: 'Политиката за поверителност',
        submit: 'Изпрати',
        thankYou: 'Благодарим. Ще се свържем с вас, за да обсъдим вашия случай.',
        willContact: '',
        toHome: 'Към началото',
        consentRequired: 'Моля, дайте съгласие',
        fillAll: 'Попълнете всички полета',
        enterEmail: 'Въведете имейл',
        sent: 'Изпратено!',
        error: 'Грешка'
      }
    },
    
    // Cities
    cities: {
      sofia: 'София',
      plovdiv: 'Пловдив',
      varna: 'Варна'
    },
    
    // Footer
    footer: {
      tagline: 'Навигатор за дентални решения',
      info: 'Информация',
      cities: 'Градове'
    },
    
    // Common
    common: {
      yes: 'Да',
      no: 'Не',
      loading: 'Зареждане...',
      notFound: 'Не е намерено',
      error: 'Грешка при зареждане'
    },
    
    // Contact Page
    contact: {
      title: 'Свържете се с нас',
      subtitle: 'Имате въпроси? Ние сме тук да помогнем.',
      emailLabel: 'Имейл',
      phoneLabel: 'Телефон',
      addressLabel: 'Адрес'
    }
  },
  
  en: {
    // Navigation
    nav: {
      home: 'Home',
      contact: 'Contact',
      symptoms: 'Symptoms',
      privacy: 'Privacy',
      terms: 'Terms'
    },
    
    // Home Page
    home: {
      title: 'Choose your city',
      subtitle: 'Find the best dental clinic in your region',
      seeOptions: 'See options'
    },
    
    // Treatment Selection
    treatments: {
      title: 'Choose treatment',
      subtitle: 'in',
      orthodontics: {
        name: 'Orthodontic Treatment',
        description: 'Aligners and braces'
      },
      implants: {
        name: 'Dental Implants',
        description: 'Permanent solution for missing teeth'
      },
      'full-mouth': {
        name: 'Full Mouth Restoration',
        description: 'Comprehensive restoration'
      },
      bonding: {
        name: 'Smile Aesthetics',
        description: 'Bonding, shape, length'
      },
      startQuiz: 'Start assessment'
    },
    
    // Quiz
    quiz: {
      question: 'Question',
      of: 'of',
      next: 'Next',
      back: 'Back',
      submit: 'Submit',
      loading: 'Loading...',
      canVisit: 'Can you visit a clinic in'
    },
    
    // Quiz Questions - Invisalign
    invisalign: {
      seriousness: {
        question: 'How seriously are you considering teeth alignment?',
        searching: 'Actively looking for a solution',
        considering: 'Considering',
        browsing: 'Just browsing'
      },
      timing: {
        question: 'When do you want to start?',
        '0-3': '0–3 months',
        '3-6': '3–6 months',
        '6+': '6+ months',
        not_sure: 'Not sure'
      },
      importance: {
        question: 'What is most important to you?',
        quality: 'Quality and long-term results',
        comfort: 'Comfort and discretion',
        price: 'Lowest price'
      },
      previous_ortho: {
        question: 'Do you have previous orthodontic treatment?',
        yes: 'Yes',
        no: 'No'
      },
      bite_problem: {
        question: 'Do you have bite problems or discomfort?',
        yes: 'Yes',
        no: 'No'
      },
      readiness: {
        question: 'Are you ready to proceed with a quality dental solution if approved?',
        yes: 'Yes',
        maybe: 'Maybe',
        no: 'No'
      }
    },
    
    // Quiz Questions - Implants
    implants: {
      missing_teeth: {
        question: 'How many missing teeth do you have?',
        '1-2': '1–2',
        '3-5': '3–5',
        '6+': '6+'
      },
      chewing_difficulty: {
        question: 'Do you have difficulty chewing?',
        yes: 'Yes',
        sometimes: 'Sometimes',
        no: 'No'
      },
      pain: {
        question: 'Do you have pain or inflammation?',
        yes: 'Yes',
        no: 'No'
      },
      timing: {
        question: 'When do you want to solve the problem?',
        '0-3': '0–3 months',
        '3-6': '3–6 months',
        '6+': '6+ months',
        not_sure: 'Not sure'
      },
      importance: {
        question: 'What is most important to you?',
        quality: 'Quality and long-term results',
        speed: 'Speed',
        price: 'Lowest price'
      },
      readiness: {
        question: 'Are you ready to proceed with a quality dental solution?',
        yes: 'Yes',
        maybe: 'Maybe',
        no: 'No'
      }
    },
    
    // Quiz Questions - Full Mouth
    fullMouth: {
      situation: {
        question: 'What describes your situation?',
        many_missing: 'Many missing/damaged teeth',
        worn: 'Severely worn teeth',
        aesthetic: 'Mainly aesthetics'
      },
      main_problem: {
        question: 'What is your main problem?',
        function: 'Function/chewing/pain',
        aesthetic: 'Aesthetics',
        curiosity: 'Curiosity'
      },
      consulted_before: {
        question: 'Have you consulted before?',
        yes: 'Yes',
        no: 'No'
      },
      timing: {
        question: 'When do you want to start?',
        '0-3': '0–3 months',
        '3-6': '3–6 months',
        '6+': '6+ months',
        not_sure: 'Not sure'
      },
      importance: {
        question: 'What is most important to you?',
        quality: 'Long-term results',
        price: 'Lowest price'
      },
      complex_plan: {
        question: 'Are you ready for a complex plan with multiple visits?',
        yes: 'Yes',
        maybe: 'Maybe',
        no: 'No'
      }
    },
    
    // Results Page
    results: {
      green: {
        title: 'Thank you. We will contact you to discuss your case.',
        cta: 'Request a Call'
      },
      yellow: {
        title: 'Thank you. We will contact you to discuss your case.',
        cta: 'Request a Call'
      },
      red: {
        title: 'Thank you. We will contact you to discuss your case.',
        cta: 'Request a Call'
      },
      points: 'points',
      form: {
        name: 'Name',
        namePlaceholder: 'Your name',
        phone: 'Phone',
        email: 'Email',
        consent: 'I agree to the',
        privacyPolicy: 'Privacy Policy',
        submit: 'Submit',
        thankYou: 'Thank you!',
        willContact: 'We will contact you within 24 hours.',
        toHome: 'Go to home',
        consentRequired: 'Please give consent',
        fillAll: 'Fill in all fields',
        enterEmail: 'Enter email',
        sent: 'Sent!',
        error: 'Error'
      }
    },
    
    // Cities
    cities: {
      sofia: 'Sofia',
      plovdiv: 'Plovdiv',
      varna: 'Varna'
    },
    
    // Footer
    footer: {
      tagline: 'Navigator for dental solutions',
      info: 'Information',
      cities: 'Cities'
    },
    
    // Common
    common: {
      yes: 'Yes',
      no: 'No',
      loading: 'Loading...',
      notFound: 'Not found',
      error: 'Error loading'
    },
    
    // Contact Page
    contact: {
      title: 'Contact us',
      subtitle: 'Have questions? We are here to help.',
      emailLabel: 'Email',
      phoneLabel: 'Phone',
      addressLabel: 'Address'
    }
  }
};

export const getTranslation = (lang, path) => {
  const keys = path.split('.');
  let result = translations[lang];
  for (const key of keys) {
    if (result && result[key] !== undefined) {
      result = result[key];
    } else {
      // Fallback to Bulgarian if not found
      result = translations.bg;
      for (const k of keys) {
        if (result && result[k] !== undefined) {
          result = result[k];
        } else {
          return path; // Return path if not found in fallback
        }
      }
      break;
    }
  }
  return result;
};
