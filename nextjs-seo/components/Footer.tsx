import Link from 'next/link'
import { Shield, FileText, Phone } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-slate-800 py-12 bg-[#0f172a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <span className="font-serif text-xl font-semibold text-white">
              Zubite<span className="text-sky-400">.bg</span>
            </span>
            <p className="text-slate-400 text-sm mt-2">Навигатор за дентални решения</p>
          </div>
          <div>
            <h4 className="font-medium text-white mb-3">Лечения</h4>
            <div className="space-y-2 text-sm text-slate-400">
              <Link href="/orthodontics" className="block hover:text-white transition-colors">Ортодонтия</Link>
              <Link href="/implants" className="block hover:text-white transition-colors">Зъбни импланти</Link>
              <Link href="/cosmetic-dentistry" className="block hover:text-white transition-colors">Естетична стоматология</Link>
              <Link href="/sleep-airway" className="block hover:text-white transition-colors">Сънна апнея</Link>
              <Link href="/tmj" className="block hover:text-white transition-colors">TMJ / Челюстни стави</Link>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-white mb-3">Градове</h4>
            <div className="space-y-2 text-sm text-slate-400">
              <Link href="/sofia/orthodontics" className="block hover:text-white transition-colors">София</Link>
              <Link href="/plovdiv/orthodontics" className="block hover:text-white transition-colors">Пловдив</Link>
              <Link href="/varna/orthodontics" className="block hover:text-white transition-colors">Варна</Link>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-white mb-3">Информация</h4>
            <div className="space-y-2 text-sm text-slate-400">
              <Link href="/privacy" className="flex items-center gap-2 hover:text-white transition-colors">
                <Shield className="w-4 h-4" />Поверителност
              </Link>
              <Link href="/terms" className="flex items-center gap-2 hover:text-white transition-colors">
                <FileText className="w-4 h-4" />Условия
              </Link>
              <Link href="/contact" className="flex items-center gap-2 hover:text-white transition-colors">
                <Phone className="w-4 h-4" />Контакти
              </Link>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} Zubite.bg. Всички права запазени.
        </div>
      </div>
    </footer>
  )
}
