// Treatment education content for detailed treatment pages

export const TREATMENT_EDUCATION = {
  invisalign: {
    slug: 'invisalign',
    icon: 'Smile',
    bg: {
      name: 'Invisalign',
      tagline: 'Невидимо подреждане на зъбите',
      heroDescription: 'Invisalign използва серия от прозрачни, изработени по поръчка шини, които постепенно преместват зъбите ви в желаната позиция. Без метални брекети, без ограничения в храненето.',
      
      benefits: [
        { title: 'Почти невидими', description: 'Прозрачните шини са практически невидими - мнозина няма да забележат, че носите ортодонтски апарат.' },
        { title: 'Сваляеми', description: 'Можете да ги свалите за хранене, миене на зъби и специални поводи.' },
        { title: 'Комфортни', description: 'Без метални скоби и телове, които могат да дразнят устата.' },
        { title: 'Предвидими резултати', description: '3D симулация показва очаквания резултат още преди започване на лечението.' }
      ],
      
      process: [
        { step: 1, title: 'Консултация', description: 'Преглед и 3D сканиране на зъбите ви. Обсъждане на целите и очакванията.' },
        { step: 2, title: 'Индивидуален план', description: 'Създаване на персонализиран план за лечение с виртуална симулация на резултата.' },
        { step: 3, title: 'Изработка на шините', description: 'Производство на вашите индивидуални Invisalign шини.' },
        { step: 4, title: 'Лечение', description: 'Носите всяка шина около 1-2 седмици, сменяйки ги последователно.' },
        { step: 5, title: 'Завършване', description: 'Ретейнер за поддържане на резултата и проследяващи прегледи.' }
      ],
      
      idealFor: [
        'Възрастни и тийнейджъри, които искат дискретно лечение',
        'Хора с леки до умерени ортодонтски проблеми',
        'Тези, които искат да избегнат традиционните брекети',
        'Активни хора, спортисти',
        'Професионалисти, които се срещат с клиенти'
      ],
      
      faqs: [
        { q: 'Колко време трае лечението?', a: 'Обикновено между 6 и 18 месеца, в зависимост от сложността на случая.' },
        { q: 'Болезнено ли е?', a: 'Може да усетите лек натиск в първите дни на всяка нова шина, но това е знак, че шините работят.' },
        { q: 'Колко часа на ден трябва да ги нося?', a: 'Препоръчително е 20-22 часа на ден за оптимални резултати.' },
        { q: 'Мога ли да ям всичко?', a: 'Да! Свалете шините преди хранене и ги поставете обратно след миене на зъби.' }
      ],
      
      stats: [
        { value: '12M+', label: 'Пациенти по света' },
        { value: '99%', label: 'Удовлетвореност' },
        { value: '50%', label: 'По-бързо от брекети' }
      ],
      
      ctaTitle: 'Готови ли сте за идеалната усмивка?',
      ctaDescription: 'Преминете през нашата кратка оценка, за да разберете дали Invisalign е подходящ за вас.'
    },
    en: {
      name: 'Invisalign',
      tagline: 'Invisible teeth alignment',
      heroDescription: 'Invisalign uses a series of clear, custom-made aligners that gradually move your teeth to the desired position. No metal braces, no eating restrictions.',
      
      benefits: [
        { title: 'Nearly invisible', description: 'Clear aligners are virtually invisible - many people won\'t notice you\'re wearing orthodontic treatment.' },
        { title: 'Removable', description: 'You can remove them for eating, brushing, and special occasions.' },
        { title: 'Comfortable', description: 'No metal brackets and wires that can irritate your mouth.' },
        { title: 'Predictable results', description: '3D simulation shows expected results before treatment begins.' }
      ],
      
      process: [
        { step: 1, title: 'Consultation', description: 'Examination and 3D scanning of your teeth. Discussion of goals and expectations.' },
        { step: 2, title: 'Custom plan', description: 'Creation of a personalized treatment plan with virtual simulation of results.' },
        { step: 3, title: 'Aligner production', description: 'Manufacturing of your individual Invisalign aligners.' },
        { step: 4, title: 'Treatment', description: 'Wear each aligner for about 1-2 weeks, changing them sequentially.' },
        { step: 5, title: 'Completion', description: 'Retainer to maintain results and follow-up appointments.' }
      ],
      
      idealFor: [
        'Adults and teenagers who want discreet treatment',
        'People with mild to moderate orthodontic issues',
        'Those who want to avoid traditional braces',
        'Active people, athletes',
        'Professionals who meet with clients'
      ],
      
      faqs: [
        { q: 'How long does treatment take?', a: 'Usually between 6 and 18 months, depending on case complexity.' },
        { q: 'Is it painful?', a: 'You may feel slight pressure in the first days of each new aligner, but this is a sign they\'re working.' },
        { q: 'How many hours a day should I wear them?', a: 'It\'s recommended to wear them 20-22 hours a day for optimal results.' },
        { q: 'Can I eat everything?', a: 'Yes! Remove the aligners before eating and put them back after brushing.' }
      ],
      
      stats: [
        { value: '12M+', label: 'Patients worldwide' },
        { value: '99%', label: 'Satisfaction rate' },
        { value: '50%', label: 'Faster than braces' }
      ],
      
      ctaTitle: 'Ready for the perfect smile?',
      ctaDescription: 'Take our quick assessment to find out if Invisalign is right for you.'
    }
  },
  
  implants: {
    slug: 'implants',
    icon: 'Target',
    bg: {
      name: 'Зъбни импланти',
      tagline: 'Трайно решение за липсващи зъби',
      heroDescription: 'Зъбните импланти са златен стандарт за заместване на липсващи зъби. Титановият имплант се интегрира с костта и служи като здрава основа за коронка, която изглежда и функционира като естествен зъб.',
      
      benefits: [
        { title: 'Изглеждат естествено', description: 'Коронката върху импланта е неразличима от естествените ви зъби.' },
        { title: 'Функционират като истински', description: 'Дъвчете, говорете и се усмихвайте с пълна увереност.' },
        { title: 'Дълготрайни', description: 'При правилна грижа имплантите могат да издържат цял живот.' },
        { title: 'Защитават костта', description: 'Предотвратяват загубата на костна тъкан, която настъпва при липсващи зъби.' }
      ],
      
      process: [
        { step: 1, title: 'Диагностика', description: 'CBCT сканиране и подробна оценка на костната плътност и структура.' },
        { step: 2, title: 'Планиране', description: '3D планиране на позицията на импланта за оптимален резултат.' },
        { step: 3, title: 'Хирургия', description: 'Поставяне на титановия имплант в челюстната кост под местна упойка.' },
        { step: 4, title: 'Остеоинтеграция', description: '3-6 месеца за срастване на импланта с костта.' },
        { step: 5, title: 'Коронка', description: 'Поставяне на индивидуално изработена керамична коронка.' }
      ],
      
      idealFor: [
        'Хора с един или повече липсващи зъби',
        'Тези, които искат постоянно решение',
        'Хора с достатъчна костна плътност',
        'Некомфортни с подвижни протези',
        'Тези, които искат да запазят здравината на съседните зъби'
      ],
      
      faqs: [
        { q: 'Болезнена ли е процедурата?', a: 'Процедурата се извършва под местна упойка и е безболезнена. След операцията може да има лек дискомфорт.' },
        { q: 'Колко дълго траят имплантите?', a: 'При правилна хигиена и редовни прегледи, имплантите могат да издържат повече от 25 години.' },
        { q: 'Какво ако нямам достатъчно кост?', a: 'Възможни са процедури за костна аугментация преди поставяне на импланта.' },
        { q: 'Мога ли да поставя имплант веднага след изваждане на зъб?', a: 'В някои случаи да - това се нарича "незабавна имплантация" и зависи от състоянието на костта.' }
      ],
      
      orthoFoundation: {
        title: 'Защо подреждането на зъбите е важно',
        text: 'Правилното разпределение на дъвкателните сили е ключово за дългосрочната стабилност на имплантите. При наличие на неправилна захапка или значително разместване на зъбите, ортодонтско лечение може да бъде препоръчано преди или в комбинация с имплантологична терапия.'
      },
      
      stats: [
        { value: '98%', label: 'Успеваемост' },
        { value: '25+', label: 'Години издръжливост' },
        { value: '#1', label: 'Избор на стоматолозите' }
      ],
      
      ctaTitle: 'Възстановете усмивката си',
      ctaDescription: 'Преминете през нашата кратка оценка, за да разберете дали зъбните импланти са подходящи за вас.'
    },
    en: {
      name: 'Dental Implants',
      tagline: 'Permanent solution for missing teeth',
      heroDescription: 'Dental implants are the gold standard for replacing missing teeth. The titanium implant integrates with the bone and serves as a strong foundation for a crown that looks and functions like a natural tooth.',
      
      benefits: [
        { title: 'Look natural', description: 'The crown on the implant is indistinguishable from your natural teeth.' },
        { title: 'Function like real teeth', description: 'Chew, speak, and smile with complete confidence.' },
        { title: 'Long-lasting', description: 'With proper care, implants can last a lifetime.' },
        { title: 'Protect bone', description: 'Prevent bone loss that occurs with missing teeth.' }
      ],
      
      process: [
        { step: 1, title: 'Diagnosis', description: 'CBCT scan and detailed assessment of bone density and structure.' },
        { step: 2, title: 'Planning', description: '3D planning of implant position for optimal results.' },
        { step: 3, title: 'Surgery', description: 'Placement of titanium implant in the jawbone under local anesthesia.' },
        { step: 4, title: 'Osseointegration', description: '3-6 months for the implant to fuse with the bone.' },
        { step: 5, title: 'Crown', description: 'Placement of a custom-made ceramic crown.' }
      ],
      
      idealFor: [
        'People with one or more missing teeth',
        'Those who want a permanent solution',
        'People with sufficient bone density',
        'Those uncomfortable with removable dentures',
        'Those who want to preserve adjacent teeth health'
      ],
      
      faqs: [
        { q: 'Is the procedure painful?', a: 'The procedure is performed under local anesthesia and is painless. Some mild discomfort may occur after surgery.' },
        { q: 'How long do implants last?', a: 'With proper hygiene and regular checkups, implants can last over 25 years.' },
        { q: 'What if I don\'t have enough bone?', a: 'Bone augmentation procedures are possible before implant placement.' },
        { q: 'Can I get an implant immediately after extraction?', a: 'In some cases yes - this is called "immediate implantation" and depends on bone condition.' }
      ],
      
      orthoFoundation: {
        title: 'Why teeth alignment matters',
        text: 'Proper distribution of chewing forces is key to long-term implant stability. In cases of malocclusion or significant tooth displacement, orthodontic treatment may be recommended before or in combination with implant therapy.'
      },
      
      stats: [
        { value: '98%', label: 'Success rate' },
        { value: '25+', label: 'Years durability' },
        { value: '#1', label: 'Dentist choice' }
      ],
      
      ctaTitle: 'Restore your smile',
      ctaDescription: 'Take our quick assessment to find out if dental implants are right for you.'
    }
  },
  
  'full-mouth': {
    slug: 'full-mouth',
    icon: 'Stethoscope',
    bg: {
      name: 'Пълна възстановителна терапия',
      tagline: 'Комплексно възстановяване на усмивката',
      heroDescription: 'Пълната възстановителна терапия е цялостен подход за решаване на множество дентални проблеми едновременно. Комбинира различни процедури за постигане на здрава, функционална и красива усмивка.',
      
      benefits: [
        { title: 'Цялостен подход', description: 'Адресиране на всички проблеми в един координиран план за лечение.' },
        { title: 'Възстановена функция', description: 'Пълноценно дъвчене, говорене и естетика.' },
        { title: 'Дългосрочно решение', description: 'Фокус върху здравето и дълготрайността на резултатите.' },
        { title: 'Персонализиран план', description: 'Всяко лечение е индивидуално съобразено с вашите нужди.' }
      ],
      
      process: [
        { step: 1, title: 'Комплексна диагностика', description: 'Подробен преглед, рентгенови снимки, 3D сканиране и анализ на захапката.' },
        { step: 2, title: 'План за лечение', description: 'Разработване на поетапен план с приоритизиране на процедурите.' },
        { step: 3, title: 'Подготвителна фаза', description: 'Лечение на възпаления, екстракции, костни аугментации ако е необходимо.' },
        { step: 4, title: 'Възстановителна фаза', description: 'Импланти, мостове, коронки, фасети - според индивидуалния план.' },
        { step: 5, title: 'Финализиране', description: 'Фина настройка на захапката, естетични корекции и план за поддръжка.' }
      ],
      
      idealFor: [
        'Хора с множество липсващи или повредени зъби',
        'Тези със силно износени зъби (бруксизъм)',
        'Хора с напреднала пародонтоза',
        'Тези, които искат цялостна промяна на усмивката',
        'Пациенти, които са отлагали лечение дълго време'
      ],
      
      faqs: [
        { q: 'Колко време отнема пълната възстановителна терапия?', a: 'Обикновено между 6 месеца и 2 години, в зависимост от сложността и необходимите процедури.' },
        { q: 'Болезнено ли е?', a: 'Процедурите се извършват с подходяща анестезия. Може да има преходен дискомфорт между етапите.' },
        { q: 'Мога ли да разделя лечението на етапи?', a: 'Да, планът се разработва така, че да е финансово и практически удобен за вас.' },
        { q: 'Какво включва пълната възстановителна терапия?', a: 'Може да включва импланти, коронки, мостове, фасети, лечение на венци и ортодонтия.' }
      ],
      
      orthoFoundation: {
        title: 'Ролята на ортодонтията в комплексните възстановявания',
        text: 'При комплексни възстановявания често се комбинират ортодонтия, импланти и протетика. Подреждането на зъбите създава стабилна функционална основа за дългосрочен резултат.'
      },
      
      stats: [
        { value: '360°', label: 'Цялостен подход' },
        { value: '95%', label: 'Подобрено качество на живот' },
        { value: '10+', label: 'Години резултати' }
      ],
      
      ctaTitle: 'Променете живота си с нова усмивка',
      ctaDescription: 'Преминете през нашата оценка, за да разберете дали пълната възстановителна терапия е подходяща за вас.'
    },
    en: {
      name: 'Full Mouth Restoration',
      tagline: 'Comprehensive smile restoration',
      heroDescription: 'Full mouth restoration is a comprehensive approach to solving multiple dental problems simultaneously. It combines various procedures to achieve a healthy, functional, and beautiful smile.',
      
      benefits: [
        { title: 'Comprehensive approach', description: 'Addressing all issues in one coordinated treatment plan.' },
        { title: 'Restored function', description: 'Full chewing, speaking, and aesthetic capabilities.' },
        { title: 'Long-term solution', description: 'Focus on health and longevity of results.' },
        { title: 'Personalized plan', description: 'Each treatment is individually tailored to your needs.' }
      ],
      
      process: [
        { step: 1, title: 'Comprehensive diagnosis', description: 'Detailed examination, X-rays, 3D scanning, and bite analysis.' },
        { step: 2, title: 'Treatment plan', description: 'Development of a phased plan with prioritized procedures.' },
        { step: 3, title: 'Preparatory phase', description: 'Treatment of inflammation, extractions, bone augmentations if needed.' },
        { step: 4, title: 'Restorative phase', description: 'Implants, bridges, crowns, veneers - according to individual plan.' },
        { step: 5, title: 'Finalization', description: 'Fine-tuning of bite, aesthetic corrections, and maintenance plan.' }
      ],
      
      idealFor: [
        'People with multiple missing or damaged teeth',
        'Those with severely worn teeth (bruxism)',
        'People with advanced periodontal disease',
        'Those who want a complete smile makeover',
        'Patients who have postponed treatment for a long time'
      ],
      
      faqs: [
        { q: 'How long does full mouth restoration take?', a: 'Usually between 6 months and 2 years, depending on complexity and required procedures.' },
        { q: 'Is it painful?', a: 'Procedures are performed with appropriate anesthesia. There may be temporary discomfort between stages.' },
        { q: 'Can I split treatment into phases?', a: 'Yes, the plan is designed to be financially and practically convenient for you.' },
        { q: 'What does full mouth restoration include?', a: 'May include implants, crowns, bridges, veneers, gum treatment, and orthodontics.' }
      ],
      
      stats: [
        { value: '360°', label: 'Comprehensive approach' },
        { value: '95%', label: 'Improved quality of life' },
        { value: '10+', label: 'Years of results' }
      ],
      
      ctaTitle: 'Change your life with a new smile',
      ctaDescription: 'Take our assessment to find out if full mouth restoration is right for you.'
    }
  }
};

export const getTreatmentEducation = (slug, language = 'bg') => {
  const treatment = TREATMENT_EDUCATION[slug];
  if (!treatment) return null;
  return {
    slug: treatment.slug,
    icon: treatment.icon,
    ...treatment[language]
  };
};

export const getAllTreatments = (language = 'bg') => {
  return Object.values(TREATMENT_EDUCATION).map(treatment => ({
    slug: treatment.slug,
    icon: treatment.icon,
    ...treatment[language]
  }));
};
