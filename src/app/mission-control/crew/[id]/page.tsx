import { notFound } from "next/navigation";
import { DEMO_ASTRONAUTS } from "@/lib/demo-data";
import { CrewMemberOverview } from "@/components/mission-control/CrewMemberOverview";

export default async function CrewMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const astronaut = DEMO_ASTRONAUTS.find((member) => member.id === id);
  if (!astronaut) notFound();
  return <CrewMemberOverview astronaut={astronaut} />;
}
