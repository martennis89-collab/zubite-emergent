import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { getClinicBySlug, seedDatabase } from '@/lib/api';
import { 
  ArrowRight, 
  Smile, 
  Target, 
  Stethoscope, 
  MapPin, 
  Phone, 
  Mail, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  Building
} from 'lucide-react';

const ClinicPage = () => {
  const { citySlug, clinicSlug } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clinic, setClinic] = useState(null);

  useEffect(() => {
    const loadClinic = async () => {
      try {
        await seedDatabase().catch(() => {});
        const data = await getClinicBySlug(citySlug, clinicSlug);
        setClinic(data);
      } catch (err) {
        console.error('Error loading clinic:', err);
        setError('Клиниката не е намерена');
      } finally {
        setLoading(false);
      }
    };
    loadClinic();
  }, [citySlug, clinicSlug]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </Layout>
    );
  }

  if (error || !clinic) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
          <AlertCircle className="w-16 h-16 text-destructive mb-4" />
          <h2 className="text-xl font-medium mb-2">Клиниката не е намерена</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Link to={`/city/${citySlug}`}>
            <Button className="btn-primary">Към {citySlug}</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const treatmentInfo = {
    invisalign: {
      icon: Smile,
      title: 'Invisalign',
      description: 'Невидимо подреждане на зъбите',
      path: 'invisalign'
    },
    implants: {
      icon: Target,
      title: 'Зъбни импланти',
      description: 'Трайно решение за липсващи зъби',
      path: 'implants'
    },
    full_mouth: {
      icon: Stethoscope,
      title: 'Пълна терапия',
      description: 'Комплексно възстановяване',
      path: 'full-mouth'
    }
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="bg-primary text-primary-foreground py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-2 text-accent text-sm mb-4">
                <MapPin className="w-4 h-4" />
                <span>{clinic.city}</span>
              </div>
              <h1 className="text-white mb-4">{clinic.name}</h1>
              {clinic.description && (
                <p className="text-slate-300 text-lg mb-6">{clinic.description}</p>
              )}
              <div className="space-y-3 mb-8">
                {clinic.address && (
                  <div className="flex items-center gap-3 text-slate-300">
                    <Building className="w-5 h-5" />
                    <span>{clinic.address}</span>
                  </div>
                )}
                {clinic.phone && (
                  <div className="flex items-center gap-3 text-slate-300">
                    <Phone className="w-5 h-5" />
                    <a href={`tel:${clinic.phone}`} className="hover:text-white transition-colors">
                      {clinic.phone}
                    </a>
                  </div>
                )}
                {clinic.email && (
                  <div className="flex items-center gap-3 text-slate-300">
                    <Mail className="w-5 h-5" />
                    <a href={`mailto:${clinic.email}`} className="hover:text-white transition-colors">
                      {clinic.email}
                    </a>
                  </div>
                )}
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="bg-white/10 rounded-2xl p-8">
                <h3 className="text-white font-medium mb-4">Поддържани лечения</h3>
                <div className="space-y-3">
                  {clinic.treatments_supported?.map((treatment) => {
                    const info = treatmentInfo[treatment];
                    if (!info) return null;
                    const Icon = info.icon;
                    return (
                      <div key={treatment} className="flex items-center gap-3 text-slate-300">
                        <CheckCircle className="w-5 h-5 text-accent" />
                        <span>{info.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
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
            {clinic.treatments_supported?.map((treatment) => {
              const info = treatmentInfo[treatment];
              if (!info) return null;
              const Icon = info.icon;
              
              return (
                <Link 
                  key={treatment}
                  to={`/city/${citySlug}/c/${clinicSlug}/${info.path}`}
                  className="treatment-card group"
                  data-testid={`treatment-card-${treatment}`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
                    <Icon className="w-7 h-7 text-accent" />
                  </div>
                  <h3 className="text-xl font-heading font-semibold text-primary mb-3">
                    {info.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {info.description}
                  </p>
                  <div className="flex items-center text-accent font-medium text-sm">
                    <span>Започнете въпросника</span>
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-surface">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-primary mb-6">Защо да изберете {clinic.name}?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6">
              <CheckCircle className="w-8 h-8 text-accent mx-auto mb-3" />
              <h4 className="font-medium mb-2">Премиум качество</h4>
              <p className="text-sm text-muted-foreground">Най-високи стандарти</p>
            </div>
            <div className="bg-white rounded-xl p-6">
              <CheckCircle className="w-8 h-8 text-accent mx-auto mb-3" />
              <h4 className="font-medium mb-2">Опитен екип</h4>
              <p className="text-sm text-muted-foreground">Сертифицирани специалисти</p>
            </div>
            <div className="bg-white rounded-xl p-6">
              <CheckCircle className="w-8 h-8 text-accent mx-auto mb-3" />
              <h4 className="font-medium mb-2">Модерно оборудване</h4>
              <p className="text-sm text-muted-foreground">Най-новите технологии</p>
            </div>
          </div>
          <Link to={`/city/${citySlug}/c/${clinicSlug}/invisalign`}>
            <Button className="btn-accent text-lg h-14 px-10">
              Започнете безплатна оценка
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default ClinicPage;
