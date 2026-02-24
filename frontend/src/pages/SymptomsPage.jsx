import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useLanguage } from '@/context/LanguageContext';
import { getAllSymptoms } from '@/lib/symptomsData';
import { AlertCircle, Circle, Shuffle, Droplet, Layers, Zap, ArrowRight, Stethoscope } from 'lucide-react';

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
  
  const isEN = language === 'en';

  return (
    <Layout>
      {/* Hero */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-sky-100 flex items-center justify-center mx-auto mb-6">
            <Stethoscope className="w-8 h-8 text-sky-600" />
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-slate-900 mb-4">
            {isEN ? 'Dental Symptoms Guide' : 'Дентални симптоми'}
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {isEN 
              ? 'Learn about common dental symptoms, their causes, and when to seek professional help.'
              : 'Научете за често срещаните дентални симптоми, техните причини и кога да потърсите професионална помощ.'}
          </p>
        </div>
      </section>

      {/* Symptoms Grid */}
      <section className="py-12 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {symptoms.map((symptom) => {
              const Icon = iconMap[symptom.icon] || AlertCircle;
              return (
                <Link
                  key={symptom.slug}
                  to={getLocalizedPath(`/symptoms/${symptom.slug}`)}
                  className="group bg-white rounded-2xl border border-slate-200 hover:border-sky-300 p-6 transition-all hover:shadow-md"
                  data-testid={`symptom-${symptom.slug}`}
                >
                  <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center mb-4 group-hover:bg-sky-100 transition-colors">
                    <Icon className="w-6 h-6 text-sky-600" />
                  </div>
                  <h3 className="font-medium text-slate-900 mb-2">{symptom.name}</h3>
                  <p className="text-sm text-slate-500 mb-4">{symptom.shortDesc}</p>
                  <div className="flex items-center text-sm text-sky-600 font-medium">
                    <span>{isEN ? 'Learn more' : 'Научете повече'}</span>
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
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
          <h2 className="font-heading text-2xl font-semibold text-slate-900 mb-4">
            {isEN ? 'Not sure about your symptoms?' : 'Не сте сигурни за симптомите си?'}
          </h2>
          <p className="text-slate-600 mb-8">
            {isEN 
              ? 'Take our quick assessment to find out if you are a suitable candidate for treatment.'
              : 'Преминете през нашата бърза оценка, за да разберете дали сте подходящ кандидат за лечение.'}
          </p>
          <Link
            to={getLocalizedPath('/')}
            className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-sky-500 hover:bg-sky-600 text-white font-medium transition-colors"
            data-testid="symptoms-cta"
          >
            {isEN ? 'Start Assessment' : 'Започнете оценката'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default SymptomsPage;
