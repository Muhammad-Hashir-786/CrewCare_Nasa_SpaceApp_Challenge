"use client";

import { AIIntelligencePanel } from "@/components/ai/AIIntelligencePanel";
import { useAstronaut } from "@/lib/astronaut-context";

export default function AstronautIntelligencePage() {
  const { astronaut } = useAstronaut();
  return <AIIntelligencePanel scope="astronaut" astronautId={astronaut.id} />;
}
