import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useLanguage } from '@/context/LanguageContext';
import { getAllSymptoms } from '@/lib/symptomsData';
import { AlertCircle, Circle, Shuffle, Droplet, Layers, Zap, ArrowRight, Stethoscope } from 'lucide-react';
import { ScrollReveal, useStaggerReveal } from '@/hooks/useScrollReveal';

const iconMap = {
  AlertCircle,
  Circle,
  Shuffle,
  Droplet,
  Layers,
  Zap
};

const SymptomsPage = () => {
  const { language, getLocalizedPath, t } = useLanguage();
  const symptoms = getAllSymptoms(language);
  const { containerRef, isItemRevealed } = useStaggerReveal(symptoms.length, { staggerDelay: 100 });
  
  const isEN = language === 'en';

  return (
    <Layout>
      {/* Hero */}
      <section className="py-16 md:py-20 bg-white overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <ScrollReveal delay={0}>
            <div className="w-16 h-16 rounded-2xl bg-sky-100 flex items-center justify-center mx-auto mb-6 icon-hover">
              <Stethoscope className="w-8 h-8 text-sky-600" />
            </div>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-slate-900 mb-4">
              {isEN ? 'Dental Symptoms Guide' : 'Дентални симптоми'}
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              {isEN 
                ? 'Learn about common dental symptoms, their causes, and when to seek professional help.'
                : 'Научете за често срещаните дентални симптоми, техните причини и кога да потърсите професионална помощ.'}
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Symptoms Grid */}
      <section className="py-12 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4">
          <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {symptoms.map((symptom, index) => {
              const Icon = iconMap[symptom.icon] || AlertCircle;
              return (
                <Link
                  key={symptom.slug}
                  to={getLocalizedPath(`/symptoms/${symptom.slug}`)}
                  className={`symptom-card group bg-white rounded-2xl border border-slate-200 hover:border-sky-300 p-6 transition-all duration-300 ${
                    isItemRevealed(index) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                  data-testid={`symptom-${symptom.slug}`}
                >
                  <div className="symptom-icon w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center mb-4 group-hover:bg-sky-100 transition-all duration-300">
                    <Icon className="w-6 h-6 text-sky-600" />
                  </div>
                  <h3 className="font-medium text-slate-900 mb-2">{symptom.name}</h3>
                  <p className="text-sm text-slate-500 mb-4">{symptom.shortDesc}</p>
                  <div className="flex items-center text-sm text-sky-600 font-medium">
                    <span>{isEN ? 'Learn more' : 'Научете повече'}</span>
                    <ArrowRight className="w-4 h-4 ml-1 transition-transform duration-300 group-hover:translate-x-2" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <ScrollReveal>
            <h2 className="font-heading text-2xl font-semibold text-slate-900 mb-4">
              {isEN ? 'Not sure about your symptoms?' : 'Не сте сигурни за симптомите си?'}
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <p className="text-slate-600 mb-8">
              {isEN 
                ? 'Take our quick assessment to find out if you are a suitable candidate for treatment.'
                : 'Преминете през нашата бърза оценка, за да разберете дали сте подходящ кандидат за лечение.'}
            </p>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <Link
              to={getLocalizedPath('/')}
              className="btn-animate btn-pulse inline-flex items-center justify-center h-12 px-8 rounded-full bg-sky-500 hover:bg-sky-600 text-white font-medium transition-all duration-300"
              data-testid="symptoms-cta"
            >
              {isEN ? 'Start Assessment' : 'Започнете оценката'}
              <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </ScrollReveal>
        </div>
      </section>
    </Layout>
  );
};

export default SymptomsPage;
