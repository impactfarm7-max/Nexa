"use client";

import { supabase } from "./supabase";

type ActivityMetadata = Record<string, string | number | boolean | null | undefined>;

export function logClientActivity(
  action: string,
  details?: string,
  metadata?: ActivityMetadata,
) {
  void (async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) return;

      await fetch("/api/activity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action, details, metadata }),
      });
    } catch {
      // Le journal d'activite ne doit jamais bloquer l'utilisateur.
    }
  })();
}
