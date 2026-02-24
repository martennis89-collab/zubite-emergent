import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getAdminLeads, getAdminMe } from '@/lib/api';
import { formatDate, translateStatus, translateTreatment, getStatusClass, getBandClass } from '@/lib/utils';
import { LayoutDashboard, Users, LogOut, Eye, Filter } from 'lucide-react';

const AdminLeads = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [leads, setLeads] = useState([]);
  const [filters, setFilters] = useState({
    city_slug: searchParams.get('city_slug') || '',
    treatment_type: searchParams.get('treatment_type') || '',
    band: searchParams.get('band') || '',
    status: searchParams.get('status') || ''
  });

  useEffect(() => {
    getAdminMe()
      .then(() => {
        const f = {};
        Object.entries(filters).forEach(([k, v]) => { if (v && v !== 'all') f[k] = v; });
        return getAdminLeads(f);
      })
      .then(setLeads)
      .catch(() => navigate('/admin'));
  }, [filters, navigate]);

  const updateFilter = (k, v) => {
    setFilters(f => ({ ...f, [k]: v }));
    if (v && v !== 'all') searchParams.set(k, v); else searchParams.delete(k);
    setSearchParams(searchParams);
  };

  const logout = () => { localStorage.removeItem('admin_token'); navigate('/admin'); };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <span className="font-heading text-xl font-semibold">Zubite<span className="text-sky-500">.bg</span> Admin</span>
        <Button variant="outline" size="sm" onClick={logout}><LogOut className="w-4 h-4 mr-2" />Изход</Button>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex gap-4 mb-8">
          <Link to="/admin/dashboard"><Button variant="outline"><LayoutDashboard className="w-4 h-4 mr-2" />Табло</Button></Link>
          <Link to="/admin/leads"><Button className="bg-slate-900"><Users className="w-4 h-4 mr-2" />Лийдове</Button></Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border p-4 mb-6">
          <div className="flex items-center gap-2 mb-3"><Filter className="w-4 h-4" /><span className="text-sm font-medium">Филтри</span></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Select value={filters.city_slug || 'all'} onValueChange={v => updateFilter('city_slug', v)}>
              <SelectTrigger><SelectValue placeholder="Град" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всички градове</SelectItem>
                <SelectItem value="sofia">София</SelectItem>
                <SelectItem value="plovdiv">Пловдив</SelectItem>
                <SelectItem value="varna">Варна</SelectItem>
                <SelectItem value="haskovo">Хасково</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.treatment_type || 'all'} onValueChange={v => updateFilter('treatment_type', v)}>
              <SelectTrigger><SelectValue placeholder="Лечение" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всички</SelectItem>
                <SelectItem value="invisalign">Invisalign</SelectItem>
                <SelectItem value="implants">Импланти</SelectItem>
                <SelectItem value="full_mouth">Пълна терапия</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.band || 'all'} onValueChange={v => updateFilter('band', v)}>
              <SelectTrigger><SelectValue placeholder="Резултат" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всички</SelectItem>
                <SelectItem value="GREEN">GREEN</SelectItem>
                <SelectItem value="YELLOW">YELLOW</SelectItem>
                <SelectItem value="RED">RED</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.status || 'all'} onValueChange={v => updateFilter('status', v)}>
              <SelectTrigger><SelectValue placeholder="Статус" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всички</SelectItem>
                <SelectItem value="NEW">Нов</SelectItem>
                <SelectItem value="CONTACTED">Свързани</SelectItem>
                <SelectItem value="SENT_TO_CLINIC">Изпратен</SelectItem>
                <SelectItem value="WON">Спечелен</SelectItem>
                <SelectItem value="LOST">Загубен</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Дата</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Град</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Лечение</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Резултат</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Статус</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Контакт</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {leads.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Няма лийдове</td></tr>
              ) : leads.map(lead => (
                <tr key={lead.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm">{formatDate(lead.created_at)}</td>
                  <td className="px-4 py-3 text-sm capitalize">{lead.city_slug}</td>
                  <td className="px-4 py-3 text-sm">{translateTreatment(lead.treatment_type)}</td>
                  <td className="px-4 py-3"><Badge className={getBandClass(lead.band)}>{lead.band} ({lead.score_total})</Badge></td>
                  <td className="px-4 py-3"><Badge className={getStatusClass(lead.status)}>{translateStatus(lead.status)}</Badge></td>
                  <td className="px-4 py-3 text-sm">{lead.name || lead.email || '-'}</td>
                  <td className="px-4 py-3">
                    <Link to={`/admin/leads/${lead.id}`}>
                      <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminLeads;
