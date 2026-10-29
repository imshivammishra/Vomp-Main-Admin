import type { Metadata } from "next";
import ApiLanding from "./landing";

export const metadata: Metadata = {
  title: { absolute: "VenueOnMyPlate API — Simple. Reliable. Connected." },
  description:
    "The VenueOnMyPlate API powers our venue discovery platform, serving curated venue, city, and content data through a fast, consistent interface.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "VenueOnMyPlate API",
    description:
      "Powering the VenueOnMyPlate venue discovery platform with reliable, well-structured data.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "VenueOnMyPlate API",
    description:
      "Powering the VenueOnMyPlate venue discovery platform with reliable, well-structured data.",
  },
};

export default function ApiLandingPage() {
  return <ApiLanding />;
}
