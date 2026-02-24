import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getAdminLead, updateAdminLead, getAdminClinics } from '@/lib/api';
import { formatDate, translateStatus, translateTreatment, getStatusColorClass, getBandColorClass } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  LayoutDashboard, 
  Users, 
  LogOut, 
  ArrowLeft,
  Save,
  Loader2,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Building
} from 'lucide-react';

const AdminLeadDetail = () => {
  const navigate = useNavigate();
  const { leadId } = useParams();
  const [lead, setLead] = useState(null);
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    status: '',
    assigned_clinic_id: '',
    notes: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [leadData, clinicsData] = await Promise.all([
          getAdminLead(leadId),
          getAdminClinics()
        ]);
        setLead(leadData);
        setClinics(clinicsData);
        setFormData({
          status: leadData.status || 'NEW',
          assigned_clinic_id: leadData.assigned_clinic_id || '',
          notes: leadData.notes || ''
        });
      } catch (error) {
        console.error('Error:', error);
        if (error.response?.status === 401) {
          navigate('/admin');
        } else {
          toast.error('Грешка при зареждане');
          navigate('/admin/leads');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [leadId, navigate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = { ...formData };
      if (!updateData.assigned_clinic_id) delete updateData.assigned_clinic_id;
      
      const updated = await updateAdminLead(leadId, updateData);
      setLead(updated);
      toast.success('Промените са запазени');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Грешка при запазване');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkSentToClinic = async () => {
    setSaving(true);
    try {
      const updated = await updateAdminLead(leadId, { status: 'SENT_TO_CLINIC' });
      setLead(updated);
      setFormData(prev => ({ ...prev, status: 'SENT_TO_CLINIC' }));
      toast.success('Лийдът е маркиран като изпратен към клиника');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Грешка при обновяване');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/admin');
  };

  const getBandIcon = (band) => {
    switch (band) {
      case 'GREEN': return <CheckCircle className="w-6 h-6 text-success" />;
      case 'YELLOW': return <AlertTriangle className="w-6 h-6 text-warning" />;
      case 'RED': return <XCircle className="w-6 h-6 text-destructive" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p>Лийдът не е намерен</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-heading text-xl font-semibold text-primary">
              Zubite<span className="text-accent">.bg</span>
            </span>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleLogout}
            data-testid="admin-logout-btn"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Изход
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Back Button */}
        <Link to="/admin/leads" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="w-4 h-4" />
          Обратно към лийдове
        </Link>

        {/* Lead Info Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              {getBandIcon(lead.band)}
              <div>
                <h1 className="text-xl font-heading font-semibold text-primary">
                  {lead.name || 'Неизвестен'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  ID: {lead.id.slice(0, 8)}... | {formatDate(lead.created_at)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className={`${getBandColorClass(lead.band)} border text-sm`}>
                {lead.band} ({lead.score_total} pts)
              </Badge>
              <Badge className={`${getStatusColorClass(lead.status)} text-sm`}>
                {translateStatus(lead.status)}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Contact & Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Info */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-heading font-semibold text-primary mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-accent" />
                Информация за контакт
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-surface rounded-lg">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Име</p>
                    <p className="font-medium">{lead.name || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-surface rounded-lg">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Телефон</p>
                    <p className="font-medium">{lead.phone || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-surface rounded-lg">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Имейл</p>
                    <p className="font-medium">{lead.email || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-surface rounded-lg">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Град</p>
                    <p className="font-medium">{lead.city || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quiz Answers */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-heading font-semibold text-primary mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" />
                Отговори от въпросника
              </h2>
              <div className="space-y-3">
                {lead.answers && Object.entries(lead.answers).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center p-3 bg-surface rounded-lg">
                    <span className="text-sm text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="font-medium text-sm">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-heading font-semibold text-primary mb-4">
                Разбивка на резултата
              </h2>
              <div className="space-y-2">
                {lead.score_breakdown && Object.entries(lead.score_breakdown).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center p-3 bg-surface rounded-lg">
                    <span className="text-sm text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="font-semibold text-accent">+{value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center p-3 bg-primary text-white rounded-lg mt-4">
                  <span className="font-medium">Общо</span>
                  <span className="font-bold text-lg">{lead.score_total}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-6">
            {/* Status Update */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-heading font-semibold text-primary mb-4">
                Управление
              </h2>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Статус</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}
                  >
                    <SelectTrigger data-testid="status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEW">Нов</SelectItem>
                      <SelectItem value="CONTACTED">Свързани</SelectItem>
                      <SelectItem value="SENT_TO_CLINIC">Изпратен към клиника</SelectItem>
                      <SelectItem value="WON">Спечелен</SelectItem>
                      <SelectItem value="LOST">Загубен</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Клиника партньор
                  </Label>
                  <Select 
                    value={formData.assigned_clinic_id || 'none'} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, assigned_clinic_id: v === 'none' ? '' : v }))}
                  >
                    <SelectTrigger data-testid="clinic-select">
                      <SelectValue placeholder="Изберете клиника" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Не е избрана</SelectItem>
                      {clinics.map(clinic => (
                        <SelectItem key={clinic.id} value={clinic.id}>
                          {clinic.name} ({clinic.city})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Вътрешни бележки</Label>
                  <Textarea
                    placeholder="Добавете бележки..."
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={4}
                    data-testid="notes-textarea"
                  />
                </div>

                <Button 
                  onClick={handleSave} 
                  className="btn-accent w-full"
                  disabled={saving}
                  data-testid="save-btn"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Запази промените
                </Button>
              </div>
            </div>

            {/* Quick Action */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-heading font-semibold text-primary mb-4">
                Бързо действие
              </h2>
              <Button 
                onClick={handleMarkSentToClinic}
                variant="outline"
                className="w-full"
                disabled={saving || lead.status === 'SENT_TO_CLINIC'}
                data-testid="mark-sent-btn"
              >
                <Building className="w-4 h-4 mr-2" />
                Маркирай като изпратен към клиника
              </Button>
            </div>

            {/* UTM Info */}
            {(lead.utm_source || lead.utm_campaign) && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-lg font-heading font-semibold text-primary mb-4">
                  Маркетинг данни
                </h2>
                <div className="space-y-2 text-sm">
                  {lead.utm_source && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Source</span>
                      <span>{lead.utm_source}</span>
                    </div>
                  )}
                  {lead.utm_campaign && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Campaign</span>
                      <span>{lead.utm_campaign}</span>
                    </div>
                  )}
                  {lead.utm_adset && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Adset</span>
                      <span>{lead.utm_adset}</span>
                    </div>
                  )}
                  {lead.gclid && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">GCLID</span>
                      <span className="truncate max-w-[120px]">{lead.gclid}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLeadDetail;
