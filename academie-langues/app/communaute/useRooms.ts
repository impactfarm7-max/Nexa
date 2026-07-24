"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/app/utils/supabase";

export type RoomType = "classroom" | "announcement" | "study_group";
export type RoomRole = "member" | "room_admin" | "owner";

export type CommunityRoom = {
  id: string;
  name: string;
  photo_url: string | null;
  type: RoomType;
  center_id: string | null;
  filiere_id?: string | null;
  groupe_id?: string | null;
  created_by: string;
  invite_code: string;
  invite_active: boolean;
  expires_at: string | null;
  created_at: string;
  role: RoomRole; // rôle DE L'UTILISATEUR COURANT dans cette salle
};

const TYPE_ORDER: Record<RoomType, number> = { announcement: 0, classroom: 1, study_group: 2 };

export function useRooms(userId: string | null) {
  const [rooms, setRooms] = useState<CommunityRoom[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    if (!userId) {
      setRooms([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("community_room_members")
      .select("role, community_rooms(*)")
      .eq("user_id", userId);

    if (!error && data) {
      const mapped: CommunityRoom[] = data
        .filter((r: any) => r.community_rooms)
        .map((r: any) => ({ ...r.community_rooms, role: r.role }));

      mapped.sort((a, b) => {
        if (TYPE_ORDER[a.type] !== TYPE_ORDER[b.type]) return TYPE_ORDER[a.type] - TYPE_ORDER[b.type];
        return a.name.localeCompare(b.name);
      });

      setRooms(mapped);
    } else if (error) {
      console.error("[useRooms] fetch error:", error.message);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Réagit en temps réel si on est ajouté/retiré d'une salle (ex: on vient
  // de rejoindre via un code, ou un room_admin nous a retiré).
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`room_membership_${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "community_room_members", filter: `user_id=eq.${userId}` }, () => {
        fetchRooms();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchRooms]);

  const joinByCode = useCallback(async (inviteCode: string) => {
    const { data, error } = await supabase.rpc("join_room_by_invite_code", { p_invite_code: inviteCode.trim() });
    if (error) throw new Error(error.message);
    await fetchRooms();
    return data as CommunityRoom;
  }, [fetchRooms]);

  const createRoom = useCallback(async (params: {
    name: string;
    type: RoomType;
    centerId?: string | null;
    photoUrl?: string | null;
    expiresAt?: string | null;
  }) => {
    const { data, error } = await supabase.rpc("create_community_room", {
      p_name: params.name,
      p_type: params.type,
      p_center_id: params.centerId ?? null,
      p_photo_url: params.photoUrl ?? null,
      p_expires_at: params.expiresAt ?? null,
    });
    if (error) throw new Error(error.message);
    await fetchRooms();
    return data as CommunityRoom;
  }, [fetchRooms]);

  const regenerateInviteCode = useCallback(async (roomId: string) => {
    const { data, error } = await supabase.rpc("regenerate_invite_code", { p_room_id: roomId });
    if (error) throw new Error(error.message);
    await fetchRooms();
    return data as string;
  }, [fetchRooms]);

  return { rooms, loading, refetch: fetchRooms, joinByCode, createRoom, regenerateInviteCode };
}