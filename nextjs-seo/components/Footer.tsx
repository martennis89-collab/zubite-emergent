import Link from 'next/link'
import { Shield, FileText, Phone } from 'lucide-react'

interface FooterProps {
  lang?: 'bg' | 'en'
}

export function Footer({ lang = 'bg' }: FooterProps) {
  const getLocalizedPath = (path: string) => {
    return lang === 'en' ? `/en${path}` : path
  }
  
  const t = {
    tagline: lang === 'en' ? 'Navigator for dental solutions' : 'Навигатор за дентални решения',
    info: lang === 'en' ? 'Information' : 'Информация',
    cities: lang === 'en' ? 'Cities' : 'Градове',
    treatments: lang === 'en' ? 'Treatments' : 'Лечения',
    privacy: lang === 'en' ? 'Privacy' : 'Поверителност',
    terms: lang === 'en' ? 'Terms' : 'Условия',
    contact: lang === 'en' ? 'Contact' : 'Контакти',
    sofia: lang === 'en' ? 'Sofia' : 'София',
    plovdiv: lang === 'en' ? 'Plovdiv' : 'Пловдив',
    varna: lang === 'en' ? 'Varna' : 'Варна',
    orthodontics: lang === 'en' ? 'Orthodontics' : 'Ортодонтия',
    implants: lang === 'en' ? 'Implants' : 'Импланти',
    fullMouth: lang === 'en' ? 'Full Restoration' : 'Пълна реставрация',
    allRights: lang === 'en' ? 'All rights reserved.' : 'Всички права запазени.',
  }
  
  return (
    <footer className="border-t border-slate-800 py-12 bg-[#0f172a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <span className="font-serif text-xl font-semibold text-white">
              Zubite<span className="text-sky-400">.bg</span>
            </span>
            <p className="text-slate-400 text-sm mt-2">{t.tagline}</p>
          </div>
          <div>
            <h4 className="font-medium text-white mb-3">{t.info}</h4>
            <div className="space-y-2 text-sm text-slate-400">
              <Link href={getLocalizedPath('/privacy')} className="flex items-center gap-2 hover:text-white transition-colors">
                <Shield className="w-4 h-4" />{t.privacy}
              </Link>
              <Link href={getLocalizedPath('/terms')} className="flex items-center gap-2 hover:text-white transition-colors">
                <FileText className="w-4 h-4" />{t.terms}
              </Link>
              <Link href={getLocalizedPath('/contact')} className="flex items-center gap-2 hover:text-white transition-colors">
                <Phone className="w-4 h-4" />{t.contact}
              </Link>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-white mb-3">{t.cities}</h4>
            <div className="space-y-2 text-sm text-slate-400">
              <Link href={getLocalizedPath('/city/sofia')} className="block hover:text-white transition-colors">{t.sofia}</Link>
              <Link href={getLocalizedPath('/city/plovdiv')} className="block hover:text-white transition-colors">{t.plovdiv}</Link>
              <Link href={getLocalizedPath('/city/varna')} className="block hover:text-white transition-colors">{t.varna}</Link>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-white mb-3">{t.treatments}</h4>
            <div className="space-y-2 text-sm text-slate-400">
              <Link href={getLocalizedPath('/city/sofia/orthodontics')} className="block hover:text-white transition-colors">{t.orthodontics}</Link>
              <Link href={getLocalizedPath('/city/sofia/implants')} className="block hover:text-white transition-colors">{t.implants}</Link>
              <Link href={getLocalizedPath('/city/sofia/full-mouth')} className="block hover:text-white transition-colors">{t.fullMouth}</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} Zubite.bg. {t.allRights}
        </div>
      </div>
    </footer>
  )
}
