import Link from 'next/link'
import { Facebook, Instagram, Linkedin } from 'lucide-react'

interface FooterProps {
  treatmentSlug?: string
}

export function Footer({ treatmentSlug }: FooterProps) {
  return (
    <footer className="bg-slate-50 border-t border-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="font-serif text-xl font-semibold text-slate-900">
              Zubite<span className="text-sky-500">.bg</span>
            </Link>
            <p className="text-slate-500 text-sm mt-2">
              Платформа за информирани решения в ортодонтията
            </p>
            
            {/* Social Icons */}
            <div className="flex items-center gap-3 mt-4">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-sky-100 hover:text-sky-500 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-sky-100 hover:text-sky-500 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-sky-100 hover:text-sky-500 transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>
          
          {/* Orthodontics */}
          <div>
            <h4 className="font-medium text-slate-900 mb-4 text-sm">Ортодонтия</h4>
            <div className="space-y-2.5 text-sm text-slate-500">
              <Link href="/orthodontics" className="block hover:text-sky-500 transition-colors">
                Ортодонтия
              </Link>
              <Link href="/aligners-vs-braces" className="block hover:text-sky-500 transition-colors">
                Алайнери vs Брекети
              </Link>
              <Link href="/symptoms" className="block hover:text-sky-500 transition-colors">
                Симптоми
              </Link>
            </div>
          </div>
          
          {/* Platform */}
          <div>
            <h4 className="font-medium text-slate-900 mb-4 text-sm">Платформа</h4>
            <div className="space-y-2.5 text-sm text-slate-500">
              <Link href="#how-it-works" className="block hover:text-sky-500 transition-colors">
                Как работи Zubite
              </Link>
              <Link href="/contact" className="block hover:text-sky-500 transition-colors">
                Контакти
              </Link>
            </div>
          </div>
          
          {/* Legal */}
          <div>
            <h4 className="font-medium text-slate-900 mb-4 text-sm">Правна информация</h4>
            <div className="space-y-2.5 text-sm text-slate-500">
              <Link href="/privacy" className="block hover:text-sky-500 transition-colors">
                Политика за поверителност
              </Link>
              <Link href="/cookies" className="block hover:text-sky-500 transition-colors">
                Политика за бисквитки
              </Link>
              <Link href="/terms" className="block hover:text-sky-500 transition-colors">
                Условия за ползване
              </Link>
            </div>
          </div>
        </div>
        
        <div className="border-t border-slate-200 mt-10 pt-8 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} Zubite. Всички права запазени.
        </div>
      </div>
    </footer>
  )
}
