'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X, ChevronDown } from 'lucide-react'

interface HeaderProps {
  lang?: 'bg' | 'en'
}

export function Header({ lang = 'bg' }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [treatmentsOpen, setTreatmentsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  
  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + '/')
  }
  
  const treatments = [
    { slug: 'orthodontics', name: 'Ортодонтия' },
    { slug: 'implants', name: 'Зъбни импланти' },
    { slug: 'cosmetic-dentistry', name: 'Естетична стоматология' },
    { slug: 'sleep-airway', name: 'Сънна апнея' },
    { slug: 'tmj', name: 'TMJ / Челюстни стави' },
  ]
  
  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm' : 'bg-white'
    }`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link 
            href="/" 
            className="font-serif text-2xl font-semibold text-slate-900 transition-transform hover:scale-105" 
            data-testid="logo"
          >
            Zubite<span className="text-sky-500">.bg</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link 
              href="/" 
              className={`text-sm font-medium transition-colors nav-link-animated ${
                pathname === '/' ? 'text-sky-500' : 'text-slate-600 hover:text-slate-900'
              }`}
              data-testid="nav-home"
            >
              Начало
            </Link>
            
            {/* Treatments Dropdown */}
            <div className="relative">
              <button
                onClick={() => setTreatmentsOpen(!treatmentsOpen)}
                onBlur={() => setTimeout(() => setTreatmentsOpen(false), 150)}
                className={`text-sm font-medium transition-colors flex items-center gap-1 ${
                  treatments.some(t => isActive(`/${t.slug}`)) ? 'text-sky-500' : 'text-slate-600 hover:text-slate-900'
                }`}
                data-testid="nav-treatments"
              >
                Лечения
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${treatmentsOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {treatmentsOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50 animate-fade-in">
                  {treatments.map((treatment) => (
                    <Link
                      key={treatment.slug}
                      href={`/${treatment.slug}`}
                      className={`block px-4 py-2.5 text-sm transition-colors ${
                        isActive(`/${treatment.slug}`) 
                          ? 'text-sky-500 bg-sky-50' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                      onClick={() => setTreatmentsOpen(false)}
                    >
                      {treatment.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            
            <Link 
              href="/symptoms" 
              className={`text-sm font-medium transition-colors nav-link-animated ${
                isActive('/symptoms') ? 'text-sky-500' : 'text-slate-600 hover:text-slate-900'
              }`}
              data-testid="nav-symptoms"
            >
              Симптоми
            </Link>
            
            <Link 
              href="/contact" 
              className={`text-sm font-medium transition-colors nav-link-animated ${
                isActive('/contact') ? 'text-sky-500' : 'text-slate-600 hover:text-slate-900'
              }`}
              data-testid="nav-contact"
            >
              Контакти
            </Link>
          </nav>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button 
              className="p-2 text-slate-600 hover:text-slate-900 transition-colors" 
              onClick={() => setIsOpen(!isOpen)} 
              data-testid="mobile-menu"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        
        {/* Mobile menu */}
        {isOpen && (
          <nav className="md:hidden py-4 border-t border-slate-100 animate-fade-in-down">
            <Link 
              href="/" 
              className="block py-3 text-sm font-medium text-slate-600 hover:text-slate-900" 
              onClick={() => setIsOpen(false)}
            >
              Начало
            </Link>
            <div className="py-3 border-t border-slate-100">
              <span className="text-xs uppercase text-slate-400 tracking-wider">Лечения</span>
              {treatments.map((treatment) => (
                <Link
                  key={treatment.slug}
                  href={`/${treatment.slug}`}
                  className="block py-2.5 pl-4 text-sm font-medium text-slate-600 hover:text-slate-900"
                  onClick={() => setIsOpen(false)}
                >
                  {treatment.name}
                </Link>
              ))}
            </div>
            <Link 
              href="/symptoms" 
              className="block py-3 text-sm font-medium text-slate-600 hover:text-slate-900 border-t border-slate-100" 
              onClick={() => setIsOpen(false)}
            >
              Симптоми
            </Link>
            <Link 
              href="/contact" 
              className="block py-3 text-sm font-medium text-slate-600 hover:text-slate-900 border-t border-slate-100" 
              onClick={() => setIsOpen(false)}
            >
              Контакти
            </Link>
          </nav>
        )}
      </div>
    </header>
  )
}
