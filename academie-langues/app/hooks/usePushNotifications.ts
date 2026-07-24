"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/app/utils/supabase";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export type PushStatus = "unsupported" | "denied" | "subscribed" | "unsubscribed" | "loading" | "error";

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }

    navigator.serviceWorker.getRegistration("/")
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setStatus(sub ? "subscribed" : "unsubscribed"))
      .catch(() => setStatus("unsubscribed"));
  }, []);

  /** Obtient ou enregistre le SW, puis attend qu'il soit actif (max 15s). */
  async function getActiveRegistration(): Promise<ServiceWorkerRegistration> {
    // 1. Essayer d'obtenir une registration existante
    let reg = await navigator.serviceWorker.getRegistration("/");

    // 2. Si aucune, enregistrer manuellement
    if (!reg) {
      reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    }

    // 3. Si déjà active, retourner immédiatement
    if (reg.active) return reg;

    // 4. Attendre activation (skipWaiting est dans le SW, ça va vite)
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("SW_TIMEOUT")),
        15000
      );

      const check = () => {
        if (reg!.active) { clearTimeout(timeout); resolve(reg!); }
      };

      const sw = reg!.installing || reg!.waiting;
      if (sw) {
        sw.addEventListener("statechange", check);
      } else {
        reg!.addEventListener("updatefound", () => {
          reg!.installing?.addEventListener("statechange", check);
        });
      }
      check(); // cas où active entre-temps
    });
  }

  const subscribe = async (): Promise<boolean> => {
    try {
      setStatus("loading");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setStatus("denied"); return false; }

      const reg = await getActiveRegistration();

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify(sub.toJSON()),
      });

      if (!res.ok) throw new Error("Échec enregistrement serveur");
      setStatus("subscribed");
      return true;
    } catch (e: any) {
      console.error("push subscribe:", e);
      if (e?.message === "SW_TIMEOUT") {
        setSubscribeError("Le service worker n'est pas prêt. Rechargez la page et réessayez.");
      } else {
        setSubscribeError("Impossible d'activer les notifications. Vérifiez les permissions de votre navigateur.");
      }
      setStatus("error");
      return false;
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    try {
      setStatus("loading");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) { setStatus("unsubscribed"); return true; }

      const endpoint = sub.endpoint;
      await sub.unsubscribe();

      const { data: { session } } = await supabase.auth.getSession();
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ endpoint }),
      });

      setStatus("unsubscribed");
      return true;
    } catch (e) {
      console.error("push unsubscribe:", e);
      setStatus("subscribed");
      return false;
    }
  };

  return { status, subscribe, unsubscribe, subscribeError };
}
