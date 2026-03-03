import { useParams, Link, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Smile, Target, Stethoscope, ArrowRight, ArrowLeft, MapPin, Sparkles } from 'lucide-react';
import { CITIES } from '@/lib/quizData';
import { useLanguage } from '@/context/LanguageContext';
import { ScrollReveal, useStaggerReveal } from '@/hooks/useScrollReveal';

const TreatmentSelectPage = () => {
  const { citySlug } = useParams();
  const { t, getLocalizedPath, getCityName, getTreatment, language } = useLanguage();
  const city = CITIES[citySlug];
  const { containerRef, isItemRevealed } = useStaggerReveal(4, { staggerDelay: 120 });
  const isEN = language === 'en';
  
  if (!city) return <Navigate to={getLocalizedPath('/')} replace />;

  const treatments = [
    { key: 'ortho', icon: Sparkles, path: 'ortho', special: true },
    { key: 'invisalign', icon: Smile, path: 'invisalign' },
    { key: 'implants', icon: Target, path: 'implants' },
    { key: 'full-mouth', icon: Stethoscope, path: 'full-mouth' }
  ];

  return (
    <Layout>
      <div className="py-16 md:py-24 bg-white overflow-hidden">
        <div className="max-w-3xl mx-auto px-4">
          {/* Back */}
          <ScrollReveal delay={0}>
            <Link to={getLocalizedPath('/')} className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-8 transition-all duration-200 hover:-translate-x-1" data-testid="back-btn">
              <ArrowLeft className="w-4 h-4" />
              <span>{t('quiz.back')}</span>
            </Link>
          </ScrollReveal>
          
          {/* Header */}
          <div className="text-center mb-12">
            <ScrollReveal delay={100}>
              <div className="flex items-center justify-center gap-2 text-sky-500 text-sm mb-4">
                <MapPin className="w-4 h-4" />
                <span>{getCityName(citySlug)}</span>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={200}>
              <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-slate-900 mb-4">
                {t('treatments.title')} {t('treatments.subtitle')} {getCityName(citySlug)}
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={300}>
              <p className="text-slate-500">
                {t('common.yes') === 'Yes' ? 'Select the type of treatment to proceed to the assessment' : 'Изберете типа лечение, за да преминете към оценката'}
              </p>
            </ScrollReveal>
          </div>
          
          {/* Treatment Cards */}
          <div ref={containerRef} className="space-y-4">
            {treatments.map((item, index) => {
              const treatment = getTreatment(item.key);
              return (
                <Link
                  key={item.path}
                  to={getLocalizedPath(`/city/${citySlug}/${item.path}`)}
                  className={`treatment-card group flex items-center gap-6 bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-2xl p-6 transition-all duration-300 ${
                    isItemRevealed(index) ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
                  }`}
                  style={{ transitionDelay: `${index * 120}ms` }}
                  data-testid={`treatment-${item.path}`}
                >
                  <div className="treatment-icon w-14 h-14 rounded-2xl bg-sky-100 flex items-center justify-center flex-shrink-0 group-hover:bg-sky-200 transition-all duration-300">
                    <item.icon className="w-7 h-7 text-sky-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900 mb-1">{treatment.name}</h3>
                    <p className="text-sm text-slate-500">{treatment.description}</p>
                    <span className="text-xs text-sky-600 mt-2 inline-block">
                      {t('common.yes') === 'Yes' ? 'Learn more about this treatment →' : 'Научете повече за това лечение →'}
                    </span>
                  </div>
                  <ArrowRight className="treatment-arrow w-5 h-5 text-slate-400 group-hover:text-sky-500 transition-all duration-300" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TreatmentSelectPage;
