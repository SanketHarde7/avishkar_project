import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AirAware — Continuous Air Quality Intelligence',
  description:
    'Physics-informed air quality estimation for unmonitored urban areas, fusing sparse ground sensors with meteorology and an advection–diffusion model.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="bg-background text-text-primary antialiased overflow-hidden min-h-screen">
        {children}
      </body>
    </html>
  );
}
