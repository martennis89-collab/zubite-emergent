import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useLanguage } from '@/context/LanguageContext';
import { getOrthoContent } from '@/lib/orthoData';
import { CITIES } from '@/lib/quizData';
import { 
  ArrowRight, ArrowLeft, Check, X, Minus, MapPin,
  ChevronDown, Sparkles, Clock, HelpCircle, 
  CheckCircle, AlertCircle, Star, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollReveal, useStaggerReveal } from '@/hooks/useScrollReveal';

const OrthoEducationPage = () => {
  const { citySlug } = useParams();
  const { language, getLocalizedPath, getCityName } = useLanguage();
  const [openFaq, setOpenFaq] = useState(null);
  
  const content = getOrthoContent(language);
  const city = CITIES[citySlug];
  const cityName = city ? getCityName(citySlug) : '';
  const isEN = language === 'en';
  
  const { containerRef: comparisonRef, isItemRevealed: isComparisonRevealed } = useStaggerReveal(8, { staggerDelay: 80 });
  const { containerRef: capabilitiesRef, isItemRevealed: isCapabilityRevealed } = useStaggerReveal(6, { staggerDelay: 100 });
  const { containerRef: bracesRef, isItemRevealed: isBraceRevealed } = useStaggerReveal(4, { staggerDelay: 100 });

  const getWinnerIcon = (winner) => {
    if (winner === 'aligners') return <Check className="w-4 h-4 text-emerald-500" />;
    if (winner === 'braces') return <Check className="w-4 h-4 text-sky-500" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-slate-900 to-slate-800 text-white overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 text-center">
          {city && (
            <ScrollReveal delay={0}>
              <Link 
                to={getLocalizedPath(`/city/${citySlug}`)} 
                className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{isEN ? 'Back to treatments' : 'Назад към лечения'}</span>
              </Link>
            </ScrollReveal>
          )}
          
          <ScrollReveal delay={100}>
            <div className="inline-flex items-center gap-2 text-sky-400 text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              <span>{isEN ? 'Educational Guide' : 'Образователен справочник'}</span>
            </div>
          </ScrollReveal>
          
          <ScrollReveal delay={200}>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-semibold mb-4 leading-tight">
              {content.hero.title}
              <span className="block text-sky-400">{content.hero.subtitle}</span>
            </h1>
          </ScrollReveal>
          
          <ScrollReveal delay={300}>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-8">
              {content.hero.description}
            </p>
          </ScrollReveal>
          
          <ScrollReveal delay={400}>
            <Link to={city ? getLocalizedPath(`/city/${citySlug}/ortho/quiz`) : '#quizzes'}>
              <Button className="btn-animate btn-pulse h-14 px-10 rounded-full bg-sky-500 hover:bg-sky-400 text-lg font-medium">
                {content.hero.cta}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* Comparison Table Section */}
      <section className="py-16 bg-white" id="comparison">
        <div className="max-w-5xl mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-slate-900 mb-3">
                {content.comparison.title}
              </h2>
              <p className="text-slate-600">{content.comparison.subtitle}</p>
            </div>
          </ScrollReveal>
          
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-4 gap-4 mb-4 px-4">
            <div className="text-sm font-medium text-slate-500">{isEN ? 'Category' : 'Категория'}</div>
            <div className="text-sm font-medium text-emerald-600 text-center">{isEN ? 'Aligners' : 'Алайнери'}</div>
            <div className="text-sm font-medium text-sky-600 text-center">{isEN ? 'Braces' : 'Брекети'}</div>
            <div className="text-sm font-medium text-slate-500 text-center">{isEN ? 'Winner' : 'Предимство'}</div>
          </div>
          
          {/* Table Rows */}
          <div ref={comparisonRef} className="space-y-3">
            {content.comparison.categories.map((cat, index) => (
              <div 
                key={index}
                className={`bg-slate-50 rounded-xl p-4 md:p-5 border border-slate-200 transition-all duration-500 ${
                  isComparisonRevealed(index) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                {/* Mobile Layout */}
                <div className="md:hidden space-y-3">
                  <div className="font-medium text-slate-900">{cat.name}</div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-emerald-50 rounded-lg p-3">
                      <div className="text-emerald-600 font-medium text-xs mb-1">{isEN ? 'Aligners' : 'Алайнери'}</div>
                      <div className="text-slate-700">{cat.aligners}</div>
                    </div>
                    <div className="bg-sky-50 rounded-lg p-3">
                      <div className="text-sky-600 font-medium text-xs mb-1">{isEN ? 'Braces' : 'Брекети'}</div>
                      <div className="text-slate-700">{cat.braces}</div>
                    </div>
                  </div>
                </div>
                
                {/* Desktop Layout */}
                <div className="hidden md:grid grid-cols-4 gap-4 items-center">
                  <div className="font-medium text-slate-900">{cat.name}</div>
                  <div className={`text-sm ${cat.winner === 'aligners' ? 'text-emerald-700 font-medium' : 'text-slate-600'}`}>
                    {cat.aligners}
                  </div>
                  <div className={`text-sm ${cat.winner === 'braces' ? 'text-sky-700 font-medium' : 'text-slate-600'}`}>
                    {cat.braces}
                  </div>
                  <div className="flex justify-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      cat.winner === 'aligners' ? 'bg-emerald-100' : 
                      cat.winner === 'braces' ? 'bg-sky-100' : 'bg-slate-100'
                    }`}>
                      {getWinnerIcon(cat.winner)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modern Aligners Capabilities */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-slate-900 mb-3">
                {content.modernAligners.title}
              </h2>
              <p className="text-sky-600 font-medium mb-4">{content.modernAligners.subtitle}</p>
              <p className="text-slate-600 max-w-2xl mx-auto">{content.modernAligners.intro}</p>
            </div>
          </ScrollReveal>
          
          {/* Capabilities Grid */}
          <div ref={capabilitiesRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {content.modernAligners.capabilities.map((cap, index) => (
              <div 
                key={index}
                className={`bg-white rounded-2xl p-6 border border-slate-200 card-hover-subtle transition-all duration-500 ${
                  isCapabilityRevealed(index) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center mb-4">
                  <CheckCircle className="w-6 h-6 text-sky-600" />
                </div>
                <h3 className="font-medium text-slate-900 mb-2">{cap.title}</h3>
                <p className="text-sm text-slate-500">{cap.description}</p>
              </div>
            ))}
          </div>
          
          {/* Disclaimer */}
          <ScrollReveal>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mb-12">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">{content.modernAligners.disclaimer}</p>
            </div>
          </ScrollReveal>
          
          {/* Clinical Advantages */}
          <ScrollReveal>
            <div className="bg-white rounded-2xl border border-slate-200 p-8">
              <h3 className="font-heading text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <Star className="w-5 h-5 text-sky-500" />
                {content.modernAligners.clinicalAdvantages.title}
              </h3>
              <ul className="space-y-3">
                {content.modernAligners.clinicalAdvantages.points.map((point, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* When Braces Are Better */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-slate-900 mb-3">
                {content.bracesAdvantages.title}
              </h2>
              <p className="text-slate-600">{content.bracesAdvantages.subtitle}</p>
            </div>
          </ScrollReveal>
          
          <div ref={bracesRef} className="space-y-4">
            {content.bracesAdvantages.points.map((point, index) => (
              <div 
                key={index}
                className={`bg-sky-50 rounded-2xl p-6 border border-sky-200 transition-all duration-500 ${
                  isBraceRevealed(index) ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <h3 className="font-medium text-slate-900 mb-2">{point.title}</h3>
                <p className="text-sm text-slate-600">{point.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-slate-900 mb-3">
                {content.faq.title}
              </h2>
              <p className="text-slate-600">{content.faq.subtitle}</p>
            </div>
          </ScrollReveal>
          
          <div className="space-y-3">
            {content.faq.items.map((item, index) => (
              <ScrollReveal key={index} delay={index * 50}>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-all duration-300 hover:border-slate-300">
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full flex items-center justify-between p-5 text-left"
                    data-testid={`ortho-faq-${index}`}
                  >
                    <span className="font-medium text-slate-900 pr-4 flex items-start gap-3">
                      <HelpCircle className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
                      {item.q}
                    </span>
                    <div className={`transition-transform duration-300 flex-shrink-0 ${openFaq === index ? 'rotate-180' : ''}`}>
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    </div>
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${
                    openFaq === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                    <div className="px-5 pb-5 pl-14 text-slate-600">
                      {item.a}
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Quiz Selection Section */}
      <section className="py-16 bg-white" id="quizzes">
        <div className="max-w-4xl mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-slate-900 mb-3">
                {content.quizSelection.title}
              </h2>
              <p className="text-slate-600">{content.quizSelection.subtitle}</p>
            </div>
          </ScrollReveal>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {content.quizSelection.quizzes.map((quiz, index) => (
              <ScrollReveal key={quiz.id} delay={index * 150}>
                <Link 
                  to={city ? getLocalizedPath(`/city/${citySlug}/ortho/${quiz.id}`) : getLocalizedPath(`/ortho/${quiz.id}`)}
                  className="block bg-slate-50 rounded-2xl border border-slate-200 p-8 hover:border-sky-300 hover:bg-sky-50 transition-all duration-300 card-hover group"
                  data-testid={`quiz-${quiz.id}`}
                >
                  <div className="flex items-center gap-2 text-sky-600 text-sm font-medium mb-3">
                    <Clock className="w-4 h-4" />
                    <span>{quiz.duration}</span>
                    <span className="text-slate-400">•</span>
                    <span>{quiz.questions} {isEN ? 'questions' : 'въпроса'}</span>
                  </div>
                  <h3 className="font-heading text-xl font-semibold text-slate-900 mb-3">{quiz.title}</h3>
                  <p className="text-slate-600 text-sm mb-4">{quiz.description}</p>
                  <div className="flex items-center text-sky-600 font-medium">
                    <span>{isEN ? 'Start Quiz' : 'Започнете теста'}</span>
                    <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-300 group-hover:translate-x-2" />
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 bg-slate-900">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <ScrollReveal>
            <Users className="w-12 h-12 text-sky-400 mx-auto mb-4" />
            <h2 className="font-heading text-2xl md:text-3xl font-semibold text-white mb-4">
              {content.cta.title}
            </h2>
            <p className="text-slate-300 mb-8 max-w-lg mx-auto">
              {content.cta.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={city ? getLocalizedPath(`/city/${citySlug}/ortho/quiz`) : '#quizzes'}>
                <Button className="btn-animate h-12 px-8 rounded-full bg-sky-500 hover:bg-sky-400">
                  {content.cta.primaryButton}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to={getLocalizedPath('/contact')}>
                <Button variant="outline" className="h-12 px-8 rounded-full border-slate-600 text-white hover:bg-slate-800">
                  {content.cta.secondaryButton}
                </Button>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </Layout>
  );
};

export default OrthoEducationPage;
