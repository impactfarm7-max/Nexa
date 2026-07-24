import { redirect } from "next/navigation";

/** Ancienne route — redirige vers la nouvelle UI unifiée dans app/dashboard. */
export default function LegacyCenterStudentDashboard() {
  redirect("/dashboard");
}
