import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "VenueOnMyPlate — Admin Console",
    template: "%s · VenueOnMyPlate Admin",
  },
  description: "Secure admin console for the VenueOnMyPlate venue discovery platform.",
  applicationName: "VenueOnMyPlate Admin",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#9b1239",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
