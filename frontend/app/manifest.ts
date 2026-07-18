import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Zubite.bg — дентален ориентир',
    short_name: 'Zubite.bg',
    description: 'Проверена информация, прозрачни критерии и подходящи дентални клиники.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f4f2',
    theme_color: '#f5f4f2',
    lang: 'bg',
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  }
}
