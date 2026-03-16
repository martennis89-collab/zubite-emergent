'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'

export function Header() {
  const [isOpen, setIsOpen] = useState(false)
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

  const scrollToAssessment = (e: React.MouseEvent) => {
    e.preventDefault()
    window.location.href = '/assessment'
  }

  const navLinks = [
    { href: '/', label: 'Начало' },
    { href: '#how-it-works', label: 'Как работи', isAnchor: true },
    { href: '/orthodontics', label: 'Ортодонтия' },
    { href: '/blog', label: 'Блог' },
    { href: '/contact', label: 'Контакти' },
  ]
  
  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-white'
    }`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link 
            href="/" 
            className="font-serif text-2xl font-semibold text-slate-900 transition-transform hover:scale-105" 
            data-testid="logo"
          >
            Zubite
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link 
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors nav-link-animated ${
                  isActive(link.href) && !link.isAnchor ? 'text-sky-500' : 'text-slate-600 hover:text-slate-900'
                }`}
                data-testid={`nav-${link.label.toLowerCase().replace(/\s/g, '-')}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          
          {/* CTA Button */}
          <div className="hidden md:block">
            <button
              onClick={scrollToAssessment}
              className="inline-flex items-center justify-center h-10 px-6 rounded-full bg-sky-500 text-white text-sm font-medium hover:bg-sky-600 transition-all duration-200 hover:shadow-lg hover:shadow-sky-500/25"
              data-testid="nav-cta"
            >
              Направете оценка
            </button>
          </div>
          
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
            {navLinks.map((link) => (
              <Link 
                key={link.href}
                href={link.href}
                className="block py-3 text-sm font-medium text-slate-600 hover:text-slate-900 border-b border-slate-50" 
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={(e) => {
                setIsOpen(false)
                scrollToAssessment(e)
              }}
              className="w-full mt-4 inline-flex items-center justify-center h-12 px-6 rounded-full bg-sky-500 text-white text-sm font-medium"
            >
              Направете оценка
            </button>
          </nav>
        )}
      </div>
    </header>
  )
}
