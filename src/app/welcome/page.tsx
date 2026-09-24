import type { Metadata } from "next";
import { LandingPage } from "@/components/marketing/landing-page";

export const metadata: Metadata = { title: "Welcome" };

export default function WelcomePage() {
  return <LandingPage />;
}
