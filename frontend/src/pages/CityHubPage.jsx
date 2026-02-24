import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { getCityInfo, seedDatabase } from '@/lib/api';
import { ArrowRight, Smile, Target, Stethoscope, MapPin, Loader2, AlertCircle, Building } from 'lucide-react';

const CityHubPage = () => {
  const { citySlug } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cityInfo, setCityInfo] = useState(null);

  useEffect(() => {
    const loadCity = async () => {
      try {
        await seedDatabase().catch(() => {});
        const data = await getCityInfo(citySlug);
        setCityInfo(data);
      } catch (err) {
        console.error('Error loading city:', err);
        setError('Градът не е намерен или няма активни клиники');
      } finally {
        setLoading(false);
      }
    };
    loadCity();
  }, [citySlug]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </Layout>
    );
  }

  if (error || !cityInfo) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
          <AlertCircle className="w-16 h-16 text-destructive mb-4" />
          <h2 className="text-xl font-medium mb-2">Градът не е намерен</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Link to="/">
            <Button className="btn-primary">Към началото</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Hero Section */}
      <section className="hero-gradient py-16 md:py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-2 text-accent font-medium text-sm mb-4">
              <MapPin className="w-4 h-4" />
              <span>{cityInfo.city_name}</span>
            </div>
            <h1 className="text-primary mb-6">
              Дентални решения в {cityInfo.city_name}
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Разберете дали сте подходящ кандидат за премиум дентално лечение 
              с нашите партньорски клиники в {cityInfo.city_name}.
            </p>
          </div>
        </div>
      </section>

      {/* Treatment Cards */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-primary mb-4">Изберете вашето лечение</h2>
            <p className="text-muted-foreground">
              Отговорете на кратък въпросник и получете персонализирана оценка
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {/* Invisalign Card */}
            <Link 
              to={`/city/${citySlug}/invisalign`}
              className="treatment-card group"
              data-testid="treatment-card-invisalign"
            >
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
                <Smile className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-xl font-heading font-semibold text-primary mb-3">
                Invisalign
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Невидимо подреждане на зъбите с прозрачни алайнери.
              </p>
              <div className="flex items-center text-accent font-medium text-sm">
                <span>Започнете въпросника</span>
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Implants Card */}
            <Link 
              to={`/city/${citySlug}/implants`}
              className="treatment-card group"
              data-testid="treatment-card-implants"
            >
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
                <Target className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-xl font-heading font-semibold text-primary mb-3">
                Зъбни импланти
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Трайно решение за липсващи зъби.
              </p>
              <div className="flex items-center text-accent font-medium text-sm">
                <span>Започнете въпросника</span>
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Full Mouth Card */}
            <Link 
              to={`/city/${citySlug}/full-mouth`}
              className="treatment-card group"
              data-testid="treatment-card-fullmouth"
            >
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
                <Stethoscope className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-xl font-heading font-semibold text-primary mb-3">
                Пълна терапия
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Комплексно възстановяване за цялостна промяна.
              </p>
              <div className="flex items-center text-accent font-medium text-sm">
                <span>Започнете въпросника</span>
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Clinics List */}
      {cityInfo.clinics && cityInfo.clinics.length > 0 && (
        <section className="py-16 md:py-24 bg-surface">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-primary mb-4">Партньорски клиники в {cityInfo.city_name}</h2>
              <p className="text-muted-foreground">
                {cityInfo.clinics_count} {cityInfo.clinics_count === 1 ? 'клиника' : 'клиники'} в региона
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cityInfo.clinics.map((clinic) => (
                <Link 
                  key={clinic.id}
                  to={`/city/${citySlug}/c/${clinic.clinic_slug}`}
                  className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-md transition-all"
                  data-testid={`clinic-card-${clinic.clinic_slug}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <Building className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-medium text-primary mb-1">{clinic.name}</h3>
                      {clinic.address && (
                        <p className="text-sm text-muted-foreground mb-2">{clinic.address}</p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {clinic.treatments_supported?.map((t) => (
                          <span key={t} className="text-xs bg-slate-100 px-2 py-0.5 rounded">
                            {t === 'invisalign' ? 'Invisalign' : t === 'implants' ? 'Импланти' : 'Пълна терапия'}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
};

export default CityHubPage;
