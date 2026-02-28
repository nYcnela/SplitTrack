import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { PasswordModal } from '@/components/PasswordModal'
import { Header } from '@/components/Header'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/ThemeProvider'

const inter = Inter({ subsets: ['latin', 'latin-ext'] })

export const metadata: Metadata = {
  title: 'Na Pół - SplitTrack',
  description: 'Prosta aplikacja do rozliczeń 2-osobowych',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen flex flex-col transition-colors duration-500`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="theme-m"
          value={{
            "theme-m": "theme-m",
            "theme-e": "theme-e",
          }}
          enableSystem={false}
        >
          {/* E-theme Background Decal Layer */}
          <div className="fixed inset-0 pointer-events-none -z-50 bg-pattern-e opacity-0 transition-opacity duration-500" />
          
          <Header />

          <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>

          <PasswordModal />
          <Toaster position="bottom-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
