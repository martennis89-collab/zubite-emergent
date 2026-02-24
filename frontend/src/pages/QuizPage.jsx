import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Quiz } from '@/components/Quiz';
import { getQuizByType } from '@/lib/quizData';
import { getCityInfo, getClinicBySlug, seedDatabase } from '@/lib/api';
import { Clock, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const QuizPage = ({ treatmentType, legacyMode = false }) => {
  const { citySlug, clinicSlug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cityInfo, setCityInfo] = useState(null);
  const [clinicInfo, setClinicInfo] = useState(null);
  
  // Default city for legacy mode
  const effectiveCitySlug = citySlug || 'haskovo';
  
  useEffect(() => {
    const loadData = async () => {
      try {
        // Ensure database is seeded
        await seedDatabase().catch(() => {});
        
        // Load city info
        const city = await getCityInfo(effectiveCitySlug);
        setCityInfo(city);
        
        // Load clinic info if slug provided
        if (clinicSlug) {
          const clinic = await getClinicBySlug(effectiveCitySlug, clinicSlug);
          setClinicInfo(clinic);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Градът или клиниката не са намерени');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [effectiveCitySlug, clinicSlug]);
  
  const quizData = getQuizByType(treatmentType);
  
  if (loading) {
    return (
      <Layout showFooter={false}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </Layout>
    );
  }
  
  if (error || !cityInfo) {
    return (
      <Layout showFooter={false}>
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
          <AlertCircle className="w-16 h-16 text-destructive mb-4" />
          <h2 className="text-xl font-medium mb-2">Грешка</h2>
          <p className="text-muted-foreground mb-6">{error || 'Градът не е намерен'}</p>
          <Button onClick={() => navigate('/')} className="btn-primary">
            Към началото
          </Button>
        </div>
      </Layout>
    );
  }
  
  if (!quizData) {
    return (
      <Layout showFooter={false}>
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
          <AlertCircle className="w-16 h-16 text-destructive mb-4" />
          <h2 className="text-xl font-medium mb-2">Невалиден тип лечение</h2>
          <Button onClick={() => navigate('/')} className="btn-primary">
            Към началото
          </Button>
        </div>
      </Layout>
    );
  }
  
  const treatmentTitles = {
    invisalign: 'Invisalign',
    implants: 'Зъбни импланти',
    full_mouth: 'Пълна възстановителна терапия'
  };

  return (
    <Layout showFooter={false}>
      {/* Hero Banner */}
      <section className="bg-primary text-primary-foreground py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <span className="inline-block bg-accent/20 text-accent px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            {treatmentTitles[treatmentType]}
          </span>
          <h1 className="text-white mb-4">
            {quizData.subtitle}
          </h1>
          <p className="text-slate-300 max-w-2xl mx-auto mb-4">
            {clinicInfo ? (
              <>Въпросник за <strong>{clinicInfo.name}</strong> в {cityInfo.city_name}</>
            ) : (
              <>Въпросник за {cityInfo.city_name}</>
            )}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{quizData.estimatedTime}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>{quizData.questions.length} въпроса</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Незабавен резултат</span>
            </div>
          </div>
        </div>
      </section>

      {/* Quiz */}
      <Quiz 
        quizData={quizData} 
        citySlug={effectiveCitySlug}
        clinicSlug={clinicSlug || null}
        cityName={cityInfo.city_name}
      />
    </Layout>
  );
};

export default QuizPage;
