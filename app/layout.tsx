import "./globals.css"

export const metadata = {
  title: 'MediPredict',
  description: 'AI-powered disease prediction and health insights',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
