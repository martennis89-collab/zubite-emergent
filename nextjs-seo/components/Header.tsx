'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X, ChevronDown } from 'lucide-react'

interface HeaderProps {
  lang?: 'bg' | 'en'
}

export function Header({ lang = 'bg' }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [treatmentsOpen, setTreatmentsOpen] = useState(false)
  const pathname = usePathname()
  
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
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="font-serif text-2xl font-semibold text-white" data-testid="logo">
            Zubite<span className="text-sky-400">.bg</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link 
              href="/" 
              className={`text-sm font-medium transition-colors ${pathname === '/' ? 'text-sky-400' : 'text-slate-300 hover:text-white'}`}
              data-testid="nav-home"
            >
              Начало
            </Link>
            
            {/* Treatments Dropdown */}
            <div className="relative">
              <button
                onClick={() => setTreatmentsOpen(!treatmentsOpen)}
                className={`text-sm font-medium transition-colors flex items-center gap-1 ${
                  treatments.some(t => isActive(`/${t.slug}`)) ? 'text-sky-400' : 'text-slate-300 hover:text-white'
                }`}
                data-testid="nav-treatments"
              >
                Лечения
                <ChevronDown className={`w-4 h-4 transition-transform ${treatmentsOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {treatmentsOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 glass rounded-xl shadow-xl py-2 z-50">
                  {treatments.map((treatment) => (
                    <Link
                      key={treatment.slug}
                      href={`/${treatment.slug}`}
                      className={`block px-4 py-2 text-sm transition-colors ${
                        isActive(`/${treatment.slug}`) ? 'text-sky-400 bg-sky-500/10' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
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
              href="/contact" 
              className={`text-sm font-medium transition-colors ${isActive('/contact') ? 'text-sky-400' : 'text-slate-300 hover:text-white'}`}
              data-testid="nav-contact"
            >
              Контакти
            </Link>
          </nav>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button className="p-2 text-white" onClick={() => setIsOpen(!isOpen)} data-testid="mobile-menu">
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        
        {/* Mobile menu */}
        {isOpen && (
          <nav className="md:hidden py-4 border-t border-slate-700">
            <Link href="/" className="block py-2 text-sm font-medium text-slate-300" onClick={() => setIsOpen(false)}>Начало</Link>
            <div className="py-2">
              <span className="text-xs uppercase text-slate-500 tracking-wider">Лечения</span>
              {treatments.map((treatment) => (
                <Link
                  key={treatment.slug}
                  href={`/${treatment.slug}`}
                  className="block py-2 pl-4 text-sm font-medium text-slate-300"
                  onClick={() => setIsOpen(false)}
                >
                  {treatment.name}
                </Link>
              ))}
            </div>
            <Link href="/contact" className="block py-2 text-sm font-medium text-slate-300" onClick={() => setIsOpen(false)}>Контакти</Link>
          </nav>
        )}
      </div>
    </header>
  )
}
