import { useParams, Link, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useLanguage } from '@/context/LanguageContext';
import { getSymptom, SYMPTOMS } from '@/lib/symptomsData';
import { AlertCircle, Circle, Shuffle, Droplet, Layers, Zap, ArrowRight, ArrowLeft, CheckCircle, AlertTriangle, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';

const iconMap = {
  AlertCircle,
  Circle,
  Shuffle,
  Droplet,
  Layers,
  Zap
};

const SymptomDetailPage = () => {
  const { symptomSlug } = useParams();
  const { language, getLocalizedPath } = useLanguage();
  
  const symptom = getSymptom(symptomSlug, language);
  const isEN = language === 'en';
  
  if (!symptom) {
    return <Navigate to={getLocalizedPath('/symptoms')} replace />;
  }
  
  const Icon = iconMap[symptom.icon] || AlertCircle;

  return (
    <Layout>
      {/* Hero */}
      <section className="py-12 md:py-16 bg-white border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4">
          {/* Back link */}
          <Link 
            to={getLocalizedPath('/symptoms')} 
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6"
            data-testid="back-to-symptoms"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isEN ? 'All Symptoms' : 'Всички симптоми'}</span>
          </Link>
          
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-100 flex items-center justify-center flex-shrink-0">
              <Icon className="w-7 h-7 text-sky-600" />
            </div>
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-slate-900 mb-2">
                {symptom.name}
              </h1>
              <p className="text-lg text-slate-600">{symptom.shortDesc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4">
          {/* Description */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 mb-6">
            <p className="text-slate-700 leading-relaxed">{symptom.description}</p>
          </div>

          {/* Causes */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 mb-6">
            <h2 className="font-heading text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {isEN ? 'Common Causes' : 'Възможни причини'}
            </h2>
            <ul className="space-y-3">
              {symptom.causes.map((cause, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                  <span className="text-slate-600">{cause}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* When to seek help */}
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6 md:p-8 mb-6">
            <h2 className="font-heading text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-amber-600" />
              {isEN ? 'When to Seek Professional Help' : 'Кога да потърсите специалист'}
            </h2>
            <ul className="space-y-3">
              {symptom.whenToSeek.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Treatment options */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 mb-8">
            <h2 className="font-heading text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              {isEN ? 'Treatment Options' : 'Възможности за лечение'}
            </h2>
            <div className="flex flex-wrap gap-2">
              {symptom.treatments.map((treatment, index) => (
                <span 
                  key={index} 
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-full text-sm"
                >
                  {treatment}
                </span>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="bg-sky-50 rounded-2xl border border-sky-200 p-6 md:p-8 text-center">
            <h2 className="font-heading text-xl font-semibold text-slate-900 mb-3">
              {symptom.ctaText}
            </h2>
            <p className="text-slate-600 mb-6">
              {isEN 
                ? 'Take our quick assessment to get personalized recommendations.'
                : 'Преминете през нашата бърза оценка за персонализирани препоръки.'}
            </p>
            <Link to={getLocalizedPath('/')}>
              <Button className="h-12 px-8 rounded-full bg-sky-500 hover:bg-sky-600" data-testid="symptom-cta">
                {isEN ? 'Start Assessment' : 'Започнете оценката'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Related symptoms */}
      <section className="py-12 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-heading text-xl font-semibold text-slate-900 mb-6 text-center">
            {isEN ? 'Other Symptoms' : 'Други симптоми'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.values(SYMPTOMS)
              .filter(s => s.slug !== symptomSlug)
              .slice(0, 3)
              .map(s => {
                const RelatedIcon = iconMap[s.icon] || AlertCircle;
                const relatedData = s[language];
                return (
                  <Link
                    key={s.slug}
                    to={getLocalizedPath(`/symptoms/${s.slug}`)}
                    className="group bg-slate-50 hover:bg-sky-50 rounded-xl p-4 transition-colors border border-slate-200 hover:border-sky-300"
                  >
                    <RelatedIcon className="w-5 h-5 text-sky-600 mb-2" />
                    <h3 className="font-medium text-slate-900 text-sm">{relatedData.name}</h3>
                  </Link>
                );
              })}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default SymptomDetailPage;
