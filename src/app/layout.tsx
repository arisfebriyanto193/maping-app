import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DJI & Drone Waypoint Mission Planner',
  description: 'Aplikasi web pembuatan jalur mapping drone DJI Mini 4 Pro, Mavic, Air, Litchi / Lito x1 dengan Google Satelit, kalkulator GSD, dan ekspor KMZ/CSV.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0f172a',
};

export default function RootLayout({
  children,
}: ReadencodedRootLayoutProps<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="antialiased bg-slate-950 text-slate-100 min-h-screen overflow-hidden flex flex-col">
        {children}
      </body>
    </html>
  );
}

type ReadencodedRootLayoutProps<T> = T;
