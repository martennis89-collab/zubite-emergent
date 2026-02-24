import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getAdminStats, getAdminMe } from '@/lib/api';
import { LayoutDashboard, Users, LogOut, TrendingUp, CheckCircle, AlertTriangle, XCircle, MapPin } from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getAdminMe()
      .then(() => getAdminStats())
      .then(setStats)
      .catch(() => navigate('/admin'));
  }, [navigate]);

  const logout = () => { localStorage.removeItem('admin_token'); navigate('/admin'); };

  if (!stats) return <div className="min-h-screen flex items-center justify-center">Зареждане...</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <span className="font-heading text-xl font-semibold">Zubite<span className="text-sky-500">.bg</span> Admin</span>
        <Button variant="outline" size="sm" onClick={logout}><LogOut className="w-4 h-4 mr-2" />Изход</Button>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex gap-4 mb-8">
          <Link to="/admin/dashboard"><Button className="bg-slate-900"><LayoutDashboard className="w-4 h-4 mr-2" />Табло</Button></Link>
          <Link to="/admin/leads"><Button variant="outline"><Users className="w-4 h-4 mr-2" />Лийдове</Button></Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl border p-6">
            <TrendingUp className="w-8 h-8 text-sky-500 mb-3" />
            <p className="text-sm text-slate-500">Общо</p>
            <p className="text-2xl font-semibold">{stats.total_leads}</p>
          </div>
          <div className="bg-white rounded-xl border p-6">
            <CheckCircle className="w-8 h-8 text-emerald-500 mb-3" />
            <p className="text-sm text-slate-500">GREEN</p>
            <p className="text-2xl font-semibold">{stats.by_band.green}</p>
          </div>
          <div className="bg-white rounded-xl border p-6">
            <AlertTriangle className="w-8 h-8 text-amber-500 mb-3" />
            <p className="text-sm text-slate-500">YELLOW</p>
            <p className="text-2xl font-semibold">{stats.by_band.yellow}</p>
          </div>
          <div className="bg-white rounded-xl border p-6">
            <XCircle className="w-8 h-8 text-red-500 mb-3" />
            <p className="text-sm text-slate-500">RED</p>
            <p className="text-2xl font-semibold">{stats.by_band.red}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-medium mb-4 flex items-center gap-2"><MapPin className="w-5 h-5" />По градове</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.by_city).map(([city, count]) => (
              <div key={city} className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-sm text-slate-500 capitalize">{city}</p>
                <p className="text-xl font-semibold">{count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
