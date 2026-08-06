"use client";

import { useState, useEffect, useRef } from "react";
import { WifiOff, Wifi, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useOnlineStatus } from "@/app/hooks/useOnlineStatus";
import { useOfflineQueue } from "@/app/hooks/useOfflineQueue";
import { useI18n } from "@/app/i18n/I18nProvider";

export default function OfflineBanner() {
  const { t } = useI18n();
  const { isOnline } = useOnlineStatus();
  const { pendingCount, isSyncing } = useOfflineQueue();
  const [justReconnected, setJustReconnected] = useState(false);
  const [syncedCount, setSyncedCount] = useState(0);
  const prevPendingRef = useRef(0);

  useEffect(() => {
    if (isOnline && prevPendingRef.current > 0 && pendingCount === 0 && !isSyncing) {
      setSyncedCount(prevPendingRef.current);
      setJustReconnected(true);
      setTimeout(() => setJustReconnected(false), 4000);
    }
    prevPendingRef.current = pendingCount;
  }, [isOnline, pendingCount, isSyncing]);

  const offlineMessage = pendingCount > 0
    ? t("common", "offlinePending", { count: pendingCount })
    : t("common", "offlineMode");

  const reconnectMessage = syncedCount > 0
    ? t("common", "networkRestoredSynced", { count: syncedCount })
    : t("common", "networkRestored");

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -50 }} animate={{ y: 0 }} exit={{ y: -50 }}
          className="fixed top-0 left-0 w-full z-[99999] bg-red-500 text-white py-2 px-4 shadow-lg flex items-center justify-center gap-2"
        >
          <WifiOff size={16} className="animate-pulse" />
          <p className="text-xs font-bold tracking-widest uppercase">{offlineMessage}</p>
        </motion.div>
      )}

      {justReconnected && (
        <motion.div
          initial={{ y: -50 }} animate={{ y: 0 }} exit={{ opacity: 0 }}
          className="fixed top-0 left-0 w-full z-[99999] bg-emerald-500 text-white py-2 px-4 shadow-lg flex items-center justify-center gap-2"
        >
          <Wifi size={16} />
          <p className="text-xs font-bold tracking-widest uppercase">{reconnectMessage}</p>
        </motion.div>
      )}

      {isSyncing && isOnline && (
        <motion.div
          initial={{ y: -50 }} animate={{ y: 0 }} exit={{ opacity: 0 }}
          className="fixed top-0 left-0 w-full z-[99999] bg-amber-500 text-white py-2 px-4 shadow-lg flex items-center justify-center gap-2"
        >
          <Clock size={16} className="animate-spin" />
          <p className="text-xs font-bold tracking-widest uppercase">{t("common", "syncing")}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
