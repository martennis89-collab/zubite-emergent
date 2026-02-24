import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminLogin } from '@/lib/api';
import { toast } from 'sonner';
import { Lock, User, Loader2 } from 'lucide-react';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error('Моля, попълнете всички полета');
      return;
    }
    
    setLoading(true);
    try {
      const response = await adminLogin(username, password);
      localStorage.setItem('admin_token', response.access_token);
      localStorage.setItem('admin_user', JSON.stringify(response.user));
      toast.success('Успешен вход!');
      navigate('/admin/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Грешно потребителско име или парола');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="font-heading text-2xl font-semibold text-primary">
            Zubite<span className="text-accent">.bg</span>
          </span>
          <p className="text-muted-foreground mt-2">Административен панел</p>
        </div>
        
        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-accent" />
            </div>
            <h1 className="text-xl font-heading font-semibold text-primary">
              Вход в системата
            </h1>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Потребителско име
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12"
                data-testid="admin-username-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Парола
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12"
                data-testid="admin-password-input"
              />
            </div>
            
            <Button 
              type="submit" 
              className="btn-primary w-full"
              disabled={loading}
              data-testid="admin-login-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Влизане...
                </>
              ) : (
                'Вход'
              )}
            </Button>
          </form>
          
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-sm text-muted-foreground text-center">
              Демо данни: <code className="bg-slate-100 px-2 py-0.5 rounded">admin</code> / <code className="bg-slate-100 px-2 py-0.5 rounded">admin123</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
