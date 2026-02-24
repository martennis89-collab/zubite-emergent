// Symptoms data for educational content
export const SYMPTOMS = {
  'tooth-pain': {
    slug: 'tooth-pain',
    icon: 'AlertCircle',
    treatment: 'implants',
    bg: {
      name: 'Зъбобол',
      shortDesc: 'Постоянна или пулсираща болка в зъба',
      description: 'Зъбоболът е един от най-често срещаните дентални проблеми. Може да варира от лека чувствителност до силна, пулсираща болка.',
      causes: [
        'Кариес или разрушен зъб',
        'Инфекция на зъбния корен',
        'Фрактура или напукване на зъба',
        'Износена или повредена пломба',
        'Възпаление на венците (гингивит)'
      ],
      whenToSeek: [
        'Болката продължава повече от 1-2 дни',
        'Имате температура или оток на лицето',
        'Болката е силна и не се облекчава с болкоуспокояващи',
        'Забелязвате гной или лош вкус в устата'
      ],
      treatments: ['Пломбиране', 'Лечение на коренов канал', 'Екстракция', 'Зъбни импланти'],
      ctaText: 'Проверете дали сте подходящ кандидат за лечение'
    },
    en: {
      name: 'Toothache',
      shortDesc: 'Persistent or throbbing tooth pain',
      description: 'Toothache is one of the most common dental problems. It can range from mild sensitivity to severe, throbbing pain.',
      causes: [
        'Cavities or tooth decay',
        'Root infection',
        'Tooth fracture or crack',
        'Worn or damaged filling',
        'Gum inflammation (gingivitis)'
      ],
      whenToSeek: [
        'Pain lasts more than 1-2 days',
        'You have fever or facial swelling',
        'Pain is severe and not relieved by painkillers',
        'You notice pus or bad taste in mouth'
      ],
      treatments: ['Filling', 'Root canal treatment', 'Extraction', 'Dental implants'],
      ctaText: 'Check if you are a suitable candidate for treatment'
    }
  },
  'missing-teeth': {
    slug: 'missing-teeth',
    icon: 'Circle',
    treatment: 'implants',
    bg: {
      name: 'Липсващи зъби',
      shortDesc: 'Един или повече загубени зъби',
      description: 'Липсващите зъби не са само козметичен проблем. Те могат да доведат до сериозни проблеми с дъвченето, говора и здравето на околните зъби.',
      causes: [
        'Напреднал кариес',
        'Пародонтоза (болест на венците)',
        'Травма или инцидент',
        'Генетични фактори',
        'Остаряване'
      ],
      whenToSeek: [
        'Веднага след загуба на зъб',
        'Имате затруднения с дъвченето',
        'Околните зъби започват да се изместват',
        'Изпитвате дискомфорт или болка в областта'
      ],
      treatments: ['Зъбни импланти', 'Мостове', 'Частични протези', 'Пълни протези'],
      ctaText: 'Научете повече за възможностите за възстановяване'
    },
    en: {
      name: 'Missing Teeth',
      shortDesc: 'One or more lost teeth',
      description: 'Missing teeth are not just a cosmetic issue. They can lead to serious problems with chewing, speech, and the health of surrounding teeth.',
      causes: [
        'Advanced tooth decay',
        'Periodontal disease (gum disease)',
        'Trauma or accident',
        'Genetic factors',
        'Aging'
      ],
      whenToSeek: [
        'Immediately after tooth loss',
        'You have difficulty chewing',
        'Surrounding teeth start to shift',
        'You experience discomfort or pain in the area'
      ],
      treatments: ['Dental implants', 'Bridges', 'Partial dentures', 'Full dentures'],
      ctaText: 'Learn more about restoration options'
    }
  },
  'crooked-teeth': {
    slug: 'crooked-teeth',
    icon: 'Shuffle',
    treatment: 'invisalign',
    bg: {
      name: 'Криви зъби',
      shortDesc: 'Неправилно подредени или струпани зъби',
      description: 'Кривите зъби могат да повлияят на вашата усмивка и самочувствие, но също така могат да създадат проблеми с хигиената и здравето на устната кухина.',
      causes: [
        'Генетични фактори',
        'Преждевременна загуба на млечни зъби',
        'Лоши навици в детството (смучене на палец)',
        'Малка челюст',
        'Травма или инцидент'
      ],
      whenToSeek: [
        'Зъбите ви пречат на правилното захапване',
        'Трудно почиствате между зъбите',
        'Изпитвате болка в челюстта',
        'Искате да подобрите усмивката си'
      ],
      treatments: ['Invisalign (невидими шини)', 'Традиционни брекети', 'Лингвални брекети', 'Ретейнери'],
      ctaText: 'Разберете дали Invisalign е подходящ за вас'
    },
    en: {
      name: 'Crooked Teeth',
      shortDesc: 'Misaligned or crowded teeth',
      description: 'Crooked teeth can affect your smile and self-confidence, but they can also create problems with hygiene and oral health.',
      causes: [
        'Genetic factors',
        'Early loss of baby teeth',
        'Bad childhood habits (thumb sucking)',
        'Small jaw',
        'Trauma or accident'
      ],
      whenToSeek: [
        'Your teeth interfere with proper bite',
        'Difficulty cleaning between teeth',
        'You experience jaw pain',
        'You want to improve your smile'
      ],
      treatments: ['Invisalign (clear aligners)', 'Traditional braces', 'Lingual braces', 'Retainers'],
      ctaText: 'Find out if Invisalign is right for you'
    }
  },
  'gum-problems': {
    slug: 'gum-problems',
    icon: 'Droplet',
    treatment: 'full-mouth',
    bg: {
      name: 'Проблеми с венците',
      shortDesc: 'Кървене, оток или отдръпване на венците',
      description: 'Проблемите с венците са сериозен сигнал, който не бива да се пренебрегва. Нелекуваната пародонтоза може да доведе до загуба на зъби.',
      causes: [
        'Лоша устна хигиена',
        'Натрупване на плака и зъбен камък',
        'Пушене',
        'Хормонални промени',
        'Диабет и други системни заболявания'
      ],
      whenToSeek: [
        'Венците ви кървят при миене на зъби',
        'Венците са червени, подути или болезнени',
        'Имате лош дъх, който не изчезва',
        'Зъбите ви изглеждат по-дълги (отдръпване на венците)'
      ],
      treatments: ['Професионално почистване', 'Дълбоко почистване', 'Хирургично лечение', 'Пълна възстановителна терапия'],
      ctaText: 'Започнете пътя към здрави венци'
    },
    en: {
      name: 'Gum Problems',
      shortDesc: 'Bleeding, swelling, or receding gums',
      description: 'Gum problems are a serious signal that should not be ignored. Untreated periodontal disease can lead to tooth loss.',
      causes: [
        'Poor oral hygiene',
        'Plaque and tartar buildup',
        'Smoking',
        'Hormonal changes',
        'Diabetes and other systemic diseases'
      ],
      whenToSeek: [
        'Your gums bleed when brushing',
        'Gums are red, swollen, or painful',
        'You have bad breath that does not go away',
        'Your teeth appear longer (receding gums)'
      ],
      treatments: ['Professional cleaning', 'Deep cleaning', 'Surgical treatment', 'Full mouth restoration'],
      ctaText: 'Start your journey to healthy gums'
    }
  },
  'worn-teeth': {
    slug: 'worn-teeth',
    icon: 'Layers',
    treatment: 'full-mouth',
    bg: {
      name: 'Износени зъби',
      shortDesc: 'Изтънял емайл или скъсени зъби',
      description: 'Износването на зъбите е постепенен процес, който може да доведе до чувствителност, промяна във външния вид и проблеми с функцията.',
      causes: [
        'Скърцане със зъби (бруксизъм)',
        'Киселинна ерозия от храни и напитки',
        'Агресивно миене на зъби',
        'Неправилна захапка',
        'Естествено стареене'
      ],
      whenToSeek: [
        'Зъбите ви изглеждат по-къси или плоски',
        'Имате повишена чувствителност',
        'Забелязвате пукнатини или отчупвания',
        'Изпитвате болка в челюстта сутрин'
      ],
      treatments: ['Коронки', 'Фасети (венири)', 'Бондинг', 'Пълна възстановителна терапия'],
      ctaText: 'Възстановете естествения вид на зъбите си'
    },
    en: {
      name: 'Worn Teeth',
      shortDesc: 'Thinning enamel or shortened teeth',
      description: 'Tooth wear is a gradual process that can lead to sensitivity, changes in appearance, and functional problems.',
      causes: [
        'Teeth grinding (bruxism)',
        'Acid erosion from foods and drinks',
        'Aggressive tooth brushing',
        'Improper bite',
        'Natural aging'
      ],
      whenToSeek: [
        'Your teeth appear shorter or flatter',
        'You have increased sensitivity',
        'You notice cracks or chips',
        'You experience jaw pain in the morning'
      ],
      treatments: ['Crowns', 'Veneers', 'Bonding', 'Full mouth restoration'],
      ctaText: 'Restore the natural look of your teeth'
    }
  },
  'sensitivity': {
    slug: 'sensitivity',
    icon: 'Zap',
    treatment: 'implants',
    bg: {
      name: 'Чувствителност',
      shortDesc: 'Болка при студено, топло или сладко',
      description: 'Зъбната чувствителност е често срещан проблем, който може да направи храненето и пиенето неприятно изживяване.',
      causes: [
        'Изтънял емайл',
        'Оголени зъбни корени',
        'Кариес',
        'Напукан зъб',
        'Скорошна дентална процедура'
      ],
      whenToSeek: [
        'Чувствителността е постоянна или се влошава',
        'Болката е локализирана в един зъб',
        'Имате видими пукнатини или потъмняване',
        'Чувствителността пречи на ежедневието ви'
      ],
      treatments: ['Десенситизиращи пасти', 'Флуоридни апликации', 'Пломби', 'Коронки'],
      ctaText: 'Открийте причината за чувствителността'
    },
    en: {
      name: 'Sensitivity',
      shortDesc: 'Pain with cold, hot, or sweet',
      description: 'Tooth sensitivity is a common problem that can make eating and drinking an unpleasant experience.',
      causes: [
        'Thinning enamel',
        'Exposed tooth roots',
        'Cavities',
        'Cracked tooth',
        'Recent dental procedure'
      ],
      whenToSeek: [
        'Sensitivity is constant or worsening',
        'Pain is localized to one tooth',
        'You have visible cracks or discoloration',
        'Sensitivity interferes with daily life'
      ],
      treatments: ['Desensitizing toothpaste', 'Fluoride applications', 'Fillings', 'Crowns'],
      ctaText: 'Discover the cause of your sensitivity'
    }
  }
};

export const getSymptom = (slug, language = 'bg') => {
  const symptom = SYMPTOMS[slug];
  if (!symptom) return null;
  return {
    ...symptom,
    ...symptom[language]
  };
};

export const getAllSymptoms = (language = 'bg') => {
  return Object.values(SYMPTOMS).map(symptom => ({
    slug: symptom.slug,
    icon: symptom.icon,
    treatment: symptom.treatment,
    ...symptom[language]
  }));
};
