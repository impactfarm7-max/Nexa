import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NEXA — L'éducation de demain | Plaquette",
  description:
    "Automatisez et démultipliez vos capacités de formation. Une plateforme pour piloter, former, évaluer et accompagner à grande échelle.",
  openGraph: {
    title: "NEXA — L'éducation de demain",
    description:
      "La plateforme qui automatise et démultiplie vos capacités de formation.",
    url: "https://nexa-edu.com/presentation",
    siteName: "NEXA",
    locale: "fr_FR",
    type: "website",
  },
};

export default function PresentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
