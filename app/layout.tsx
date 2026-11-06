import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PetrolPumpOS | PGL ERP & Analytics",
  description: "Petrol pump ERP: daily readings, stock, sales and loss alerts for PGL / PARCO Gunvor Limited.",
  applicationName: "PetrolPumpOS",
  appleWebApp: { capable: true, title: "PetrolPump", statusBarStyle: "default" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#071827",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
