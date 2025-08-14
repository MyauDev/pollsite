export const metadata = { title: 'Polls App', description: 'Stage 0 scaffold' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{fontFamily:'system-ui, sans-serif', padding:16}}>{children}</body>
    </html>
  );
}