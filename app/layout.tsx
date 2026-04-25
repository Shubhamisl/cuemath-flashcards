import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Nunito_Sans } from 'next/font/google'
import './globals.css'

const display = Plus_Jakarta_Sans({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
})

const body = Nunito_Sans({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Cuemath Flashcards',
  description: 'SharpMind journey — PDF to atomic flashcards, cognitively tuned.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-full flex flex-col font-body antialiased">
        {children}
      </body>
    </html>
  )
}
