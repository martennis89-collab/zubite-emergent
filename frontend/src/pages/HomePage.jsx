import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { MapPin, ArrowRight, Shield, Clock, Users } from 'lucide-react';
import { seedDatabase } from '@/lib/api';
import { CITIES } from '@/lib/quizData';

const HomePage = () => {
  useEffect(() => { seedDatabase().catch(() => {}); }, []);

  return (
    <Layout>
      {/* Hero */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sky-500 font-medium text-sm tracking-wide uppercase mb-4">
            Навигатор за дентални решения
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-tight mb-6">
            Намерете подходяща клиника за вашето лечение
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-12">
            Изберете вашия град и преминете през кратка оценка, за да разберете дали сте подходящ кандидат за лечение.
          </p>
          
          {/* City Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.values(CITIES).map((city) => (
              <Link
                key={city.slug}
                to={`/city/${city.slug}`}
                className="group bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-2xl p-6 transition-all duration-200"
                data-testid={`city-${city.slug}`}
              >
                <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center mx-auto mb-4 group-hover:bg-sky-200 transition-colors">
                  <MapPin className="w-5 h-5 text-sky-600" />
                </div>
                <h3 className="font-medium text-slate-900">{city.name}</h3>
                <div className="flex items-center justify-center gap-1 mt-2 text-sm text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Избери</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-16 bg-slate-50 border-y border-slate-100">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <Clock className="w-8 h-8 text-sky-500 mx-auto mb-3" />
              <h4 className="font-medium text-slate-900 mb-1">60-90 секунди</h4>
              <p className="text-sm text-slate-500">Бърза оценка</p>
            </div>
            <div>
              <Shield className="w-8 h-8 text-sky-500 mx-auto mb-3" />
              <h4 className="font-medium text-slate-900 mb-1">Защита на данни</h4>
              <p className="text-sm text-slate-500">GDPR съответствие</p>
            </div>
            <div>
              <Users className="w-8 h-8 text-sky-500 mx-auto mb-3" />
              <h4 className="font-medium text-slate-900 mb-1">Партньорски клиники</h4>
              <p className="text-sm text-slate-500">Проверени специалисти</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-heading text-2xl font-semibold text-slate-900 text-center mb-12">Как работи</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { n: '1', t: 'Изберете град', d: 'Изберете вашия град от списъка' },
              { n: '2', t: 'Изберете лечение', d: 'Изберете типа дентално лечение' },
              { n: '3', t: 'Преминете оценка', d: 'Отговорете на кратък въпросник' }
            ].map((step) => (
              <div key={step.n} className="text-center">
                <div className="w-12 h-12 rounded-full bg-sky-500 text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {step.n}
                </div>
                <h3 className="font-medium text-slate-900 mb-2">{step.t}</h3>
                <p className="text-sm text-slate-500">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default HomePage;
