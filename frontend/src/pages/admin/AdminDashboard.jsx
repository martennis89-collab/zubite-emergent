import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getAdminStats, getAdminMe } from '@/lib/api';
import { toast } from 'sonner';
import { 
  LayoutDashboard, 
  Users, 
  LogOut, 
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Smile,
  Target,
  Stethoscope,
  Loader2
} from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await getAdminMe();
        setUser(userData);
        const statsData = await getAdminStats();
        setStats(statsData);
      } catch (error) {
        console.error('Auth error:', error);
        toast.error('Сесията ви е изтекла');
        navigate('/admin');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/admin');
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
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden md:inline">
              Здравей, {user?.username}
            </span>
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
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Navigation */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Link to="/admin/dashboard">
            <Button variant="default" className="bg-primary" data-testid="nav-dashboard">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Табло
            </Button>
          </Link>
          <Link to="/admin/leads">
            <Button variant="outline" data-testid="nav-leads">
              <Users className="w-4 h-4 mr-2" />
              Лийдове
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Leads */}
          <div className="bg-white rounded-xl border border-slate-200 p-6" data-testid="stat-total">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Общо лийдове</p>
                <p className="text-2xl font-heading font-semibold text-primary">
                  {stats?.total_leads || 0}
                </p>
              </div>
            </div>
          </div>

          {/* New Leads */}
          <div className="bg-white rounded-xl border border-slate-200 p-6" data-testid="stat-new">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Нови</p>
                <p className="text-2xl font-heading font-semibold text-primary">
                  {stats?.new_leads || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Green Leads */}
          <div className="bg-white rounded-xl border border-slate-200 p-6" data-testid="stat-green">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Одобрени (GREEN)</p>
                <p className="text-2xl font-heading font-semibold text-primary">
                  {stats?.by_band?.green || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Yellow Leads */}
          <div className="bg-white rounded-xl border border-slate-200 p-6" data-testid="stat-yellow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">За оценка (YELLOW)</p>
                <p className="text-2xl font-heading font-semibold text-primary">
                  {stats?.by_band?.yellow || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* By Treatment */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <h3 className="text-lg font-heading font-semibold text-primary mb-6">По тип лечение</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4 p-4 bg-surface rounded-xl">
              <Smile className="w-8 h-8 text-accent" />
              <div>
                <p className="text-sm text-muted-foreground">Invisalign</p>
                <p className="text-xl font-semibold">{stats?.by_treatment?.invisalign || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-surface rounded-xl">
              <Target className="w-8 h-8 text-accent" />
              <div>
                <p className="text-sm text-muted-foreground">Импланти</p>
                <p className="text-xl font-semibold">{stats?.by_treatment?.implants || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-surface rounded-xl">
              <Stethoscope className="w-8 h-8 text-accent" />
              <div>
                <p className="text-sm text-muted-foreground">Пълна терапия</p>
                <p className="text-xl font-semibold">{stats?.by_treatment?.full_mouth || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-heading font-semibold text-primary mb-6">Бързи действия</h3>
          <div className="flex flex-wrap gap-4">
            <Link to="/admin/leads">
              <Button className="btn-accent" data-testid="action-view-leads">
                <Users className="w-4 h-4 mr-2" />
                Виж всички лийдове
              </Button>
            </Link>
            <Link to="/admin/leads?status=NEW">
              <Button variant="outline" data-testid="action-new-leads">
                Нови лийдове ({stats?.new_leads || 0})
              </Button>
            </Link>
            <Link to="/admin/leads?band=GREEN">
              <Button variant="outline" data-testid="action-green-leads">
                Одобрени ({stats?.by_band?.green || 0})
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
