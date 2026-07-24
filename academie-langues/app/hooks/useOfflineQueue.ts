"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/app/utils/supabase";
import { useOnlineStatus } from "./useOnlineStatus";

const QUEUE_KEY = "iag_offline_queue";
const MAX_RETRIES = 3;

export type QueuedAction = {
  id: string;
  type: string;
  payload: any;
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  createdAt: number;
  retries: number;
  failed?: boolean;
};

function readQueue(): QueuedAction[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeQueue(q: QueuedAction[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

async function replayAction(action: QueuedAction): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const freshHeaders = {
      ...action.headers,
      Authorization: `Bearer ${session.access_token}`,
    };

    const res = await fetch(action.endpoint, {
      method: action.method,
      headers: freshHeaders,
      body: action.payload ? JSON.stringify(action.payload) : undefined,
    });

    return res.ok;
  } catch {
    return false;
  }
}

export function useOfflineQueue() {
  const { isOnline } = useOnlineStatus();
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    setQueue(readQueue());
  }, []);

  const addToQueue = useCallback(
    (action: Omit<QueuedAction, "id" | "createdAt" | "retries">) => {
      const newAction: QueuedAction = {
        ...action,
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: Date.now(),
        retries: 0,
      };
      setQueue((prev) => {
        const next = [...prev, newAction];
        writeQueue(next);
        return next;
      });
    },
    []
  );

  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => {
      const next = prev.filter((a) => a.id !== id);
      writeQueue(next);
      return next;
    });
  }, []);

  const syncNow = useCallback(async () => {
    if (isSyncingRef.current) return;

    const currentQueue = readQueue();
    const pending = currentQueue.filter((a) => !a.failed);
    if (pending.length === 0) return;

    isSyncingRef.current = true;
    setIsSyncing(true);

    const updatedQueue = [...currentQueue];

    for (const action of pending) {
      const idx = updatedQueue.findIndex((a) => a.id === action.id);
      const success = await replayAction(action);

      if (success) {
        updatedQueue.splice(idx, 1);
      } else {
        updatedQueue[idx] = {
          ...updatedQueue[idx],
          retries: updatedQueue[idx].retries + 1,
          failed: updatedQueue[idx].retries + 1 >= MAX_RETRIES,
        };
      }
    }

    writeQueue(updatedQueue);
    setQueue(updatedQueue);
    isSyncingRef.current = false;
    setIsSyncing(false);
  }, []);

  useEffect(() => {
    if (isOnline) {
      syncNow();
    }
  }, [isOnline, syncNow]);

  const pendingCount = queue.filter((a) => !a.failed).length;
  const failedCount = queue.filter((a) => a.failed).length;

  return {
    queue,
    addToQueue,
    removeFromQueue,
    pendingCount,
    failedCount,
    isSyncing,
    syncNow,
  };
}
