
export const metadata = { title: 'relevel.me · Artha', description: 'Isekai worldboard' }
import './globals.css'
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
