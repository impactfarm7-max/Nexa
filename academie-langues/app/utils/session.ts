// utils/session.ts
import { supabase } from "./supabase";
import { clearCenterMeCache } from "./center-me-cache";
import { clearStudentAccessCache } from "./student-access-cache";

export async function logoutAndClearSession(token: string) {
  // Supprimer la session en base
  await supabase
    .from("user_sessions")
    .delete()
    .eq("token", token);

  // Déconnexion Supabase
  await supabase.auth.signOut();

  clearStudentAccessCache();
  clearCenterMeCache();

  // Nettoyer le localStorage
  localStorage.removeItem("last_active_date");
  sessionStorage.removeItem("is_unlocked");
}