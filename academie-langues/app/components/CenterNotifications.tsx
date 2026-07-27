"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { usePushNotifications } from "@/app/hooks/usePushNotifications";
import { BLUE } from "@/app/centre/center-page-ui";

type NotificationRow = {
  id: string;
  message: string;
  is_read: boolean | null;
  created_at: string;
};

/**
 * Cloche + liste — sans bandeau toast flottant (évite le re-affichage
 * à chaque remontage / refresh du dashboard).
 * Logique conservée : fetch, realtime INSERT, marquage lu, push opt-in.
 */
export default function CenterNotifications() {
  const { status, subscribe, subscribeError } = usePushNotifications();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      setUserId(session.user.id);

      const { data } = await supabase
        .from("notifications")
        .select("id, message, is_read, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      setNotifications((data || []) as NotificationRow[]);
    };
    void init();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`center_notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const notification = payload.new as NotificationRow;
          setNotifications((current) => [notification, ...current].slice(0, 10));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  const unread = notifications.filter((notification) => !notification.is_read).length;

  const markRead = async () => {
    if (!userId || unread === 0) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .is("is_read", null);
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true })));
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          void markRead();
        }}
        className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-white text-neutral-600 transition-colors hover:bg-[#11224E]/[0.04]"
        style={{ border: `1.5px solid ${BLUE}`, color: BLUE }}
        title="Notifications"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Bell className="h-4 w-4" strokeWidth={2.25} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-black/[0.08] bg-white shadow-lg"
        >
          <div className="border-b border-black/[0.06] p-4">
            <p className="text-[12px] font-extrabold uppercase tracking-wider" style={{ color: BLUE }}>
              Notifications
            </p>
            {(status === "unsubscribed" || status === "error") && (
              <button
                type="button"
                onClick={async () => {
                  await subscribe();
                }}
                className="mt-3 w-full rounded-lg bg-orange-600 px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest text-white hover:bg-orange-500"
              >
                Activer les push du centre
              </button>
            )}
            {subscribeError && <p className="mt-2 text-[12px] font-semibold text-red-500">{subscribeError}</p>}
          </div>
          <div className="max-h-96 overflow-y-auto p-2">
            {notifications.length === 0 ? (
              <p className="p-4 text-[12px] font-medium text-neutral-400">Aucune notification.</p>
            ) : (
              notifications.map((notification) => (
                <div key={notification.id} className="rounded-lg p-3 hover:bg-[#11224E]/[0.03]">
                  <p className="text-[14px] font-semibold text-neutral-800">{notification.message}</p>
                  <p className="mt-1 text-[12px] font-medium text-neutral-400">
                    {new Date(notification.created_at).toLocaleString("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
