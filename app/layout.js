import './globals.css';

export const metadata = {
  title: 'AI Benchmark Analyzer',
  description: 'Unified real-time benchmarking dashboard for comparing LLM model performance across providers.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
