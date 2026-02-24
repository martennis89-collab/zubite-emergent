import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { getAdminLead, updateAdminLead, getAdminClinics } from '@/lib/api';
import { formatDate, translateStatus, translateTreatment, getStatusClass, getBandClass } from '@/lib/utils';
import { ArrowLeft, Save, Loader2, User, Phone, Mail, MapPin, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const AdminLeadDetail = () => {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [clinics, setClinics] = useState([]);
  const [form, setForm] = useState({ status: '', assigned_clinic_id: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getAdminLead(leadId), getAdminClinics()])
      .then(([l, c]) => {
        setLead(l);
        setClinics(c);
        setForm({ status: l.status, assigned_clinic_id: l.assigned_clinic_id || '', notes: l.notes || '' });
      })
      .catch(() => navigate('/admin'));
  }, [leadId, navigate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = { ...form };
      if (!data.assigned_clinic_id) delete data.assigned_clinic_id;
      const updated = await updateAdminLead(leadId, data);
      setLead(updated);
      toast.success('Запазено');
    } catch {
      toast.error('Грешка');
    } finally {
      setSaving(false);
    }
  };

  if (!lead) return <div className="min-h-screen flex items-center justify-center">Зареждане...</div>;

  const Icon = { GREEN: CheckCircle, YELLOW: AlertTriangle, RED: XCircle }[lead.band];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-6 py-4">
        <span className="font-heading text-xl font-semibold">Zubite<span className="text-sky-500">.bg</span> Admin</span>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link to="/admin/leads" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6">
          <ArrowLeft className="w-4 h-4" />Назад
        </Link>

        {/* Header */}
        <div className="bg-white rounded-xl border p-6 mb-6 flex items-center gap-4">
          <Icon className={`w-10 h-10 ${lead.band === 'GREEN' ? 'text-emerald-500' : lead.band === 'YELLOW' ? 'text-amber-500' : 'text-red-500'}`} />
          <div className="flex-1">
            <h1 className="font-medium text-lg">{lead.name || 'Неизвестен'}</h1>
            <p className="text-sm text-slate-500">{formatDate(lead.created_at)}</p>
          </div>
          <Badge className={getBandClass(lead.band)}>{lead.band} ({lead.score_total})</Badge>
          <Badge className={getStatusClass(lead.status)}>{translateStatus(lead.status)}</Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Contact Info */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-medium mb-4">Информация</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3"><MapPin className="w-4 h-4 text-slate-400" /><span className="capitalize">{lead.city_slug}</span></div>
              <div className="flex items-center gap-3"><span className="text-slate-400">Лечение:</span><span>{translateTreatment(lead.treatment_type)}</span></div>
              {lead.name && <div className="flex items-center gap-3"><User className="w-4 h-4 text-slate-400" /><span>{lead.name}</span></div>}
              {lead.phone && <div className="flex items-center gap-3"><Phone className="w-4 h-4 text-slate-400" /><span>{lead.phone}</span></div>}
              {lead.email && <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-slate-400" /><span>{lead.email}</span></div>}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-medium mb-4">Управление</h2>
            <div className="space-y-4">
              <div>
                <Label className="text-sm mb-1.5 block">Статус</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">Нов</SelectItem>
                    <SelectItem value="CONTACTED">Свързани</SelectItem>
                    <SelectItem value="SENT_TO_CLINIC">Изпратен</SelectItem>
                    <SelectItem value="WON">Спечелен</SelectItem>
                    <SelectItem value="LOST">Загубен</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">Клиника</Label>
                <Select value={form.assigned_clinic_id || 'none'} onValueChange={v => setForm(f => ({ ...f, assigned_clinic_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Изберете" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не е избрана</SelectItem>
                    {clinics.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">Бележки</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full bg-sky-500 hover:bg-sky-600">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Запази</>}
              </Button>
            </div>
          </div>
        </div>

        {/* Answers */}
        <div className="bg-white rounded-xl border p-6 mt-6">
          <h2 className="font-medium mb-4">Отговори</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(lead.answers || {}).map(([k, v]) => (
              <div key={k} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 capitalize">{k.replace(/_/g, ' ')}</p>
                <p className="text-sm font-medium">{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="bg-white rounded-xl border p-6 mt-6">
          <h2 className="font-medium mb-4">Резултат</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(lead.score_breakdown || {}).map(([k, v]) => (
              <div key={k} className="bg-slate-50 rounded-lg p-3 flex justify-between">
                <span className="text-sm text-slate-600 capitalize">{k.replace(/_/g, ' ')}</span>
                <span className="text-sm font-semibold text-sky-600">+{v}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 bg-slate-900 text-white rounded-lg p-4 flex justify-between">
            <span>Общо</span>
            <span className="font-bold text-lg">{lead.score_total}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLeadDetail;
