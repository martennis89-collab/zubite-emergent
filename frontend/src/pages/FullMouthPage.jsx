import { Layout } from '@/components/Layout';
import { Quiz } from '@/components/Quiz';
import { fullMouthQuiz } from '@/lib/quizData';
import { Clock, CheckCircle } from 'lucide-react';

const FullMouthPage = () => {
  return (
    <Layout showFooter={false}>
      {/* Hero Banner */}
      <section className="bg-primary text-primary-foreground py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <span className="inline-block bg-accent/20 text-accent px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            Пълна възстановителна терапия
          </span>
          <h1 className="text-white mb-4">
            Комплексно решение за цялостна промяна
          </h1>
          <p className="text-slate-300 max-w-2xl mx-auto mb-6">
            Проверете дали сте подходящ кандидат за пълна възстановителна терапия – 
            цялостен подход за трансформация на вашата усмивка.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>90 секунди</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>8 въпроса</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Незабавен резултат</span>
            </div>
          </div>
        </div>
      </section>

      {/* Quiz */}
      <Quiz quizData={fullMouthQuiz} />
    </Layout>
  );
};

export default FullMouthPage;
