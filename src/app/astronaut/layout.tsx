import { AstronautProvider } from "@/lib/astronaut-context";
import { AstronautShell } from "@/components/layout/AstronautShell";
import { getAstronauts } from "@/lib/db-data";

export default async function AstronautLayout({ children }: { children: React.ReactNode }) {
  const astronauts = await getAstronauts();
  return (
    <AstronautProvider astronauts={astronauts}>
      <AstronautShell>{children}</AstronautShell>
    </AstronautProvider>
  );
}
