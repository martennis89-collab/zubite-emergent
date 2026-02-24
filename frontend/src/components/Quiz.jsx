import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, Clock, CheckCircle } from 'lucide-react';
import { createLead, createEvent } from '@/lib/api';
import { getUTMParams, hashIP, saveQuizProgress, loadQuizProgress, clearQuizProgress } from '@/lib/utils';
import { toast } from 'sonner';

export const Quiz = ({ quizData }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { questions, id: quizType, title, estimatedTime } = quizData;
  const totalSteps = questions.length + 1; // +1 for consent
  const progress = ((currentStep + 1) / totalSteps) * 100;
  
  // Load saved progress on mount
  useEffect(() => {
    const saved = loadQuizProgress(quizType);
    if (saved) {
      setAnswers(saved.answers);
      setCurrentStep(saved.currentStep);
      toast.info('Вашият прогрес е възстановен');
    }
    
    // Track quiz start
    createEvent({
      lead_id: 'pending',
      event_type: 'quiz_started',
      metadata: { treatment_type: quizType }
    }).catch(() => {});
  }, [quizType]);
  
  // Save progress on answer change
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      saveQuizProgress(quizType, answers, currentStep);
    }
  }, [answers, currentStep, quizType]);
  
  const currentQuestion = questions[currentStep];
  const isLastQuestion = currentStep === questions.length - 1;
  const isConsentStep = currentStep === questions.length;
  
  const handleAnswer = (value) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: value
    }));
  };
  
  const handleNext = () => {
    if (!isConsentStep && !answers[currentQuestion.id] && currentQuestion.type !== 'text') {
      toast.error('Моля, изберете отговор');
      return;
    }
    
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };
  
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const handleSubmit = async () => {
    if (!consent) {
      toast.error('Моля, дайте съгласие за обработка на данни');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const utmParams = getUTMParams();
      const ipHash = hashIP();
      
      const leadData = {
        treatment_type: quizType,
        city: answers.city || 'Хасково',
        answers,
        ...utmParams,
        page_path: window.location.pathname,
        ip_hash: ipHash,
      };
      
      const lead = await createLead(leadData);
      clearQuizProgress(quizType);
      
      toast.success('Въпросникът е изпратен успешно!');
      navigate(`/results/${lead.id}`);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error('Възникна грешка. Моля, опитайте отново.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-surface py-8 md:py-16">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-heading font-semibold text-primary mb-2">
            {title}
          </h1>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{estimatedTime}</span>
          </p>
        </div>
        
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Въпрос {Math.min(currentStep + 1, questions.length)} от {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" data-testid="quiz-progress" />
        </div>
        
        {/* Question Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 mb-6">
          {!isConsentStep ? (
            <>
              <h2 className="text-lg md:text-xl font-medium text-primary mb-6">
                {currentQuestion.question}
              </h2>
              
              {currentQuestion.type === 'single' && (
                <div className="space-y-3">
                  {currentQuestion.options.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleAnswer(option.value)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        answers[currentQuestion.id] === option.value
                          ? 'border-accent bg-accent/5'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      data-testid={`option-${option.value}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          answers[currentQuestion.id] === option.value
                            ? 'border-accent bg-accent'
                            : 'border-slate-300'
                        }`}>
                          {answers[currentQuestion.id] === option.value && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                        <span className="font-medium">{option.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {currentQuestion.type === 'text' && (
                <Input
                  type="text"
                  placeholder={currentQuestion.placeholder}
                  value={answers[currentQuestion.id] || currentQuestion.defaultValue || ''}
                  onChange={(e) => handleAnswer(e.target.value)}
                  className="h-12 text-lg"
                  data-testid="text-input"
                />
              )}
            </>
          ) : (
            <div className="space-y-6">
              <h2 className="text-lg md:text-xl font-medium text-primary">
                Съгласие за обработка на данни
              </h2>
              <p className="text-muted-foreground text-sm">
                За да продължите, моля потвърдете, че сте съгласни с обработката на вашите лични данни съгласно нашата{' '}
                <a href="/privacy" target="_blank" className="text-accent underline">
                  Политика за поверителност
                </a>
                .
              </p>
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="consent" 
                  checked={consent}
                  onCheckedChange={setConsent}
                  data-testid="consent-checkbox"
                />
                <Label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer">
                  Съгласен/а съм личните ми данни да бъдат обработвани за целите на тази квалификация и да бъда свързан/а с подходяща дентална клиника.
                </Label>
              </div>
            </div>
          )}
        </div>
        
        {/* Navigation */}
        <div className="flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="h-12 px-6 rounded-full"
            data-testid="quiz-back-btn"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
          
          {!isConsentStep ? (
            <Button
              onClick={handleNext}
              className="btn-accent"
              disabled={!answers[currentQuestion.id] && currentQuestion.type !== 'text'}
              data-testid="quiz-next-btn"
            >
              Напред
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              className="btn-primary"
              disabled={!consent || isSubmitting}
              data-testid="quiz-submit-btn"
            >
              {isSubmitting ? (
                'Изпращане...'
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Изпрати
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Quiz;
