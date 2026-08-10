"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { useI18n } from "@/app/i18n/I18nProvider";

const STORAGE_KEY = "nexa_community_bubble_pos";
const SIZE = 56; // w-14
const MARGIN = 8;
const DRAG_THRESHOLD = 6;

type Pos = { x: number; y: number };

function defaultPos(): Pos {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  const isMd = window.matchMedia("(min-width: 768px)").matches;
  return {
    x: window.innerWidth - SIZE - (isMd ? 24 : 20),
    y: window.innerHeight - SIZE - (isMd ? 24 : 80),
  };
}

function clampPos(pos: Pos): Pos {
  if (typeof window === "undefined") return pos;
  const maxX = Math.max(MARGIN, window.innerWidth - SIZE - MARGIN);
  const maxY = Math.max(MARGIN, window.innerHeight - SIZE - MARGIN);
  return {
    x: Math.min(maxX, Math.max(MARGIN, pos.x)),
    y: Math.min(maxY, Math.max(MARGIN, pos.y)),
  };
}

function readStoredPos(): Pos | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Pos;
    if (typeof parsed?.x !== "number" || typeof parsed?.y !== "number") return null;
    return clampPos(parsed);
  } catch {
    return null;
  }
}

export default function CommunityBubble() {
  const { t } = useI18n();
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [pos, setPos] = useState<Pos | null>(null);
  const [dragging, setDragging] = useState(false);

  const posRef = useRef<Pos>({ x: 0, y: 0 });
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    const next = readStoredPos() ?? defaultPos();
    posRef.current = next;
    setPos(next);
  }, []);

  useEffect(() => {
    if (!pos) return;
    posRef.current = pos;
  }, [pos]);

  useEffect(() => {
    const onResize = () => {
      setPos((current) => {
        if (!current) return current;
        const next = clampPos(current);
        posRef.current = next;
        return next;
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let userId: string | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const fetchUnread = async (uid: string) => {
      const { count } = await supabase
        .from("private_messages")
        .select("id", { count: "exact", head: true })
        .eq("to_user_id", uid)
        .is("read_at", null);
      setUnread(count || 0);
    };

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      userId = session.user.id;
      await fetchUnread(userId);

      channel = supabase
        .channel("bubble_pm_" + userId)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "private_messages",
            filter: `to_user_id=eq.${userId}`,
          },
          () => setUnread((n) => n + 1),
        )
        .subscribe();
    };

    void init();

    const onFocus = () => {
      if (userId) void fetchUnread(userId);
    };
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const persistPos = useCallback((next: Pos) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || !pos) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: posRef.current.x,
      originY: posRef.current.y,
      moved: false,
    };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

    drag.moved = true;
    const next = clampPos({
      x: drag.originX + dx,
      y: drag.originY + dy,
    });
    posRef.current = next;
    setPos(next);
  };

  const endDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const wasDrag = drag.moved;
    dragRef.current = null;
    setDragging(false);

    if (wasDrag) {
      persistPos(posRef.current);
      return;
    }

    router.push("/communaute");
  };

  // Évite le mismatch SSR/client : on ne monte le bouton qu'après calcul de position.
  if (!pos) return null;

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      aria-label={t("dashboard", "communauteBubbleOpen")}
      title={t("dashboard", "communauteBubbleDrag")}
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        touchAction: "none",
        cursor: dragging ? "grabbing" : "grab",
      }}
      className={`fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/30 transition-[box-shadow,background-color,transform] hover:bg-orange-600 select-none ${
        dragging ? "scale-105 shadow-xl" : "active:scale-95"
      }`}
    >
      <Users size={24} className="pointer-events-none" />
      {unread > 0 ? (
        <span className="pointer-events-none absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-black text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : (
        <span className="pointer-events-none absolute -top-1 -right-1 h-3.5 w-3.5 animate-pulse rounded-full border-2 border-white bg-emerald-500" />
      )}
    </button>
  );
}
