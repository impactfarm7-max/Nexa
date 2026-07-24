"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/app/utils/supabase";

type FormationContextType = {
  formation: string;
  refreshFormation: () => Promise<void>;
};

const FormationContext = createContext<FormationContextType>({
  formation: "tcf",
  refreshFormation: async () => {},
});

export function FormationProvider({ children }: { children: React.ReactNode }) {
  const [formation, setFormation] = useState("tcf");

  const refreshFormation = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase
      .from("profiles")
      .select("formation")
      .eq("id", session.user.id)
      .single();
    if (data?.formation) setFormation(data.formation);
  }, []);

  useEffect(() => {
    refreshFormation();

    // Realtime: update instantly when formation changes in DB (with fallback polling)
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let pollInterval: NodeJS.Timeout | null = null;
    let isSubscribed = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || !isSubscribed) return;

      const setupFormationListener = () => {
        channel = supabase
          .channel("formation-watch")
          .on("postgres_changes", {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${session.user.id}`,
          }, (payload) => {
            if (payload.new?.formation) setFormation(payload.new.formation);
          })
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              if (pollInterval) clearInterval(pollInterval);
              pollInterval = null;
            } else if (status === "CHANNEL_ERROR" || status === "CLOSED") {
              if (!pollInterval && isSubscribed) {
                pollInterval = setInterval(() => refreshFormation(), 10000);
              }
            }
          });
      };

      setupFormationListener();
    });

    return () => {
      isSubscribed = false;
      if (channel) supabase.removeChannel(channel);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [refreshFormation]);

  return (
    <FormationContext.Provider value={{ formation, refreshFormation }}>
      {children}
    </FormationContext.Provider>
  );
}

export function useFormation() {
  return useContext(FormationContext);
}
