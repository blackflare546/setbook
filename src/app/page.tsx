import { LandingGate } from "@/components/marketing/landing-gate";
import { LandingPage } from "@/components/marketing/landing-page";

export default function Home() {
  return (
    <LandingGate>
      <LandingPage />
    </LandingGate>
  );
}
