import type { Metadata } from "next";
import { LandingPage } from "@/components/marketing/landing-page";
import { LandingVisitTracker } from "@/components/marketing/landing-visit-tracker";

export const metadata: Metadata = { title: "Welcome" };

export default function WelcomePage() {
  return (
    <>
      <LandingVisitTracker />
      <LandingPage />
    </>
  );
}
