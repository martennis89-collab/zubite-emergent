import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Shield, FileText, Phone, Globe } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { language, setLanguage, t, getLocalizedPath } = useLanguage();
  
  // Check if current path matches (accounting for language prefix)
  const isActive = (path) => {
    const currentPath = location.pathname.replace(/^\/en/, '') || '/';
    return currentPath === path;
  };
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to={getLocalizedPath('/')} className="font-heading text-xl font-semibold text-slate-900" data-testid="logo">
            Zubite<span className="text-sky-500">.bg</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link to={getLocalizedPath('/')} className={`text-sm font-medium transition-colors ${isActive('/') ? 'text-sky-500' : 'text-slate-600 hover:text-slate-900'}`} data-testid="nav-home">
              {t('nav.home')}
            </Link>
            <Link to={getLocalizedPath('/symptoms')} className={`text-sm font-medium transition-colors ${isActive('/symptoms') || location.pathname.includes('/symptoms/') ? 'text-sky-500' : 'text-slate-600 hover:text-slate-900'}`} data-testid="nav-symptoms">
              {t('nav.symptoms')}
            </Link>
            <Link to={getLocalizedPath('/contact')} className={`text-sm font-medium transition-colors ${isActive('/contact') ? 'text-sky-500' : 'text-slate-600 hover:text-slate-900'}`} data-testid="nav-contact">
              {t('nav.contact')}
            </Link>
            
            {/* Language Toggle */}
            <div className="flex items-center gap-1 ml-4 border-l border-slate-200 pl-4" data-testid="language-toggle">
              <Globe className="w-4 h-4 text-slate-400 mr-1" />
              <button
                onClick={() => setLanguage('bg')}
                className={`text-sm font-medium px-2 py-1 rounded transition-colors ${language === 'bg' ? 'bg-sky-100 text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}
                data-testid="lang-bg"
              >
                BG
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={() => setLanguage('en')}
                className={`text-sm font-medium px-2 py-1 rounded transition-colors ${language === 'en' ? 'bg-sky-100 text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}
                data-testid="lang-en"
              >
                EN
              </button>
            </div>
          </nav>
          
          <div className="md:hidden flex items-center gap-2">
            {/* Mobile Language Toggle */}
            <div className="flex items-center gap-1 mr-2" data-testid="mobile-language-toggle">
              <button
                onClick={() => setLanguage('bg')}
                className={`text-xs font-medium px-1.5 py-0.5 rounded ${language === 'bg' ? 'bg-sky-100 text-sky-600' : 'text-slate-500'}`}
              >
                BG
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`text-xs font-medium px-1.5 py-0.5 rounded ${language === 'en' ? 'bg-sky-100 text-sky-600' : 'text-slate-500'}`}
              >
                EN
              </button>
            </div>
            <button className="p-2" onClick={() => setIsOpen(!isOpen)} data-testid="mobile-menu">
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        
        {isOpen && (
          <nav className="md:hidden py-4 border-t border-slate-100">
            <Link to={getLocalizedPath('/')} className="block py-2 text-sm font-medium" onClick={() => setIsOpen(false)}>{t('nav.home')}</Link>
            <Link to={getLocalizedPath('/symptoms')} className="block py-2 text-sm font-medium" onClick={() => setIsOpen(false)}>{t('nav.symptoms')}</Link>
            <Link to={getLocalizedPath('/contact')} className="block py-2 text-sm font-medium" onClick={() => setIsOpen(false)}>{t('nav.contact')}</Link>
          </nav>
        )}
      </div>
    </header>
  );
};

export const Footer = () => {
  const { t, getLocalizedPath } = useLanguage();
  
  return (
    <footer className="bg-slate-900 text-white py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <span className="font-heading text-xl font-semibold">Zubite<span className="text-sky-400">.bg</span></span>
            <p className="text-slate-400 text-sm mt-2">{t('footer.tagline')}</p>
          </div>
          <div>
            <h4 className="font-medium mb-3">{t('footer.info')}</h4>
            <div className="space-y-2 text-sm text-slate-400">
              <Link to={getLocalizedPath('/privacy')} className="flex items-center gap-2 hover:text-white"><Shield className="w-4 h-4" />{t('nav.privacy')}</Link>
              <Link to={getLocalizedPath('/terms')} className="flex items-center gap-2 hover:text-white"><FileText className="w-4 h-4" />{t('nav.terms')}</Link>
              <Link to={getLocalizedPath('/contact')} className="flex items-center gap-2 hover:text-white"><Phone className="w-4 h-4" />{t('nav.contact')}</Link>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-3">{t('footer.cities')}</h4>
            <div className="space-y-2 text-sm text-slate-400">
              <Link to={getLocalizedPath('/city/sofia')} className="block hover:text-white">{t('cities.sofia')}</Link>
              <Link to={getLocalizedPath('/city/plovdiv')} className="block hover:text-white">{t('cities.plovdiv')}</Link>
              <Link to={getLocalizedPath('/city/varna')} className="block hover:text-white">{t('cities.varna')}</Link>
              <Link to={getLocalizedPath('/city/haskovo')} className="block hover:text-white">{t('cities.haskovo')}</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} Zubite.bg
        </div>
      </div>
    </footer>
  );
};

export const Layout = ({ children, showHeader = true, showFooter = true }) => (
  <div className="min-h-screen flex flex-col bg-slate-50">
    {showHeader && <Header />}
    <main className={`flex-1 ${showHeader ? 'pt-16' : ''}`}>{children}</main>
    {showFooter && <Footer />}
  </div>
);

export default Layout;
