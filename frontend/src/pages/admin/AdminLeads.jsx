import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getAdminLeads, getAdminMe } from '@/lib/api';
import { formatDate, translateStatus, translateTreatment, translateBand, getStatusColorClass, getBandColorClass } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  LayoutDashboard, 
  Users, 
  LogOut, 
  Search,
  Filter,
  Eye,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const AdminLeads = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    treatment_type: searchParams.get('treatment_type') || '',
    band: searchParams.get('band') || '',
    status: searchParams.get('status') || '',
    city: searchParams.get('city') || ''
  });

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        await getAdminMe();
        const activeFilters = {};
        Object.entries(filters).forEach(([key, value]) => {
          if (value && value !== 'all') activeFilters[key] = value;
        });
        const data = await getAdminLeads(activeFilters);
        setLeads(data);
      } catch (error) {
        console.error('Error:', error);
        if (error.response?.status === 401) {
          navigate('/admin');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, [navigate, filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    if (value && value !== 'all') {
      searchParams.set(key, value);
    } else {
      searchParams.delete(key);
    }
    setSearchParams(searchParams);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/admin');
  };

  const handleExport = () => {
    const API_URL = process.env.REACT_APP_BACKEND_URL;
    const token = localStorage.getItem('admin_token');
    window.open(`${API_URL}/api/admin/leads/export/csv`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
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
            <span className="hidden md:inline text-muted-foreground">|</span>
            <span className="hidden md:inline text-muted-foreground text-sm">Административен панел</span>
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
        {/* Navigation */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Link to="/admin/dashboard">
            <Button variant="outline" data-testid="nav-dashboard">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Табло
            </Button>
          </Link>
          <Link to="/admin/leads">
            <Button variant="default" className="bg-primary" data-testid="nav-leads">
              <Users className="w-4 h-4 mr-2" />
              Лийдове
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-medium">Филтри</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select 
              value={filters.treatment_type || 'all'} 
              onValueChange={(v) => handleFilterChange('treatment_type', v)}
            >
              <SelectTrigger data-testid="filter-treatment">
                <SelectValue placeholder="Тип лечение" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всички лечения</SelectItem>
                <SelectItem value="invisalign">Invisalign</SelectItem>
                <SelectItem value="implants">Импланти</SelectItem>
                <SelectItem value="full_mouth">Пълна терапия</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.band || 'all'} 
              onValueChange={(v) => handleFilterChange('band', v)}
            >
              <SelectTrigger data-testid="filter-band">
                <SelectValue placeholder="Резултат" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всички резултати</SelectItem>
                <SelectItem value="GREEN">GREEN</SelectItem>
                <SelectItem value="YELLOW">YELLOW</SelectItem>
                <SelectItem value="RED">RED</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.status || 'all'} 
              onValueChange={(v) => handleFilterChange('status', v)}
            >
              <SelectTrigger data-testid="filter-status">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всички статуси</SelectItem>
                <SelectItem value="NEW">Нов</SelectItem>
                <SelectItem value="CONTACTED">Свързани</SelectItem>
                <SelectItem value="SENT_TO_CLINIC">Изпратен</SelectItem>
                <SelectItem value="WON">Спечелен</SelectItem>
                <SelectItem value="LOST">Загубен</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Търсене по град..."
              value={filters.city}
              onChange={(e) => handleFilterChange('city', e.target.value)}
              className="h-10"
              data-testid="filter-city"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-muted-foreground">
            Намерени: <strong>{leads.length}</strong> лийдове
          </p>
          <Button variant="outline" size="sm" onClick={handleExport} data-testid="export-csv-btn">
            <Download className="w-4 h-4 mr-2" />
            Експорт CSV
          </Button>
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Дата</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Лечение</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Резултат</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Статус</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Град</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Контакт</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                      Няма намерени лийдове
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors" data-testid={`lead-row-${lead.id}`}>
                      <td className="px-6 py-4 text-sm">{formatDate(lead.created_at)}</td>
                      <td className="px-6 py-4 text-sm">{translateTreatment(lead.treatment_type)}</td>
                      <td className="px-6 py-4">
                        <Badge className={`${getBandColorClass(lead.band)} border`}>
                          {lead.band} ({lead.score_total})
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={getStatusColorClass(lead.status)}>
                          {translateStatus(lead.status)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm">{lead.city || '-'}</td>
                      <td className="px-6 py-4 text-sm">
                        {lead.name || lead.email || lead.phone ? (
                          <div className="space-y-1">
                            {lead.name && <div>{lead.name}</div>}
                            {lead.email && <div className="text-muted-foreground text-xs">{lead.email}</div>}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Link to={`/admin/leads/${lead.id}`}>
                          <Button variant="ghost" size="sm" data-testid={`view-lead-${lead.id}`}>
                            <Eye className="w-4 h-4 mr-1" />
                            Виж
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLeads;
