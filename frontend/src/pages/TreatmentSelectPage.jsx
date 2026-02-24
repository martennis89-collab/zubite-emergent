import { useParams, Link, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Smile, Target, Stethoscope, ArrowRight, ArrowLeft, MapPin } from 'lucide-react';
import { CITIES, TREATMENTS } from '@/lib/quizData';

const TreatmentSelectPage = () => {
  const { citySlug } = useParams();
  const city = CITIES[citySlug];
  
  if (!city) return <Navigate to="/" replace />;

  const treatments = [
    { ...TREATMENTS['invisalign'], icon: Smile, path: 'invisalign' },
    { ...TREATMENTS['implants'], icon: Target, path: 'implants' },
    { ...TREATMENTS['full-mouth'], icon: Stethoscope, path: 'full-mouth' }
  ];

  return (
    <Layout>
      <div className="py-16 md:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          {/* Back */}
          <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-8" data-testid="back-btn">
            <ArrowLeft className="w-4 h-4" />
            <span>Назад</span>
          </Link>
          
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 text-sky-500 text-sm mb-4">
              <MapPin className="w-4 h-4" />
              <span>{city.name}</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-slate-900 mb-4">
              Какво лечение ви интересува?
            </h1>
            <p className="text-slate-500">
              Изберете типа лечение, за да преминете към оценката
            </p>
          </div>
          
          {/* Treatment Cards */}
          <div className="space-y-4">
            {treatments.map((t) => (
              <Link
                key={t.path}
                to={`/city/${citySlug}/${t.path}`}
                className="group flex items-center gap-6 bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-2xl p-6 transition-all"
                data-testid={`treatment-${t.path}`}
              >
                <div className="w-14 h-14 rounded-2xl bg-sky-100 flex items-center justify-center flex-shrink-0 group-hover:bg-sky-200 transition-colors">
                  <t.icon className="w-7 h-7 text-sky-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-slate-900 mb-1">{t.name}</h3>
                  <p className="text-sm text-slate-500">{t.description}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TreatmentSelectPage;
