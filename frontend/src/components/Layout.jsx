import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Shield, FileText, Phone } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path;
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
            <span className="font-heading text-xl md:text-2xl font-semibold text-primary">
              Zubite<span className="text-accent">.bg</span>
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link 
              to="/" 
              className={`text-sm font-medium transition-colors hover:text-accent ${isActive('/') ? 'text-accent' : 'text-muted-foreground'}`}
              data-testid="nav-home"
            >
              Начало
            </Link>
            <Link 
              to="/city/haskovo" 
              className={`text-sm font-medium transition-colors hover:text-accent ${location.pathname.includes('/city/haskovo') ? 'text-accent' : 'text-muted-foreground'}`}
              data-testid="nav-haskovo"
            >
              Хасково
            </Link>
            <Link 
              to="/contact" 
              className={`text-sm font-medium transition-colors hover:text-accent ${isActive('/contact') ? 'text-accent' : 'text-muted-foreground'}`}
              data-testid="nav-contact"
            >
              Контакти
            </Link>
          </nav>
          
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            data-testid="mobile-menu-toggle"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        
        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t border-slate-100">
            <div className="flex flex-col gap-4">
              <Link 
                to="/" 
                className="text-sm font-medium py-2"
                onClick={() => setIsMenuOpen(false)}
                data-testid="mobile-nav-home"
              >
                Начало
              </Link>
              <Link 
                to="/city/haskovo" 
                className="text-sm font-medium py-2"
                onClick={() => setIsMenuOpen(false)}
                data-testid="mobile-nav-haskovo"
              >
                Хасково
              </Link>
              <Link 
                to="/contact" 
                className="text-sm font-medium py-2"
                onClick={() => setIsMenuOpen(false)}
                data-testid="mobile-nav-contact"
              >
                Контакти
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="inline-block mb-4">
              <span className="font-heading text-2xl font-semibold">
                Zubite<span className="text-accent">.bg</span>
              </span>
            </Link>
            <p className="text-slate-400 text-sm max-w-sm">
              Навигатор за дентални решения. Помагаме ви да откриете дали сте подходящ кандидат за премиум дентално лечение.
            </p>
          </div>
          
          {/* Links */}
          <div>
            <h4 className="font-medium mb-4">Лечения</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link to="/invisalign" className="hover:text-white transition-colors" data-testid="footer-invisalign">
                  Invisalign
                </Link>
              </li>
              <li>
                <Link to="/implants" className="hover:text-white transition-colors" data-testid="footer-implants">
                  Зъбни импланти
                </Link>
              </li>
              <li>
                <Link to="/full-mouth" className="hover:text-white transition-colors" data-testid="footer-full-mouth">
                  Пълна терапия
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Legal */}
          <div>
            <h4 className="font-medium mb-4">Информация</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link to="/privacy" className="hover:text-white transition-colors flex items-center gap-2" data-testid="footer-privacy">
                  <Shield className="w-4 h-4" />
                  Поверителност
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white transition-colors flex items-center gap-2" data-testid="footer-terms">
                  <FileText className="w-4 h-4" />
                  Условия
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors flex items-center gap-2" data-testid="footer-contact">
                  <Phone className="w-4 h-4" />
                  Контакти
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-slate-700 mt-12 pt-8 text-center text-sm text-slate-500">
          <p>© {new Date().getFullYear()} Zubite.bg. Всички права запазени.</p>
        </div>
      </div>
    </footer>
  );
};

export const Layout = ({ children, showHeader = true, showFooter = true }) => {
  return (
    <div className="min-h-screen flex flex-col">
      {showHeader && <Header />}
      <main className={`flex-1 ${showHeader ? 'pt-16 md:pt-20' : ''}`}>
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
};

export default Layout;
