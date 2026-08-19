"use client";

import { createContext, useContext } from "react";

/**
 * Données brutes de /api/superadmin/centers, chargées une seule fois par
 * app/superadmin/layout.tsx et partagées à toutes les pages superadmin via
 * ce contexte — évite que chaque page (dashboard, centres, commercial,
 * alertes, effectifs, finance…) ne refasse le même fetch coûteux au montage.
 */
export type SuperadminCentersContextValue = {
  centers: any[];
  loading: boolean;
  error: string | null;
  /** Force un rechargement (à appeler après une mutation : activer, rejeter, marquer payé…). */
  refresh: () => Promise<void>;
};

export const SuperadminCentersContext = createContext<SuperadminCentersContextValue | null>(null);

/** À utiliser dans les pages sous /superadmin (pas dans layout.tsx lui-même, qui détient déjà les données). */
export function useSuperadminCenters<T = any>(): {
  centers: T[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const ctx = useContext(SuperadminCentersContext);
  if (!ctx) {
    throw new Error("useSuperadminCenters doit être utilisé sous SuperadminLayout.");
  }
  return ctx;
}
