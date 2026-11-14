import { Topbar } from "@/components/layout/Topbar";
import { Sidebar } from "@/components/layout/Sidebar";

export default function MissionControlLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <Topbar astronautName="Dr. Sarah Chen" astronautRole="Flight Director" astronautInitials="SC" />
      <Sidebar mode="mission-control" />
      <main className="page-shell">{children}</main>
    </div>
  );
}
