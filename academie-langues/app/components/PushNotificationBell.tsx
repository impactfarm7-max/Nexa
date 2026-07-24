"use client";

import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { usePushNotifications } from "@/app/hooks/usePushNotifications";

export default function PushNotificationBell() {
  const { status, subscribe, unsubscribe } = usePushNotifications();

  if (status === "unsupported") return null;

  const handleClick = async () => {
    if (status === "subscribed") await unsubscribe();
    else await subscribe();
  };

  const label =
    status === "subscribed" ? "Notifications activées" :
    status === "denied"     ? "Notifications bloquées" :
    status === "loading"    ? "Chargement..." :
                              "Activer les notifications";

  return (
    <button
      onClick={handleClick}
      disabled={status === "loading" || status === "denied"}
      title={label}
      className={`flex items-center gap-3 px-4 py-3 w-full rounded-2xl transition-all duration-200 group
        ${status === "subscribed"
          ? "text-orange-600 bg-orange-50 font-bold"
          : status === "denied"
          ? "text-neutral-300 cursor-not-allowed"
          : "text-neutral-500 font-semibold hover:bg-orange-50 hover:text-orange-600"
        }`}
    >
      {status === "loading" ? (
        <Loader2 size={20} className="animate-spin" />
      ) : status === "subscribed" ? (
        <BellRing size={20} strokeWidth={2.5} className="transition-transform group-hover:scale-110" />
      ) : status === "denied" ? (
        <BellOff size={20} strokeWidth={2} />
      ) : (
        <Bell size={20} strokeWidth={2} className="transition-transform group-hover:scale-110" />
      )}
      <span className="text-sm">{label}</span>

      {status === "subscribed" && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
      )}
    </button>
  );
}
