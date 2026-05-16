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

  const navLinks = [
    { href: '/', label: 'Начало' },
    { href: '/symptoms', label: 'Симптоми' },
    { href: '/orthodontics', label: 'Ортодонтия' },
    { href: '/blog', label: 'Блог' },
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
            Zubite<span className="text-sky-500">.bg</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link 
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors nav-link-animated ${
                  isActive(link.href) ? 'text-sky-500' : 'text-slate-600 hover:text-slate-900'
                }`}
                data-testid={`nav-${link.label.toLowerCase().replace(/\s/g, '-')}`}
              >
                {link.label}
              </Link>
            ))}
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
          </nav>
        )}
      </div>
    </header>
  )
}
