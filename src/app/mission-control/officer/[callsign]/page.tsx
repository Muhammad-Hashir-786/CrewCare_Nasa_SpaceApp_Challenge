import { redirect } from "next/navigation";

export default function LegacyOfficerPasswordRoute() {
  redirect("/mission-control/login");
}
