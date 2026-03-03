import { useState, useEffect } from 'react';
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
import { useLanguage } from '@/context/LanguageContext';
import { trackQuizComplete } from '@/lib/tracking';

const QuizPage = () => {
  const { citySlug, treatmentType } = useParams();
  const navigate = useNavigate();
  const { t, getLocalizedPath, getCityName, getTreatment, language } = useLanguage();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [canTravel, setCanTravel] = useState(true);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState('right');

  const city = CITIES[citySlug];
  const treatmentKey = treatmentType === 'full-mouth' ? 'full-mouth' : treatmentType;
  const treatment = TREATMENTS[treatmentKey];
  
  if (!city || !treatment) return <Navigate to={getLocalizedPath('/')} replace />;
  
  const cityName = getCityName(citySlug);
  const treatmentInfo = getTreatment(treatmentKey);
  
  // Get translated questions based on language
  const getTranslatedQuestions = () => {
    const treatmentTypeKey = treatmentType === 'full-mouth' ? 'full_mouth' : treatmentType;
    const baseQuestions = getQuizQuestions(treatmentTypeKey, cityName);
    
    if (language === 'bg') return baseQuestions;
    
    // Map English translations
    const translationMap = {
      invisalign: {
        seriousness: { 
          question: t('invisalign.seriousness.question'),
          options: { searching: t('invisalign.seriousness.searching'), considering: t('invisalign.seriousness.considering'), browsing: t('invisalign.seriousness.browsing') }
        },
        timing: { 
          question: t('invisalign.timing.question'),
          options: { '0-3': t('invisalign.timing.0-3'), '3-6': t('invisalign.timing.3-6'), '6+': t('invisalign.timing.6+'), not_sure: t('invisalign.timing.not_sure') }
        },
        importance: { 
          question: t('invisalign.importance.question'),
          options: { quality: t('invisalign.importance.quality'), comfort: t('invisalign.importance.comfort'), price: t('invisalign.importance.price') }
        },
        previous_ortho: { 
          question: t('invisalign.previous_ortho.question'),
          options: { yes: t('common.yes'), no: t('common.no') }
        },
        bite_problem: { 
          question: t('invisalign.bite_problem.question'),
          options: { yes: t('common.yes'), no: t('common.no') }
        },
        readiness: { 
          question: t('invisalign.readiness.question'),
          options: { yes: t('common.yes'), maybe: t('invisalign.readiness.maybe'), no: t('common.no') }
        }
      },
      implants: {
        missing_teeth: { 
          question: t('implants.missing_teeth.question'),
          options: { '1-2': t('implants.missing_teeth.1-2'), '3-5': t('implants.missing_teeth.3-5'), '6+': t('implants.missing_teeth.6+') }
        },
        chewing_difficulty: { 
          question: t('implants.chewing_difficulty.question'),
          options: { yes: t('common.yes'), sometimes: t('implants.chewing_difficulty.sometimes'), no: t('common.no') }
        },
        pain: { 
          question: t('implants.pain.question'),
          options: { yes: t('common.yes'), no: t('common.no') }
        },
        timing: { 
          question: t('implants.timing.question'),
          options: { '0-3': t('implants.timing.0-3'), '3-6': t('implants.timing.3-6'), '6+': t('implants.timing.6+'), not_sure: t('implants.timing.not_sure') }
        },
        importance: { 
          question: t('implants.importance.question'),
          options: { quality: t('implants.importance.quality'), speed: t('implants.importance.speed'), price: t('implants.importance.price') }
        },
        readiness: { 
          question: t('implants.readiness.question'),
          options: { yes: t('common.yes'), maybe: t('implants.readiness.maybe'), no: t('common.no') }
        }
      },
      full_mouth: {
        situation: { 
          question: t('fullMouth.situation.question'),
          options: { many_missing: t('fullMouth.situation.many_missing'), worn: t('fullMouth.situation.worn'), aesthetic: t('fullMouth.situation.aesthetic') }
        },
        main_problem: { 
          question: t('fullMouth.main_problem.question'),
          options: { function: t('fullMouth.main_problem.function'), aesthetic: t('fullMouth.main_problem.aesthetic'), curiosity: t('fullMouth.main_problem.curiosity') }
        },
        consulted_before: { 
          question: t('fullMouth.consulted_before.question'),
          options: { yes: t('common.yes'), no: t('common.no') }
        },
        timing: { 
          question: t('fullMouth.timing.question'),
          options: { '0-3': t('fullMouth.timing.0-3'), '3-6': t('fullMouth.timing.3-6'), '6+': t('fullMouth.timing.6+'), not_sure: t('fullMouth.timing.not_sure') }
        },
        importance: { 
          question: t('fullMouth.importance.question'),
          options: { quality: t('fullMouth.importance.quality'), price: t('fullMouth.importance.price') }
        },
        complex_plan: { 
          question: t('fullMouth.complex_plan.question'),
          options: { yes: t('common.yes'), maybe: t('fullMouth.complex_plan.maybe'), no: t('common.no') }
        }
      }
    };
    
    return baseQuestions.map(q => {
      if (q.type === 'travel') {
        return {
          ...q,
          question: `${t('quiz.canVisit')} ${cityName}?`,
          options: [
            { value: 'yes', label: t('common.yes') },
            { value: 'no', label: t('common.no') }
          ]
        };
      }
      
      const translations = translationMap[treatmentTypeKey]?.[q.id];
      if (!translations) return q;
      
      return {
        ...q,
        question: translations.question,
        options: q.options.map(opt => ({
          ...opt,
          label: translations.options[opt.value] || opt.label
        }))
      };
    });
  };
  
  const questions = getTranslatedQuestions();
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

  const transitionToStep = (newStep, direction) => {
    setTransitionDirection(direction);
    setIsTransitioning(true);
    setTimeout(() => {
      setStep(newStep);
      setIsTransitioning(false);
    }, 200);
  };

  const handleNext = () => {
    if (!isConsentStep && !answers[currentQ.id]) {
      toast.error(language === 'en' ? 'Please select an answer' : 'Моля, изберете отговор');
      return;
    }
    if (step < totalSteps - 1) {
      transitionToStep(step + 1, 'right');
    }
  };

  const handleBack = () => {
    if (step > 0) {
      transitionToStep(step - 1, 'left');
    }
  };

  const handleSubmit = async () => {
    if (!consent) {
      toast.error(t('results.form.consentRequired'));
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
      
      // Track quiz completion
      trackQuizComplete(treatmentType, citySlug, lead.band, lead.score_total);
      
      toast.success(language === 'en' ? 'Submitted successfully!' : 'Изпратено успешно!');
      navigate(getLocalizedPath(`/results/${lead.id}`));
    } catch (e) {
      toast.error(language === 'en' ? 'Error. Try again.' : 'Грешка. Опитайте отново.');
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
            <span>{cityName}</span>
          </div>
          <h1 className="font-heading text-xl sm:text-2xl font-semibold mb-2">{treatmentInfo.name}</h1>
          <div className="flex items-center justify-center gap-4 text-slate-400 text-sm">
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" />60-90 {language === 'en' ? 'sec.' : 'сек.'}</span>
            <span>{questions.length} {language === 'en' ? 'questions' : 'въпроса'}</span>
          </div>
        </div>
      </div>

      {/* Quiz */}
      <div className="py-8 md:py-12 bg-slate-50 min-h-[60vh]">
        <div className="max-w-xl mx-auto px-4">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-slate-500 mb-2">
              <span>{t('quiz.question')} {Math.min(step + 1, questions.length)} {t('quiz.of')} {questions.length}</span>
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
                <h2 className="text-lg font-medium text-slate-900">
                  {language === 'en' ? 'Processing Consent' : 'Съгласие за обработка'}
                </h2>
                <p className="text-slate-500 text-sm">
                  {language === 'en' ? 'To continue, please confirm your consent to the ' : 'За да продължите, потвърдете съгласието си с '}
                  <a href={getLocalizedPath('/privacy')} target="_blank" className="text-sky-500 underline">{t('results.form.privacyPolicy')}</a>.
                </p>
                <div className="flex items-start gap-3">
                  <Checkbox id="consent" checked={consent} onCheckedChange={setConsent} data-testid="consent-checkbox" />
                  <Label htmlFor="consent" className="text-sm text-slate-600 cursor-pointer">
                    {language === 'en' 
                      ? 'I agree that my data may be processed for the purposes of this assessment.'
                      : 'Съгласен/а съм данните ми да бъдат обработвани за целите на тази оценка.'}
                  </Label>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between gap-4">
            <Button variant="outline" onClick={handleBack} disabled={step === 0} className="h-11 px-5 rounded-full" data-testid="back-btn">
              <ArrowLeft className="w-4 h-4 mr-2" />{t('quiz.back')}
            </Button>
            
            {!isConsentStep ? (
              <Button onClick={handleNext} disabled={!answers[currentQ.id]} className="h-11 px-5 rounded-full bg-sky-500 hover:bg-sky-600" data-testid="next-btn">
                {t('quiz.next')}<ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!consent || submitting} className="h-11 px-5 rounded-full bg-slate-900 hover:bg-slate-800" data-testid="submit-btn">
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                {t('quiz.submit')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default QuizPage;
