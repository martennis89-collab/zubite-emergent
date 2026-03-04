'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X, Globe } from 'lucide-react'

interface HeaderProps {
  lang?: 'bg' | 'en'
}

export function Header({ lang = 'bg' }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  
  const isActive = (path: string) => {
    const currentPath = pathname.replace(/^\/en/, '') || '/'
    return currentPath === path
  }
  
  const getLocalizedPath = (path: string) => {
    return lang === 'en' ? `/en${path}` : path
  }
  
  const t = {
    home: lang === 'en' ? 'Home' : 'Начало',
    symptoms: lang === 'en' ? 'Symptoms' : 'Симптоми',
    contact: lang === 'en' ? 'Contact' : 'Контакти',
  }
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href={getLocalizedPath('/')} className="font-serif text-2xl font-semibold text-white" data-testid="logo">
            Zubite<span className="text-sky-400">.bg</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link 
              href={getLocalizedPath('/')} 
              className={`text-sm font-medium transition-colors ${isActive('/') ? 'text-sky-400' : 'text-slate-300 hover:text-white'}`}
              data-testid="nav-home"
            >
              {t.home}
            </Link>
            <Link 
              href={getLocalizedPath('/symptoms')} 
              className={`text-sm font-medium transition-colors ${isActive('/symptoms') || pathname.includes('/symptoms/') ? 'text-sky-400' : 'text-slate-300 hover:text-white'}`}
              data-testid="nav-symptoms"
            >
              {t.symptoms}
            </Link>
            <Link 
              href={getLocalizedPath('/contact')} 
              className={`text-sm font-medium transition-colors ${isActive('/contact') ? 'text-sky-400' : 'text-slate-300 hover:text-white'}`}
              data-testid="nav-contact"
            >
              {t.contact}
            </Link>
            
            {/* Language Toggle */}
            <div className="flex items-center gap-2 ml-4 border-l border-slate-700 pl-4">
              <Globe className="w-4 h-4 text-slate-400" />
              <Link
                href={pathname.replace(/^\/en/, '') || '/'}
                className={`text-sm font-medium px-2 py-1 rounded transition-colors ${lang === 'bg' ? 'bg-sky-500/20 text-sky-400' : 'text-slate-400 hover:text-white'}`}
                data-testid="lang-bg"
              >
                BG
              </Link>
              <span className="text-slate-600">|</span>
              <Link
                href={`/en${pathname.replace(/^\/en/, '') || '/'}`}
                className={`text-sm font-medium px-2 py-1 rounded transition-colors ${lang === 'en' ? 'bg-sky-500/20 text-sky-400' : 'text-slate-400 hover:text-white'}`}
                data-testid="lang-en"
              >
                EN
              </Link>
            </div>
          </nav>
          
          <div className="md:hidden flex items-center gap-2">
            {/* Mobile Language Toggle */}
            <div className="flex items-center gap-1 mr-2">
              <Link
                href={pathname.replace(/^\/en/, '') || '/'}
                className={`text-xs font-medium px-1.5 py-0.5 rounded ${lang === 'bg' ? 'bg-sky-500/20 text-sky-400' : 'text-slate-400'}`}
              >
                BG
              </Link>
              <Link
                href={`/en${pathname.replace(/^\/en/, '') || '/'}`}
                className={`text-xs font-medium px-1.5 py-0.5 rounded ${lang === 'en' ? 'bg-sky-500/20 text-sky-400' : 'text-slate-400'}`}
              >
                EN
              </Link>
            </div>
            <button className="p-2 text-white" onClick={() => setIsOpen(!isOpen)} data-testid="mobile-menu">
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        
        {isOpen && (
          <nav className="md:hidden py-4 border-t border-slate-700">
            <Link href={getLocalizedPath('/')} className="block py-2 text-sm font-medium text-slate-300" onClick={() => setIsOpen(false)}>{t.home}</Link>
            <Link href={getLocalizedPath('/symptoms')} className="block py-2 text-sm font-medium text-slate-300" onClick={() => setIsOpen(false)}>{t.symptoms}</Link>
            <Link href={getLocalizedPath('/contact')} className="block py-2 text-sm font-medium text-slate-300" onClick={() => setIsOpen(false)}>{t.contact}</Link>
          </nav>
        )}
      </div>
    </header>
  )
}
