import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle, XCircle, Smile, Target, Stethoscope, Clock, Shield, Users } from 'lucide-react';
import { seedDatabase } from '@/lib/api';

const HomePage = () => {
  // Seed database on first load
  useEffect(() => {
    seedDatabase().catch(() => {});
  }, []);

  return (
    <Layout>
      {/* Hero Section */}
      <section className="hero-gradient py-16 md:py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="opacity-0 animate-fadeIn">
              <span className="inline-block text-accent font-medium text-sm mb-4 tracking-wide uppercase">
                Навигатор за дентални решения
              </span>
              <h1 className="text-primary mb-6">
                Разберете дали сте подходящ кандидат за премиум дентално лечение
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-lg">
                Invisalign, зъбни импланти или пълна възстановителна терапия – 
                отговорете на няколко въпроса и получете персонализирана оценка.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/invisalign" data-testid="hero-cta-invisalign">
                  <Button className="btn-primary w-full sm:w-auto">
                    Започнете сега
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <a href="#how-it-works" data-testid="hero-cta-how">
                  <Button variant="outline" className="h-12 px-6 rounded-full w-full sm:w-auto">
                    Как работи?
                  </Button>
                </a>
              </div>
            </div>
            <div className="opacity-0 animate-fadeIn animate-delay-200 hidden lg:block">
              <img 
                src="https://images.pexels.com/photos/3845766/pexels-photo-3845766.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Confident smile"
                className="rounded-2xl shadow-xl w-full object-cover aspect-[4/3]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Treatment Cards */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-primary mb-4">Изберете вашето лечение</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Отговорете на кратък въпросник и разберете дали сте подходящ кандидат за избраното лечение.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {/* Invisalign Card */}
            <Link 
              to="/invisalign" 
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
                Невидимо подреждане на зъбите с прозрачни алайнери. Дискретно и комфортно решение.
              </p>
              <div className="flex items-center text-accent font-medium text-sm">
                <span>Проверете дали сте подходящи</span>
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Implants Card */}
            <Link 
              to="/implants" 
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
                Трайно решение за липсващи зъби. Функционалност и естетика като при естествените зъби.
              </p>
              <div className="flex items-center text-accent font-medium text-sm">
                <span>Проверете дали сте подходящи</span>
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Full Mouth Card */}
            <Link 
              to="/full-mouth" 
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
                Комплексно възстановяване за цялостна промяна. За случаи с множество проблеми.
              </p>
              <div className="flex items-center text-accent font-medium text-sm">
                <span>Проверете дали сте подходящи</span>
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 md:py-24 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-primary mb-4">Как работи</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Три прости стъпки до персонализирана оценка
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center" data-testid="how-step-1">
              <div className="w-16 h-16 rounded-full bg-accent text-white flex items-center justify-center text-2xl font-heading font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-lg font-medium text-primary mb-2">Избирате лечение</h3>
              <p className="text-muted-foreground text-sm">
                Изберете от Invisalign, импланти или пълна възстановителна терапия
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center" data-testid="how-step-2">
              <div className="w-16 h-16 rounded-full bg-accent text-white flex items-center justify-center text-2xl font-heading font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-lg font-medium text-primary mb-2">Отговаряте на въпроси</h3>
              <p className="text-muted-foreground text-sm">
                Кратък въпросник от 8-10 въпроса, отнема около 60-90 секунди
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center" data-testid="how-step-3">
              <div className="w-16 h-16 rounded-full bg-accent text-white flex items-center justify-center text-2xl font-heading font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-lg font-medium text-primary mb-2">Получавате насочване</h3>
              <p className="text-muted-foreground text-sm">
                Персонализирана оценка и възможност за консултация с партньорска клиника
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Whom Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* For Whom */}
            <div className="bg-success/5 rounded-2xl p-8" data-testid="for-whom-section">
              <h3 className="text-xl font-heading font-semibold text-primary mb-6 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-success" />
                За кого е тази платформа
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span>За хора, които търсят качествено и дълготрайно решение</span>
                </li>
                <li className="flex items-start gap-3 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span>За тези, които ценят професионализъм и индивидуален подход</span>
                </li>
                <li className="flex items-start gap-3 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span>За хора, готови да инвестират в здравето си</span>
                </li>
                <li className="flex items-start gap-3 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span>За тези, които искат да разберат възможностите си преди консултация</span>
                </li>
              </ul>
            </div>

            {/* Not For Whom */}
            <div className="bg-destructive/5 rounded-2xl p-8" data-testid="not-for-whom-section">
              <h3 className="text-xl font-heading font-semibold text-primary mb-6 flex items-center gap-3">
                <XCircle className="w-6 h-6 text-destructive" />
                За кого НЕ е
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-muted-foreground">
                  <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <span>За търсещи най-ниската цена на всяка цена</span>
                </li>
                <li className="flex items-start gap-3 text-muted-foreground">
                  <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <span>За хора без реално намерение за лечение</span>
                </li>
                <li className="flex items-start gap-3 text-muted-foreground">
                  <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <span>За търсещи безплатни консултации без ангажимент</span>
                </li>
                <li className="flex items-start gap-3 text-muted-foreground">
                  <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <span>За хора, които не са готови да инвестират в качество</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-16 md:py-24 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6" data-testid="trust-fast">
              <Clock className="w-10 h-10 text-accent mx-auto mb-4" />
              <h4 className="font-medium text-primary mb-2">Бързо и лесно</h4>
              <p className="text-sm text-muted-foreground">60-90 секунди за пълна квалификация</p>
            </div>
            <div className="p-6" data-testid="trust-secure">
              <Shield className="w-10 h-10 text-accent mx-auto mb-4" />
              <h4 className="font-medium text-primary mb-2">Защита на данните</h4>
              <p className="text-sm text-muted-foreground">GDPR съответствие и сигурност</p>
            </div>
            <div className="p-6" data-testid="trust-partners">
              <Users className="w-10 h-10 text-accent mx-auto mb-4" />
              <h4 className="font-medium text-primary mb-2">Партньорски клиники</h4>
              <p className="text-sm text-muted-foreground">Само проверени премиум специалисти</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-white mb-6">Готови ли сте да разберете?</h2>
          <p className="text-slate-300 mb-8 max-w-xl mx-auto">
            Отнема само 60-90 секунди. Без ангажимент, без такси – само честна оценка на вашата ситуация.
          </p>
          <Link to="/invisalign" data-testid="cta-start-quiz">
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

export default HomePage;
