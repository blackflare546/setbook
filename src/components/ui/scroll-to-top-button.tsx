"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const SHOW_AFTER_PX = 96;

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setVisible(window.scrollY >= SHOW_AFTER_PX);
    window.addEventListener("scroll", updateVisibility, { passive: true });
    const frame = window.requestAnimationFrame(updateVisibility);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateVisibility);
    };
  }, []);

  if (!visible) return null;

  return (
    <Button
      type="button"
      size="icon"
      variant="secondary"
      className="fixed bottom-24 right-4 z-20 h-11 w-11 rounded-full shadow-lg sm:right-6 lg:bottom-6 lg:right-8"
      aria-label="Back to top"
      title="Back to top"
      onClick={() => {
        const reduceMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: reduceMotion ? "auto" : "smooth",
        });
      }}
    >
      <ArrowUp size={19} aria-hidden="true" />
    </Button>
  );
}
