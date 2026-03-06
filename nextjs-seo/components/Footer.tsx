import Link from 'next/link'
import { Shield, FileText, Phone, MapPin } from 'lucide-react'

interface FooterProps {
  treatmentSlug?: string
}

export function Footer({ treatmentSlug = 'orthodontics' }: FooterProps) {
  return (
    <footer className="bg-slate-50 border-t border-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link href="/" className="font-serif text-xl font-semibold text-slate-900">
              Zubite<span className="text-sky-500">.bg</span>
            </Link>
            <p className="text-slate-500 text-sm mt-2">Навигатор за дентални решения</p>
          </div>
          
          {/* Treatments */}
          <div>
            <h4 className="font-medium text-slate-900 mb-4">Лечения</h4>
            <div className="space-y-2.5 text-sm text-slate-500">
              <Link href="/orthodontics" className="block hover:text-sky-500 transition-colors">
                Ортодонтия
              </Link>
              <Link href="/implants" className="block hover:text-sky-500 transition-colors">
                Зъбни импланти
              </Link>
              <Link href="/cosmetic-dentistry" className="block hover:text-sky-500 transition-colors">
                Естетична стоматология
              </Link>
              <Link href="/sleep-airway" className="block hover:text-sky-500 transition-colors">
                Сънна апнея
              </Link>
              <Link href="/tmj" className="block hover:text-sky-500 transition-colors">
                TMJ / Челюстни стави
              </Link>
            </div>
          </div>
          
          {/* Cities */}
          <div>
            <h4 className="font-medium text-slate-900 mb-4">Градове</h4>
            <div className="space-y-2.5 text-sm text-slate-500">
              <Link href={`/sofia/${treatmentSlug}`} className="flex items-center gap-2 hover:text-sky-500 transition-colors">
                <MapPin className="w-3.5 h-3.5" />София
              </Link>
              <Link href={`/plovdiv/${treatmentSlug}`} className="flex items-center gap-2 hover:text-sky-500 transition-colors">
                <MapPin className="w-3.5 h-3.5" />Пловдив
              </Link>
              <Link href={`/varna/${treatmentSlug}`} className="flex items-center gap-2 hover:text-sky-500 transition-colors">
                <MapPin className="w-3.5 h-3.5" />Варна
              </Link>
            </div>
          </div>
          
          {/* Info */}
          <div>
            <h4 className="font-medium text-slate-900 mb-4">Информация</h4>
            <div className="space-y-2.5 text-sm text-slate-500">
              <Link href="/privacy" className="flex items-center gap-2 hover:text-sky-500 transition-colors">
                <Shield className="w-3.5 h-3.5" />Поверителност
              </Link>
              <Link href="/terms" className="flex items-center gap-2 hover:text-sky-500 transition-colors">
                <FileText className="w-3.5 h-3.5" />Условия
              </Link>
              <Link href="/contact" className="flex items-center gap-2 hover:text-sky-500 transition-colors">
                <Phone className="w-3.5 h-3.5" />Контакти
              </Link>
            </div>
          </div>
        </div>
        
        <div className="border-t border-slate-200 mt-10 pt-8 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} Zubite.bg. Всички права запазени.
        </div>
      </div>
    </footer>
  )
}
