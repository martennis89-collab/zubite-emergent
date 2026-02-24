import { useParams, Link, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Smile, Target, Stethoscope, ArrowRight, ArrowLeft, MapPin } from 'lucide-react';
import { CITIES } from '@/lib/quizData';
import { useLanguage } from '@/context/LanguageContext';

const TreatmentSelectPage = () => {
  const { citySlug } = useParams();
  const { t, getLocalizedPath, getCityName, getTreatment } = useLanguage();
  const city = CITIES[citySlug];
  
  if (!city) return <Navigate to={getLocalizedPath('/')} replace />;

  const treatments = [
    { key: 'invisalign', icon: Smile, path: 'invisalign' },
    { key: 'implants', icon: Target, path: 'implants' },
    { key: 'full-mouth', icon: Stethoscope, path: 'full-mouth' }
  ];

  return (
    <Layout>
      <div className="py-16 md:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          {/* Back */}
          <Link to={getLocalizedPath('/')} className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-8" data-testid="back-btn">
            <ArrowLeft className="w-4 h-4" />
            <span>{t('quiz.back')}</span>
          </Link>
          
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 text-sky-500 text-sm mb-4">
              <MapPin className="w-4 h-4" />
              <span>{getCityName(citySlug)}</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-slate-900 mb-4">
              {t('treatments.title')} {t('treatments.subtitle')} {getCityName(citySlug)}
            </h1>
            <p className="text-slate-500">
              {t('common.yes') === 'Yes' ? 'Select the type of treatment to proceed to the assessment' : 'Изберете типа лечение, за да преминете към оценката'}
            </p>
          </div>
          
          {/* Treatment Cards */}
          <div className="space-y-4">
            {treatments.map((item) => {
              const treatment = getTreatment(item.key);
              return (
                <Link
                  key={item.path}
                  to={getLocalizedPath(`/city/${citySlug}/${item.path}`)}
                  className="group flex items-center gap-6 bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-2xl p-6 transition-all"
                  data-testid={`treatment-${item.path}`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-sky-100 flex items-center justify-center flex-shrink-0 group-hover:bg-sky-200 transition-colors">
                    <item.icon className="w-7 h-7 text-sky-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900 mb-1">{treatment.name}</h3>
                    <p className="text-sm text-slate-500">{treatment.description}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
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
