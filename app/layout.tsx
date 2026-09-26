import { Analytics } from '@vercel/analytics/next'
import { Noto_Kufi_Arabic } from 'next/font/google'
import type { Metadata, Viewport } from 'next'
import './globals.css'

const arabicFont = Noto_Kufi_Arabic({ subsets: ['arabic'], display: 'swap' })

export const metadata: Metadata = {
  title: 'مصنعي | إدارة الانتاج',
  description: 'واجهة عربية بسيطة لإدارة الأصناف وتسجيل الكميات وسجل البيانات',
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className={`${arabicFont.className} antialiased`}>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
