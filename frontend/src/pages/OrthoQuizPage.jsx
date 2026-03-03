import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useLanguage } from '@/context/LanguageContext';
import { getSmileClassificationQuiz, getTreatmentMatchQuiz } from '@/lib/orthoData';
import { CITIES } from '@/lib/quizData';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowLeft, ArrowRight, CheckCircle, Loader2, 
  Smile, Target, AlertCircle, Phone, User, Mail
} from 'lucide-react';
import { toast } from 'sonner';
import { createLead } from '@/lib/api';

const OrthoQuizPage = () => {
  const { citySlug, quizType } = useParams();
  const navigate = useNavigate();
  const { language, getLocalizedPath, getCityName } = useLanguage();
  
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState('right');
  const [showResults, setShowResults] = useState(false);
  const [result, setResult] = useState(null);
  const [contactForm, setContactForm] = useState({ name: '', phone: '', email: '', consent: false });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const city = CITIES[citySlug];
  const cityName = city ? getCityName(citySlug) : '';
  const isEN = language === 'en';
  
  // Get quiz data based on type
  const quizData = quizType === 'smile-classification' 
    ? getSmileClassificationQuiz(language)
    : quizType === 'treatment-match'
    ? getTreatmentMatchQuiz(language)
    : null;
    
  if (!quizData) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <p>{isEN ? 'Quiz not found' : 'Тестът не е намерен'}</p>
        </div>
      </Layout>
    );
  }
  
  const questions = quizData.questions;
  const totalSteps = questions.length;
  const progress = ((step + 1) / totalSteps) * 100;
  const currentQ = questions[step];

  const handleAnswer = (value) => {
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
    if (!answers[currentQ.id]) {
      toast.error(isEN ? 'Please select an answer' : 'Моля, изберете отговор');
      return;
    }
    
    if (step < totalSteps - 1) {
      transitionToStep(step + 1, 'right');
    } else {
      // Calculate results
      calculateResults();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      transitionToStep(step - 1, 'left');
    }
  };

  const calculateResults = () => {
    if (quizType === 'smile-classification') {
      // Calculate scores for aligners vs braces with weighted scoring
      let alignersScore = 0;
      let bracesScore = 0;
      
      questions.forEach(q => {
        const answer = answers[q.id];
        const option = q.options.find(o => o.value === answer);
        if (option?.score) {
          // Base scores from data
          let alignerPoints = option.score.aligners || 0;
          let bracesPoints = option.score.braces || 0;
          
          // Weighted adjustments favoring aligners when clinically appropriate
          // High aesthetics importance
          if (q.id === 'importance' && (answer === 'very' || answer === 'high')) {
            alignerPoints += 1;
          }
          // Removable preference
          if (q.id === 'lifestyle' && answer === 'rarely') {
            alignerPoints += 1;
          }
          // Moderate to good compliance (4-5/5)
          if (q.id === 'compliance' && (answer === 'high' || answer === 'perfect')) {
            alignerPoints += 1;
          }
          // Social/public-facing work
          if (q.id === 'work' && answer === 'client-facing') {
            alignerPoints += 1;
          }
          // Comfort and hygiene flexibility preference
          if (q.id === 'preference' && (answer === 'comfort' || answer === 'flexible')) {
            alignerPoints += 1;
          }
          
          alignersScore += alignerPoints;
          bracesScore += bracesPoints;
        }
      });
      
      // Determine result with adjusted thresholds
      // Lower threshold for aligners recommendation (was 4, now 2)
      const diff = alignersScore - bracesScore;
      if (diff >= 2) {
        setResult('aligners');
      } else if (diff <= -5) {
        // Higher threshold for braces recommendation (was -4, now -5)
        setResult('braces');
      } else {
        // Neutral cases default to 'both' which shows clinical evaluation message
        setResult('both');
      }
    } else if (quizType === 'treatment-match') {
      // Check eligibility with weighted scoring
      let consultNeeded = false;
      let notEligible = false;
      let eligibleCount = 0;
      let consultCount = 0;
      
      questions.forEach(q => {
        const answer = answers[q.id];
        const option = q.options.find(o => o.value === answer);
        if (option?.eligible === 'consult') {
          consultCount++;
          consultNeeded = true;
        } else if (option?.eligible === false) {
          notEligible = true;
        } else if (option?.eligible === true) {
          eligibleCount++;
        }
      });
      
      // Adjusted logic: only mark as notEligible if explicitly low compliance
      // or multiple severe flags
      const complianceAnswer = answers['commitment'];
      const lowCompliance = complianceAnswer === 'unsure';
      
      if (notEligible && lowCompliance) {
        // Only truly not eligible if they have severe flags AND low compliance
        setResult('notEligible');
      } else if (consultCount >= 2 || notEligible) {
        // Recommend consultation if multiple consultation flags
        setResult('consult');
      } else {
        // Default to eligible for most cases
        setResult('eligible');
      }
    }
    
    setShowResults(true);
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    
    if (!contactForm.consent) {
      toast.error(isEN ? 'Please accept the privacy policy' : 'Моля, приемете политиката за поверителност');
      return;
    }
    
    if (!contactForm.name || !contactForm.phone || !contactForm.email) {
      toast.error(isEN ? 'Please fill in all fields' : 'Моля, попълнете всички полета');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Create lead with quiz answers and contact info
      const leadData = {
        city_slug: citySlug || 'sofia',
        treatment_type: 'orthodontics',
        answers: {
          quiz_type: quizType,
          quiz_result: result,
          ...answers
        },
        name: contactForm.name,
        phone: contactForm.phone,
        email: contactForm.email,
        consent: contactForm.consent,
        source: 'ortho_quiz'
      };
      
      await createLead(leadData);
      setSubmitted(true);
      toast.success(isEN ? 'Thank you! We will contact you soon.' : 'Благодарим! Ще се свържем с вас скоро.');
    } catch (error) {
      console.error('Failed to submit lead:', error);
      toast.error(isEN ? 'Something went wrong. Please try again.' : 'Нещо се обърка. Моля, опитайте отново.');
    } finally {
      setSubmitting(false);
    }
  };

  const getResultContent = () => {
    if (!result) return null;
    return quizData.results[result];
  };

  const resultContent = getResultContent();

  if (showResults && resultContent) {
    return (
      <Layout>
        <div className="py-12 md:py-20 bg-slate-50 min-h-[70vh]">
          <div className="max-w-2xl mx-auto px-4">
            {/* Result Card */}
            <div className="result-card bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8 text-center">
              <div className={`w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center ${
                result === 'aligners' || result === 'eligible' ? 'bg-emerald-100' :
                result === 'braces' || result === 'notEligible' ? 'bg-sky-100' :
                'bg-amber-100'
              }`}>
                {result === 'aligners' || result === 'eligible' ? (
                  <Smile className="w-8 h-8 text-emerald-600" />
                ) : result === 'braces' || result === 'notEligible' ? (
                  <Target className="w-8 h-8 text-sky-600" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-amber-600" />
                )}
              </div>
              
              <h1 className="font-heading text-2xl font-semibold text-slate-900 mb-4">
                {resultContent.title}
              </h1>
              
              <p className="text-slate-600 mb-8">
                {resultContent.description}
              </p>
              
              {/* Recommendations or Next Steps */}
              <div className="bg-slate-50 rounded-xl p-6 text-left mb-8">
                <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-sky-500" />
                  {quizType === 'smile-classification' 
                    ? (isEN ? 'Based on your profile:' : 'Въз основа на вашия профил:')
                    : (isEN ? 'Next steps:' : 'Следващи стъпки:')}
                </h3>
                <ul className="space-y-3">
                  {(resultContent.recommendations || resultContent.nextSteps)?.map((item, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm text-slate-600">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Thank you message */}
              <p className="text-slate-500 mb-6 text-sm">
                {isEN ? 'Thank you. We will contact you to discuss your case.' : 'Благодарим. Ще се свържем с вас, за да обсъдим вашия случай.'}
              </p>
              
              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to={getLocalizedPath('/contact')}>
                  <Button className="btn-animate h-12 px-8 rounded-full bg-sky-500 hover:bg-sky-600">
                    <Phone className="w-4 h-4 mr-2" />
                    {isEN ? 'Request a Call' : 'Заяви обаждане'}
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Back to Education Link */}
            <div className="text-center">
              <Link 
                to={city ? getLocalizedPath(`/city/${citySlug}/ortho`) : getLocalizedPath('/ortho')}
                className="text-slate-500 hover:text-slate-700 text-sm inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {isEN ? 'Back to Aligners vs Braces guide' : 'Обратно към справочника'}
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showFooter={false}>
      {/* Header */}
      <div className="bg-slate-900 text-white py-8 md:py-12">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <Link 
            to={city ? getLocalizedPath(`/city/${citySlug}/ortho`) : getLocalizedPath('/ortho')}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {isEN ? 'Back' : 'Назад'}
          </Link>
          <h1 className="font-heading text-xl sm:text-2xl font-semibold mb-2">{quizData.title}</h1>
          <p className="text-slate-400 text-sm">{quizData.subtitle}</p>
        </div>
      </div>

      {/* Quiz */}
      <div className="py-8 md:py-12 bg-slate-50 min-h-[60vh]">
        <div className="max-w-xl mx-auto px-4">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-slate-500 mb-2">
              <span>{isEN ? 'Question' : 'Въпрос'} {step + 1} {isEN ? 'of' : 'от'} {totalSteps}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2 progress-animated" />
          </div>

          {/* Question Card */}
          <div 
            className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 mb-6 transition-all duration-300 ${
              isTransitioning 
                ? `opacity-0 ${transitionDirection === 'right' ? '-translate-x-4' : 'translate-x-4'}` 
                : 'opacity-100 translate-x-0'
            }`}
          >
            <h2 className="text-lg font-medium text-slate-900 mb-6">{currentQ.question}</h2>
            <div className="space-y-3">
              {currentQ.options.map((opt, index) => (
                <button
                  key={opt.value}
                  onClick={() => handleAnswer(opt.value)}
                  className={`quiz-option w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                    answers[currentQ.id] === opt.value
                      ? 'border-sky-500 bg-sky-50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                  data-testid={`option-${opt.value}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                      answers[currentQ.id] === opt.value ? 'border-sky-500 bg-sky-500 scale-110' : 'border-slate-300'
                    }`}>
                      {answers[currentQ.id] === opt.value && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className="text-slate-700">{opt.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between gap-4">
            <Button 
              variant="outline" 
              onClick={handleBack} 
              disabled={step === 0} 
              className="h-11 px-5 rounded-full transition-all duration-200 hover:-translate-x-1 disabled:opacity-50" 
              data-testid="back-btn"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />{isEN ? 'Back' : 'Назад'}
            </Button>
            
            <Button 
              onClick={handleNext} 
              disabled={!answers[currentQ.id]} 
              className="btn-animate h-11 px-5 rounded-full bg-sky-500 hover:bg-sky-600 disabled:opacity-50 transition-all duration-200" 
              data-testid="next-btn"
            >
              {step === totalSteps - 1 
                ? (isEN ? 'See Results' : 'Вижте резултатите')
                : (isEN ? 'Next' : 'Напред')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default OrthoQuizPage;
