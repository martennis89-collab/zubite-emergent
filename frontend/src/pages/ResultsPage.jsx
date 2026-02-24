import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { getLead, updateLeadContact } from '@/lib/api';
import { translateTreatment, translateBand } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Phone, 
  Mail, 
  User, 
  ArrowRight,
  Home,
  Loader2
} from 'lucide-react';

const ResultsPage = () => {
  const { leadId } = useParams();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    consent: false
  });

  useEffect(() => {
    const fetchLead = async () => {
      try {
        const data = await getLead(leadId);
        setLead(data);
        if (data.name || data.phone || data.email) {
          setSubmitted(true);
        }
      } catch (error) {
        console.error('Error fetching lead:', error);
        toast.error('Грешка при зареждане на резултатите');
      } finally {
        setLoading(false);
      }
    };
    fetchLead();
  }, [leadId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.consent) {
      toast.error('Моля, дайте съгласие за обработка на данни');
      return;
    }
    
    // Validate based on band
    if (lead.band !== 'RED') {
      if (!formData.name || !formData.phone || !formData.email) {
        toast.error('Моля, попълнете всички полета');
        return;
      }
    } else {
      if (!formData.email) {
        toast.error('Моля, въведете имейл адрес');
        return;
      }
    }

    setSubmitting(true);
    try {
      await updateLeadContact(leadId, formData);
      setSubmitted(true);
      toast.success('Данните са изпратени успешно!');
    } catch (error) {
      console.error('Error submitting contact:', error);
      toast.error('Възникна грешка. Моля, опитайте отново.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </Layout>
    );
  }

  if (!lead) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
          <XCircle className="w-16 h-16 text-destructive mb-4" />
          <h2 className="text-xl font-medium mb-2">Резултатите не са намерени</h2>
          <p className="text-muted-foreground mb-6">Моля, попълнете въпросника отново.</p>
          <Link to="/">
            <Button className="btn-primary">
              <Home className="w-4 h-4 mr-2" />
              Към началото
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const bandConfig = {
    GREEN: {
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success',
      title: 'Одобрени сте за консултация!',
      description: 'Поздравления! Въз основа на вашите отговори, вие сте подходящ кандидат за премиум лечение. Следващата стъпка е безплатна консултация с наш партньор-специалист.',
      cta: 'Заяви обаждане',
    },
    YELLOW: {
      icon: AlertTriangle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning',
      title: 'Нужна е допълнителна оценка',
      description: 'Въз основа на вашите отговори, имаме нужда от допълнителна информация, за да направим точна оценка. Свържете се с нас за персонализирана консултация.',
      cta: 'Заяви обаждане',
    },
    RED: {
      icon: XCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      borderColor: 'border-destructive',
      title: 'В момента не сте подходящи за премиум програма',
      description: 'Въз основа на вашите отговори, този вид лечение може да не е най-подходящият за вас в момента. Получете безплатно ръководство с информация и съвети.',
      cta: 'Получете безплатно ръководство',
    },
  };

  const config = bandConfig[lead.band];
  const IconComponent = config.icon;

  return (
    <Layout>
      <div className="min-h-[80vh] py-12 md:py-20 bg-surface">
        <div className="max-w-2xl mx-auto px-4">
          {/* Result Banner */}
          <div className={`${config.bgColor} border-2 ${config.borderColor} rounded-2xl p-8 mb-8 text-center`}>
            <IconComponent className={`w-16 h-16 ${config.color} mx-auto mb-4`} />
            <h1 className="text-2xl md:text-3xl font-heading font-semibold text-primary mb-4">
              {config.title}
            </h1>
            <p className="text-muted-foreground mb-4">
              {config.description}
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="bg-white px-4 py-2 rounded-full">
                <strong>Лечение:</strong> {translateTreatment(lead.treatment_type)}
              </span>
              <span className="bg-white px-4 py-2 rounded-full">
                <strong>Резултат:</strong> {lead.score_total} точки
              </span>
            </div>
          </div>

          {/* Contact Form or Thank You */}
          {!submitted ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
              <h2 className="text-xl font-heading font-semibold text-primary mb-6">
                {lead.band === 'RED' ? 'Получете безплатно ръководство' : 'Оставете данни за контакт'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {lead.band !== 'RED' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Име
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Вашето име"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="h-12"
                        data-testid="contact-name-input"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Телефон
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+359 888 123 456"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="h-12"
                        data-testid="contact-phone-input"
                      />
                    </div>
                  </>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Имейл
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="h-12"
                    data-testid="contact-email-input"
                  />
                </div>
                
                <div className="flex items-start gap-3">
                  <Checkbox 
                    id="contact-consent" 
                    checked={formData.consent}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, consent: checked }))}
                    data-testid="contact-consent-checkbox"
                  />
                  <Label htmlFor="contact-consent" className="text-sm leading-relaxed cursor-pointer">
                    Съгласен/а съм личните ми данни да бъдат обработвани съгласно{' '}
                    <a href="/privacy" target="_blank" className="text-accent underline">
                      Политиката за поверителност
                    </a>
                    .
                  </Label>
                </div>
                
                <Button 
                  type="submit" 
                  className="btn-accent w-full"
                  disabled={submitting}
                  data-testid="contact-submit-btn"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Изпращане...
                    </>
                  ) : (
                    <>
                      {config.cta}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
              <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
              <h2 className="text-xl font-heading font-semibold text-primary mb-4">
                Благодарим ви!
              </h2>
              <p className="text-muted-foreground mb-6">
                {lead.band !== 'RED' 
                  ? 'Вашите данни са получени. Ще се свържем с вас в рамките на 24 часа за да насрочим консултация.'
                  : 'Ще получите ръководството на посочения имейл адрес в рамките на няколко минути.'
                }
              </p>
              <div className="bg-surface rounded-xl p-6 text-left">
                <h4 className="font-medium text-primary mb-3">Какво следва?</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {lead.band !== 'RED' ? (
                    <>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                        <span>Ще получите обаждане от наш консултант</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                        <span>Ще насрочим безплатна консултация в удобно за вас време</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                        <span>Ще ви свържем с подходяща партньорска клиника</span>
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                        <span>Проверете входящата си поща (и спам папката)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                        <span>Прочетете ръководството за полезни съвети</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                        <span>Свържете се с нас, ако имате въпроси</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>
              <Link to="/" className="inline-block mt-6">
                <Button variant="outline" className="h-12 px-6 rounded-full">
                  <Home className="w-4 h-4 mr-2" />
                  Към началото
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ResultsPage;
