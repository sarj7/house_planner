import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HousePlanner",
  description: "Find amenities near your location",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/KFCR8CZ6vUslI5FkI="
          crossOrigin=""
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
