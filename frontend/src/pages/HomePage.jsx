import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { MapPin, ArrowRight, Shield, Clock, Users } from 'lucide-react';
import { seedDatabase } from '@/lib/api';
import { CITIES } from '@/lib/quizData';
import { useLanguage } from '@/context/LanguageContext';
import { useStaggerReveal, ScrollReveal } from '@/hooks/useScrollReveal';

const HomePage = () => {
  const { t, getLocalizedPath, getCityName } = useLanguage();
  const cities = Object.values(CITIES);
  const { containerRef: citiesRef, isItemRevealed: isCityRevealed } = useStaggerReveal(cities.length, { staggerDelay: 100 });
  const { containerRef: trustRef, isItemRevealed: isTrustRevealed } = useStaggerReveal(3, { staggerDelay: 150 });
  const { containerRef: stepsRef, isItemRevealed: isStepRevealed } = useStaggerReveal(3, { staggerDelay: 150 });
  
  useEffect(() => { seedDatabase().catch(() => {}); }, []);

  return (
    <Layout>
      {/* Hero */}
      <section className="py-20 md:py-28 bg-white overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <ScrollReveal delay={0}>
            <p className="text-sky-500 font-medium text-sm tracking-wide uppercase mb-4">
              {t('footer.tagline')}
            </p>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-tight mb-6">
              {t('home.title')}
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-12">
              {t('home.subtitle')}
            </p>
          </ScrollReveal>
          
          {/* City Cards */}
          <div ref={citiesRef} className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {cities.map((city, index) => (
              <Link
                key={city.slug}
                to={getLocalizedPath(`/city/${city.slug}`)}
                className={`city-card group bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-2xl p-6 transition-all duration-300 ${
                  isCityRevealed(index) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
                data-testid={`city-${city.slug}`}
              >
                <div className="city-icon w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-5 h-5 text-sky-600" />
                </div>
                <h3 className="font-medium text-slate-900">{getCityName(city.slug)}</h3>
                <div className="flex items-center justify-center gap-1 mt-2 text-sm text-sky-600 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <span>{t('home.seeOptions')}</span>
                  <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-16 bg-slate-50 border-y border-slate-100">
        <div className="max-w-4xl mx-auto px-4">
          <div ref={trustRef} className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { icon: Clock, title: `60-90 ${t('common.yes') === 'Yes' ? 'seconds' : 'секунди'}`, desc: t('common.yes') === 'Yes' ? 'Quick assessment' : 'Бърза оценка' },
              { icon: Shield, title: t('common.yes') === 'Yes' ? 'Data protection' : 'Защита на данни', desc: t('common.yes') === 'Yes' ? 'GDPR compliant' : 'GDPR съответствие' },
              { icon: Users, title: t('common.yes') === 'Yes' ? 'Partner clinics' : 'Партньорски клиники', desc: t('common.yes') === 'Yes' ? 'Verified specialists' : 'Проверени специалисти' }
            ].map((item, index) => (
              <div 
                key={index} 
                className={`transition-all duration-500 ${isTrustRevealed(index) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                <div className="icon-hover inline-block">
                  <item.icon className="w-8 h-8 text-sky-500 mx-auto mb-3" />
                </div>
                <h4 className="font-medium text-slate-900 mb-1">{item.title}</h4>
                <p className="text-sm text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <ScrollReveal>
            <h2 className="font-heading text-2xl font-semibold text-slate-900 text-center mb-12">
              {t('common.yes') === 'Yes' ? 'How it works' : 'Как работи'}
            </h2>
          </ScrollReveal>
          <div ref={stepsRef} className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(t('common.yes') === 'Yes' ? [
              { n: '1', t: 'Choose a city', d: 'Select your city from the list' },
              { n: '2', t: 'Choose treatment', d: 'Select the type of dental treatment' },
              { n: '3', t: 'Take assessment', d: 'Answer a short questionnaire' }
            ] : [
              { n: '1', t: 'Изберете град', d: 'Изберете вашия град от списъка' },
              { n: '2', t: 'Изберете лечение', d: 'Изберете типа дентално лечение' },
              { n: '3', t: 'Преминете оценка', d: 'Отговорете на кратък въпросник' }
            ]).map((step, index) => (
              <div 
                key={step.n} 
                className={`text-center transition-all duration-500 ${isStepRevealed(index) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                <div className="icon-hover w-12 h-12 rounded-full bg-sky-500 text-white flex items-center justify-center text-xl font-bold mx-auto mb-4 transition-transform duration-300">
                  {step.n}
                </div>
                <h3 className="font-medium text-slate-900 mb-2">{step.t}</h3>
                <p className="text-sm text-slate-500">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default HomePage;
