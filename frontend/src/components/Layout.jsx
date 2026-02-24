import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Shield, FileText, Phone } from 'lucide-react';
import { useState } from 'react';

export const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="font-heading text-xl font-semibold text-slate-900" data-testid="logo">
            Zubite<span className="text-sky-500">.bg</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/" className={`text-sm font-medium transition-colors ${location.pathname === '/' ? 'text-sky-500' : 'text-slate-600 hover:text-slate-900'}`} data-testid="nav-home">
              Начало
            </Link>
            <Link to="/contact" className={`text-sm font-medium transition-colors ${location.pathname === '/contact' ? 'text-sky-500' : 'text-slate-600 hover:text-slate-900'}`} data-testid="nav-contact">
              Контакти
            </Link>
          </nav>
          
          <button className="md:hidden p-2" onClick={() => setIsOpen(!isOpen)} data-testid="mobile-menu">
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        
        {isOpen && (
          <nav className="md:hidden py-4 border-t border-slate-100">
            <Link to="/" className="block py-2 text-sm font-medium" onClick={() => setIsOpen(false)}>Начало</Link>
            <Link to="/contact" className="block py-2 text-sm font-medium" onClick={() => setIsOpen(false)}>Контакти</Link>
          </nav>
        )}
      </div>
    </header>
  );
};

export const Footer = () => (
  <footer className="bg-slate-900 text-white py-12">
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <span className="font-heading text-xl font-semibold">Zubite<span className="text-sky-400">.bg</span></span>
          <p className="text-slate-400 text-sm mt-2">Навигатор за дентални решения</p>
        </div>
        <div>
          <h4 className="font-medium mb-3">Информация</h4>
          <div className="space-y-2 text-sm text-slate-400">
            <Link to="/privacy" className="flex items-center gap-2 hover:text-white"><Shield className="w-4 h-4" />Поверителност</Link>
            <Link to="/terms" className="flex items-center gap-2 hover:text-white"><FileText className="w-4 h-4" />Условия</Link>
            <Link to="/contact" className="flex items-center gap-2 hover:text-white"><Phone className="w-4 h-4" />Контакти</Link>
          </div>
        </div>
        <div>
          <h4 className="font-medium mb-3">Градове</h4>
          <div className="space-y-2 text-sm text-slate-400">
            <Link to="/city/sofia" className="block hover:text-white">София</Link>
            <Link to="/city/plovdiv" className="block hover:text-white">Пловдив</Link>
            <Link to="/city/varna" className="block hover:text-white">Варна</Link>
            <Link to="/city/haskovo" className="block hover:text-white">Хасково</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Zubite.bg
      </div>
    </div>
  </footer>
);

export const Layout = ({ children, showHeader = true, showFooter = true }) => (
  <div className="min-h-screen flex flex-col bg-slate-50">
    {showHeader && <Header />}
    <main className={`flex-1 ${showHeader ? 'pt-16' : ''}`}>{children}</main>
    {showFooter && <Footer />}
  </div>
);

export default Layout;
