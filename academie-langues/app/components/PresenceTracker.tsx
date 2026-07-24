"use client";

import { useEffect } from "react";
import { supabase } from "@/app/utils/supabase";

/**
 * Composant silencieux monté dans le ClientLayout.
 * Rejoint le canal Supabase Presence "online-users" pour que l'admin
 * puisse voir en temps réel combien d'utilisateurs sont sur la plateforme.
 */
export default function PresenceTracker() {
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let retryTimer: NodeJS.Timeout | null = null;
    let isSubscribed = true;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !isSubscribed) return;

      channel = supabase.channel("online-users", {
        config: { presence: { key: session.user.id } },
      });

      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel!.track({ user_id: session.user.id });
        } else if (status === "CHANNEL_ERROR" || status === "CLOSED") {
          console.warn("Presence tracker connection failed, retrying...");
          if (retryTimer) clearTimeout(retryTimer);
          retryTimer = setTimeout(() => {
            if (isSubscribed) init();
          }, 5000);
        }
      });
    };

    init();

    return () => {
      isSubscribed = false;
      if (retryTimer) clearTimeout(retryTimer);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return null;
}
