"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, X } from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { usePushNotifications } from "@/app/hooks/usePushNotifications";

type NotificationRow = {
  id: string;
  message: string;
  is_read: boolean | null;
  created_at: string;
};

export default function CenterNotifications() {
  const { status, subscribe, subscribeError } = usePushNotifications();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeNotification, setActiveNotification] = useState<NotificationRow | null>(null);

  useEffect(() => {
    const until = Number(localStorage.getItem("center_push_banner_dismissed_until") || "0");
    setDismissed(Date.now() < until);
  }, []);

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
      const latestUnread = (data || []).find((notification) => !notification.is_read);
      if (latestUnread) setActiveNotification(latestUnread as NotificationRow);
    };
    init();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`center_notifications:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
        const notification = payload.new as NotificationRow;
        setNotifications((current) => [notification, ...current].slice(0, 10));
        setActiveNotification(notification);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  useEffect(() => {
    if (!activeNotification) return;
    const timeout = window.setTimeout(() => setActiveNotification(null), 7000);
    return () => window.clearTimeout(timeout);
  }, [activeNotification?.id]);

  const unread = notifications.filter((notification) => !notification.is_read).length;
  const showBanner = !dismissed && (status === "unsubscribed" || status === "error");

  const dismissBanner = () => {
    localStorage.setItem("center_push_banner_dismissed_until", String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    setDismissed(true);
  };

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
    <>
      {activeNotification && (
        <div className="fixed left-4 right-4 top-4 z-[60] mx-auto max-w-xl">
          <div className="overflow-hidden rounded-3xl text-white shadow-2xl shadow-[#11224E]/40 ring-1 ring-orange-500/30" style={{ backgroundColor: "#11224E" }}>
            <div className="flex items-start gap-4 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-600 shadow-lg shadow-orange-600/30">
                <BellRing className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-300">Notification du centre</p>
                <p className="mt-1 text-sm font-bold leading-snug text-white">{activeNotification.message}</p>
                <p className="mt-1 text-[10px] font-semibold text-white/55">
                  {new Date(activeNotification.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                </p>
              </div>
              <button onClick={() => setActiveNotification(null)} className="rounded-xl p-2 text-white/60 hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="h-0.5 bg-gradient-to-r from-orange-600 via-amber-400 to-orange-600" />
          </div>
        </div>
      )}

      {showBanner && (
        <div className="fixed left-4 right-4 top-4 z-50 mx-auto max-w-3xl rounded-3xl border border-orange-400/30 p-4 text-white shadow-2xl shadow-[#11224E]/30" style={{ backgroundColor: "#11224E" }}>
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-600">
              <BellRing className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black">Notifications du centre</p>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-white/70">
                Recevez les missions, messages, coaching et rappels envoyes par votre centre.
              </p>
              {subscribeError && <p className="mt-2 text-xs font-bold text-red-300">{subscribeError}</p>}
              <button
                onClick={async () => {
                  const ok = await subscribe();
                  if (ok) setDismissed(true);
                }}
                className="mt-3 rounded-xl bg-orange-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-orange-500"
              >
                Activer
              </button>
            </div>
            <button onClick={dismissBanner} className="rounded-xl p-2 text-white/60 hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="relative">
        <button
          onClick={() => {
            setOpen((value) => !value);
            void markRead();
          }}
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 shadow-sm hover:bg-neutral-50 sm:h-12 sm:w-12"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-14 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl">
            <div className="border-b border-neutral-100 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-neutral-900">Notifications</p>
              {(status === "unsubscribed" || status === "error") && (
                <button
                  onClick={async () => { await subscribe(); }}
                  className="mt-3 w-full rounded-xl bg-orange-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-orange-500"
                >
                  Activer les push du centre
                </button>
              )}
              {subscribeError && <p className="mt-2 text-xs font-bold text-red-500">{subscribeError}</p>}
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {notifications.length === 0 ? (
                <p className="p-4 text-sm font-semibold text-neutral-400">Aucune notification.</p>
              ) : (
                notifications.map((notification) => (
                  <div key={notification.id} className="rounded-2xl p-3 hover:bg-orange-50">
                    <p className="text-sm font-bold text-neutral-800">{notification.message}</p>
                    <p className="mt-1 text-[10px] font-semibold text-neutral-400">
                      {new Date(notification.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
