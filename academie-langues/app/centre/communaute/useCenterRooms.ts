"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/app/utils/supabase";

export type CommunityRoom = {
  id: string;
  name: string;
  photo_url: string | null;
  type: string;
  center_id: string | null;
  created_by: string;
  invite_code: string;
  invite_active: boolean;
  expires_at: string | null;
  created_at: string;
  filiere_id: string | null;
  groupe_id: string | null;
  role: string;
};

const TYPE_ORDER: Record<string, number> = { announcement: 0, classroom: 1, study_group: 2 };

export function useCenterRooms(userId: string | null, centerId: string | null) {
  const [rooms, setRooms] = useState<CommunityRoom[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    if (!userId || !centerId) { setRooms([]); setLoading(false); return; }
    setLoading(true);

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single();
    const userRole = profile?.role || "";

    let allRooms: any[] = [];

    if (["admin", "center_manager", "campus_manager", "staff"].includes(userRole)) {
      // Administratifs : toutes les salles du centre (la policy RLS l'autorise)
      const { data } = await supabase
        .from("community_rooms")
        .select("*")
        .eq("center_id", centerId)
        .order("created_at", { ascending: true });
      allRooms = data || [];
    } else {
      // Formateurs : seules les salles autorisées par RLS (la policy filtre automatiquement)
      const { data } = await supabase
        .from("community_rooms")
        .select("*")
        .eq("center_id", centerId)
        .order("created_at", { ascending: true });
      allRooms = data || [];
    }

    // Récupérer le rôle de l'utilisateur dans chaque salle
    const { data: memberships } = await supabase
      .from("community_room_members")
      .select("room_id, role")
      .eq("user_id", userId);

    const memberMap: Record<string, string> = {};
    for (const m of memberships || []) memberMap[m.room_id] = m.role;

    const mapped: CommunityRoom[] = allRooms.map((r: any) => ({
      ...r,
      role: memberMap[r.id] || (["admin", "center_manager"].includes(userRole) ? "owner" : "member"),
    }));

    mapped.sort((a, b) => {
      const ta = TYPE_ORDER[a.type] ?? 3;
      const tb = TYPE_ORDER[b.type] ?? 3;
      if (ta !== tb) return ta - tb;
      return a.name.localeCompare(b.name);
    });

    setRooms(mapped);
    setLoading(false);
  }, [userId, centerId]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const ensureMembership = useCallback(async (roomId: string) => {
    if (!userId) return;
    await supabase.rpc("add_member_if_missing", {
      p_room_id: roomId,
      p_user_id: userId,
      p_role: "owner",
    });
  }, [userId]);

  return { rooms, loading, refetch: fetchRooms, ensureMembership };
}