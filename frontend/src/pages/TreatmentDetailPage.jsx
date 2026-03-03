import { useParams, Link, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useLanguage } from '@/context/LanguageContext';
import { getTreatmentEducation } from '@/lib/treatmentData';
import { CITIES } from '@/lib/quizData';
import { 
  Smile, Target, Stethoscope, ArrowRight, ArrowLeft, MapPin, 
  CheckCircle, Clock, ChevronDown, ChevronUp, Users, Award, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollReveal, useStaggerReveal } from '@/hooks/useScrollReveal';
import { useState } from 'react';

const iconMap = {
  Smile,
  Target,
  Stethoscope
};

const TreatmentDetailPage = () => {
  const { citySlug, treatmentType } = useParams();
  const { language, getLocalizedPath, getCityName } = useLanguage();
  const [openFaq, setOpenFaq] = useState(null);
  
  const city = CITIES[citySlug];
  const treatment = getTreatmentEducation(treatmentType, language);
  const isEN = language === 'en';
  
  const { containerRef: benefitsRef, isItemRevealed: isBenefitRevealed } = useStaggerReveal(4, { staggerDelay: 100 });
  const { containerRef: processRef, isItemRevealed: isProcessRevealed } = useStaggerReveal(5, { staggerDelay: 120 });
  const { containerRef: idealRef, isItemRevealed: isIdealRevealed } = useStaggerReveal(5, { staggerDelay: 80 });
  
  if (!city || !treatment) {
    return <Navigate to={getLocalizedPath('/')} replace />;
  }
  
  const TreatmentIcon = iconMap[treatment.icon] || Smile;
  const cityName = getCityName(citySlug);

  return (
    <Layout>
      {/* Hero Section */}
      <section className="py-16 md:py-20 bg-gradient-to-b from-white to-slate-50 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4">
          <ScrollReveal delay={0}>
            <Link 
              to={getLocalizedPath(`/city/${citySlug}`)} 
              className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-8 transition-all duration-200 hover:-translate-x-1"
              data-testid="back-to-treatments"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isEN ? 'All Treatments' : 'Всички лечения'}</span>
            </Link>
          </ScrollReveal>
          
          <div className="flex flex-col md:flex-row md:items-start gap-6 mb-8">
            <ScrollReveal delay={100}>
              <div className="w-20 h-20 rounded-2xl bg-sky-100 flex items-center justify-center flex-shrink-0 icon-hover">
                <TreatmentIcon className="w-10 h-10 text-sky-600" />
              </div>
            </ScrollReveal>
            
            <div className="flex-1">
              <ScrollReveal delay={150}>
                <div className="flex items-center gap-2 text-sky-500 text-sm mb-2">
                  <MapPin className="w-4 h-4" />
                  <span>{cityName}</span>
                </div>
              </ScrollReveal>
              <ScrollReveal delay={200}>
                <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-slate-900 mb-2">
                  {treatment.name}
                </h1>
              </ScrollReveal>
              <ScrollReveal delay={250}>
                <p className="text-lg text-sky-600 font-medium mb-4">{treatment.tagline}</p>
              </ScrollReveal>
              <ScrollReveal delay={300}>
                <p className="text-slate-600 leading-relaxed">{treatment.heroDescription}</p>
              </ScrollReveal>
            </div>
          </div>
          
          {/* Stats */}
          <ScrollReveal delay={350}>
            <div className="grid grid-cols-3 gap-4 mt-8">
              {treatment.stats.map((stat, index) => (
                <div key={index} className="bg-white rounded-xl border border-slate-200 p-4 text-center card-hover-subtle">
                  <div className="text-2xl font-bold text-sky-600 mb-1">{stat.value}</div>
                  <div className="text-sm text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <ScrollReveal>
            <h2 className="font-heading text-2xl font-semibold text-slate-900 mb-8 text-center">
              {isEN ? 'Benefits' : 'Предимства'}
            </h2>
          </ScrollReveal>
          
          <div ref={benefitsRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {treatment.benefits.map((benefit, index) => (
              <div 
                key={index}
                className={`bg-slate-50 rounded-2xl p-6 border border-slate-200 transition-all duration-500 ${
                  isBenefitRevealed(index) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900 mb-1">{benefit.title}</h3>
                    <p className="text-sm text-slate-500">{benefit.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4">
          <ScrollReveal>
            <h2 className="font-heading text-2xl font-semibold text-slate-900 mb-8 text-center">
              {isEN ? 'Treatment Process' : 'Процес на лечение'}
            </h2>
          </ScrollReveal>
          
          <div ref={processRef} className="relative">
            {/* Timeline line */}
            <div className="hidden md:block absolute left-8 top-0 bottom-0 w-0.5 bg-sky-200" />
            
            <div className="space-y-6">
              {treatment.process.map((step, index) => (
                <div 
                  key={index}
                  className={`relative flex gap-6 transition-all duration-500 ${
                    isProcessRevealed(index) ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
                  }`}
                  style={{ transitionDelay: `${index * 120}ms` }}
                >
                  <div className="hidden md:flex w-16 h-16 rounded-full bg-sky-500 text-white items-center justify-center text-xl font-bold flex-shrink-0 z-10">
                    {step.step}
                  </div>
                  <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-6 card-hover-subtle">
                    <div className="md:hidden w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center text-lg font-bold mb-3">
                      {step.step}
                    </div>
                    <h3 className="font-medium text-slate-900 mb-2">{step.title}</h3>
                    <p className="text-sm text-slate-500">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Ideal For Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <ScrollReveal>
            <h2 className="font-heading text-2xl font-semibold text-slate-900 mb-8 text-center">
              {isEN ? 'Ideal For' : 'Подходящо за'}
            </h2>
          </ScrollReveal>
          
          <div ref={idealRef} className="bg-sky-50 rounded-2xl border border-sky-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-6 h-6 text-sky-600" />
              <span className="font-medium text-slate-900">
                {isEN ? 'This treatment is ideal for:' : 'Това лечение е идеално за:'}
              </span>
            </div>
            <ul className="space-y-3">
              {treatment.idealFor.map((item, index) => (
                <li 
                  key={index}
                  className={`flex items-start gap-3 transition-all duration-500 ${
                    isIdealRevealed(index) ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
                  }`}
                  style={{ transitionDelay: `${index * 80}ms` }}
                >
                  <CheckCircle className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4">
          <ScrollReveal>
            <h2 className="font-heading text-2xl font-semibold text-slate-900 mb-8 text-center">
              {isEN ? 'Frequently Asked Questions' : 'Често задавани въпроси'}
            </h2>
          </ScrollReveal>
          
          <div className="space-y-4">
            {treatment.faqs.map((faq, index) => (
              <ScrollReveal key={index} delay={index * 100}>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-all duration-300 hover:border-slate-300">
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full flex items-center justify-between p-5 text-left"
                    data-testid={`faq-${index}`}
                  >
                    <span className="font-medium text-slate-900 pr-4">{faq.q}</span>
                    <div className={`transition-transform duration-300 ${openFaq === index ? 'rotate-180' : ''}`}>
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    </div>
                  </button>
                  <div 
                    className={`overflow-hidden transition-all duration-300 ${
                      openFaq === index ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="px-5 pb-5 text-slate-600">
                      {faq.a}
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <ScrollReveal>
            <div className="bg-gradient-to-br from-sky-500 to-sky-600 rounded-3xl p-8 md:p-12 text-center text-white">
              <Award className="w-12 h-12 mx-auto mb-4 opacity-90" />
              <h2 className="font-heading text-2xl md:text-3xl font-semibold mb-4">
                {treatment.ctaTitle}
              </h2>
              <p className="text-sky-100 mb-8 max-w-lg mx-auto">
                {treatment.ctaDescription}
              </p>
              <Link to={getLocalizedPath(`/city/${citySlug}/${treatmentType}/quiz`)}>
                <Button 
                  className="btn-animate btn-pulse h-14 px-10 rounded-full bg-white text-sky-600 hover:bg-sky-50 text-lg font-medium"
                  data-testid="start-quiz-cta"
                >
                  {isEN ? 'Start Assessment' : 'Започнете оценката'}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </Layout>
  );
};

export default TreatmentDetailPage;
