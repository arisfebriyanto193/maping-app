import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aerial Mission Planner - DJI & Drone Waypoint Mapping',
  description: 'Aplikasi web pembuatan jalur mapping drone DJI Mini 4 Pro, Mini 5 Pro, Air 3, Mavic 3, Lito X1 dengan peta satelit gratis, undo titik, dan ekspor KMZ/CSV.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ffffff',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      <body className="antialiased bg-slate-50 text-slate-900 min-h-screen overflow-hidden flex flex-col">
        {children}
      </body>
    </html>
  );
}
