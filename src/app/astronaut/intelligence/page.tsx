"use client";

import { AstronautUltimateReview } from "@/components/ai/AstronautUltimateReview";
import { useAstronaut } from "@/lib/astronaut-context";

export default function AstronautIntelligencePage() {
  const { astronaut } = useAstronaut();
  return <AstronautUltimateReview astronaut={astronaut} />;
}
