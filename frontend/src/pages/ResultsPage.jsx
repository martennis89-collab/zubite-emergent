import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { getLead, updateLeadContact } from '@/lib/api';
import { translateTreatment } from '@/lib/utils';
import { CITIES } from '@/lib/quizData';
import { toast } from 'sonner';
import { CheckCircle, AlertTriangle, XCircle, Home, Loader2, User, Phone, Mail, ArrowRight } from 'lucide-react';

const ResultsPage = () => {
  const { leadId } = useParams();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', consent: false });

  useEffect(() => {
    getLead(leadId)
      .then(data => {
        setLead(data);
        if (data.name || data.email) setSubmitted(true);
      })
      .catch(() => toast.error('Грешка при зареждане'))
      .finally(() => setLoading(false));
  }, [leadId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.consent) { toast.error('Моля, дайте съгласие'); return; }
    if (lead.band !== 'RED' && (!form.name || !form.phone || !form.email)) {
      toast.error('Попълнете всички полета');
      return;
    }
    if (lead.band === 'RED' && !form.email) {
      toast.error('Въведете имейл');
      return;
    }
    setSubmitting(true);
    try {
      await updateLeadContact(leadId, form);
      setSubmitted(true);
      toast.success('Изпратено!');
    } catch {
      toast.error('Грешка');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Layout><div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div></Layout>;
  if (!lead) return <Layout><div className="min-h-[60vh] flex items-center justify-center"><p>Не е намерено</p></div></Layout>;

  const cityName = CITIES[lead.city_slug]?.name || lead.city_slug;
  
  const config = {
    GREEN: {
      icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200',
      title: `Вашият профил отговаря на критериите за консултация с партньорска клиника в ${cityName}.`,
      cta: 'Заявете обаждане'
    },
    YELLOW: {
      icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200',
      title: 'Нужна е допълнителна оценка. Екипът ни ще се свърже с вас.',
      cta: 'Заявете обаждане'
    },
    RED: {
      icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200',
      title: 'В момента не сте подходящ кандидат за премиум програма.',
      cta: 'Получете информация'
    }
  }[lead.band];
  
  const Icon = config.icon;

  return (
    <Layout>
      <div className="py-12 md:py-20 bg-slate-50 min-h-[70vh]">
        <div className="max-w-xl mx-auto px-4">
          {/* Result Banner */}
          <div className={`${config.bg} border ${config.border} rounded-2xl p-8 mb-8 text-center`}>
            <Icon className={`w-14 h-14 ${config.color} mx-auto mb-4`} />
            <p className="text-slate-700 mb-4">{config.title}</p>
            <div className="flex flex-wrap justify-center gap-3 text-sm">
              <span className="bg-white px-3 py-1.5 rounded-full border">
                {translateTreatment(lead.treatment_type)}
              </span>
              <span className="bg-white px-3 py-1.5 rounded-full border">
                {lead.score_total} точки
              </span>
            </div>
          </div>

          {/* Form or Thank You */}
          {!submitted ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <h2 className="text-lg font-medium text-slate-900 mb-6">{config.cta}</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                {lead.band !== 'RED' && (
                  <>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><User className="w-4 h-4" />Име</Label>
                      <Input placeholder="Вашето име" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} data-testid="name-input" />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Phone className="w-4 h-4" />Телефон</Label>
                      <Input placeholder="+359..." value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} data-testid="phone-input" />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Mail className="w-4 h-4" />Имейл</Label>
                  <Input type="email" placeholder="email@example.com" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} data-testid="email-input" />
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox id="consent" checked={form.consent} onCheckedChange={c => setForm(f => ({...f, consent: c}))} data-testid="consent-checkbox" />
                  <Label htmlFor="consent" className="text-sm text-slate-600 cursor-pointer">
                    Съгласен/а съм с <a href="/privacy" target="_blank" className="text-sky-500 underline">Политиката за поверителност</a>.
                  </Label>
                </div>
                <Button type="submit" disabled={submitting} className="w-full h-11 rounded-full bg-sky-500 hover:bg-sky-600" data-testid="submit-btn">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{config.cta}<ArrowRight className="w-4 h-4 ml-2" /></>}
                </Button>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
              <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-lg font-medium text-slate-900 mb-2">Благодарим ви!</h2>
              <p className="text-slate-500 mb-6">Ще се свържем с вас до 24 часа.</p>
              <Link to="/">
                <Button variant="outline" className="h-11 px-6 rounded-full">
                  <Home className="w-4 h-4 mr-2" />Към началото
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
