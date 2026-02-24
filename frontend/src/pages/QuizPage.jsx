import { useState } from 'react';
import { useParams, useNavigate, Navigate, Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, CheckCircle, Clock, Loader2, MapPin } from 'lucide-react';
import { createLead } from '@/lib/api';
import { getUTMParams } from '@/lib/utils';
import { CITIES, TREATMENTS, getQuizQuestions } from '@/lib/quizData';
import { toast } from 'sonner';

const QuizPage = () => {
  const { citySlug, treatmentType } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [canTravel, setCanTravel] = useState(true);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const city = CITIES[citySlug];
  const treatmentKey = treatmentType === 'full-mouth' ? 'full-mouth' : treatmentType;
  const treatment = TREATMENTS[treatmentKey];
  
  if (!city || !treatment) return <Navigate to="/" replace />;
  
  const questions = getQuizQuestions(treatmentType === 'full-mouth' ? 'full_mouth' : treatmentType, city.name);
  const totalSteps = questions.length + 1;
  const progress = ((step + 1) / totalSteps) * 100;
  const isConsentStep = step === questions.length;
  const currentQ = questions[step];

  const handleAnswer = (value) => {
    if (currentQ.type === 'travel') {
      setCanTravel(value === 'yes');
    }
    setAnswers(prev => ({ ...prev, [currentQ.id]: value }));
  };

  const handleNext = () => {
    if (!isConsentStep && !answers[currentQ.id]) {
      toast.error('Моля, изберете отговор');
      return;
    }
    if (step < totalSteps - 1) setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const handleSubmit = async () => {
    if (!consent) {
      toast.error('Моля, дайте съгласие');
      return;
    }
    setSubmitting(true);
    try {
      const lead = await createLead({
        city_slug: citySlug,
        treatment_type: treatmentType === 'full-mouth' ? 'full_mouth' : treatmentType,
        answers,
        can_travel: canTravel,
        ...getUTMParams(),
        page_path: window.location.pathname
      });
      toast.success('Изпратено успешно!');
      navigate(`/results/${lead.id}`);
    } catch (e) {
      toast.error('Грешка. Опитайте отново.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout showFooter={false}>
      {/* Header */}
      <div className="bg-slate-900 text-white py-8 md:py-12">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 text-sky-400 text-sm mb-3">
            <MapPin className="w-4 h-4" />
            <span>{city.name}</span>
          </div>
          <h1 className="font-heading text-xl sm:text-2xl font-semibold mb-2">{treatment.name}</h1>
          <div className="flex items-center justify-center gap-4 text-slate-400 text-sm">
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" />60-90 сек.</span>
            <span>{questions.length} въпроса</span>
          </div>
        </div>
      </div>

      {/* Quiz */}
      <div className="py-8 md:py-12 bg-slate-50 min-h-[60vh]">
        <div className="max-w-xl mx-auto px-4">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-slate-500 mb-2">
              <span>Въпрос {Math.min(step + 1, questions.length)} от {questions.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Question Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 mb-6">
            {!isConsentStep ? (
              <>
                <h2 className="text-lg font-medium text-slate-900 mb-6">{currentQ.question}</h2>
                <div className="space-y-3">
                  {currentQ.options.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleAnswer(opt.value)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        answers[currentQ.id] === opt.value
                          ? 'border-sky-500 bg-sky-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      data-testid={`option-${opt.value}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          answers[currentQ.id] === opt.value ? 'border-sky-500 bg-sky-500' : 'border-slate-300'
                        }`}>
                          {answers[currentQ.id] === opt.value && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <span className="text-slate-700">{opt.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-slate-900">Съгласие за обработка</h2>
                <p className="text-slate-500 text-sm">
                  За да продължите, потвърдете съгласието си с{' '}
                  <a href="/privacy" target="_blank" className="text-sky-500 underline">Политиката за поверителност</a>.
                </p>
                <div className="flex items-start gap-3">
                  <Checkbox id="consent" checked={consent} onCheckedChange={setConsent} data-testid="consent-checkbox" />
                  <Label htmlFor="consent" className="text-sm text-slate-600 cursor-pointer">
                    Съгласен/а съм данните ми да бъдат обработвани за целите на тази оценка.
                  </Label>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between gap-4">
            <Button variant="outline" onClick={handleBack} disabled={step === 0} className="h-11 px-5 rounded-full" data-testid="back-btn">
              <ArrowLeft className="w-4 h-4 mr-2" />Назад
            </Button>
            
            {!isConsentStep ? (
              <Button onClick={handleNext} disabled={!answers[currentQ.id]} className="h-11 px-5 rounded-full bg-sky-500 hover:bg-sky-600" data-testid="next-btn">
                Напред<ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!consent || submitting} className="h-11 px-5 rounded-full bg-slate-900 hover:bg-slate-800" data-testid="submit-btn">
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Изпрати
              </Button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default QuizPage;
