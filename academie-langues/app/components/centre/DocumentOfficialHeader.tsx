"use client";

import type { ReactNode } from "react";
import type { DocumentExportConfig } from "@/app/utils/documentConfig";

const BLUE = "#11224E";
const ORANGE = "#eb670e";

type Props = {
  config: DocumentExportConfig | null | undefined;
  /** Nom du centre si legalName absent */
  fallbackName?: string;
  /** Titre document si config.title absent */
  fallbackTitle?: string;
  /** Contenu additionnel sous les mentions (n° reçu, date, etc.) */
  rightExtra?: ReactNode;
  /** Masquer adresse / téléphone / RCCM / NIU (ex. ticket) */
  hideMeta?: boolean;
  /** Taille logo en px (défaut 64) */
  logoSize?: number;
  /** Classes sur le conteneur */
  className?: string;
  /** Classes sur le bloc méta droite */
  metaClassName?: string;
  /** Taille du nom du centre */
  nameClassName?: string;
  /** Taille du titre document */
  titleClassName?: string;
};

/**
 * En-tête officiel partagé : logo + raison sociale + titre document à gauche,
 * mentions centre (adresse, tél, RCCM, NIU) à droite — respectant document_titles / branding.
 */
export default function DocumentOfficialHeader({
  config,
  fallbackName = "Établissement",
  fallbackTitle = "Document officiel",
  rightExtra,
  hideMeta = false,
  logoSize = 64,
  className = "",
  metaClassName = "",
  nameClassName = "text-base sm:text-lg",
  titleClassName = "text-[10px] sm:text-[11px]",
}: Props) {
  const accent = config?.accentColor || ORANGE;
  const name = config?.legalName?.trim() || fallbackName;
  const title = config?.title?.trim() || fallbackTitle;
  const logoUrl = config?.logoUrl || null;
  const showLogo = config?.showLogo !== false && !!logoUrl;

  const showAddress = !hideMeta && config?.showAddress !== false && !!config?.address;
  const showPhone = !hideMeta && config?.showPhone !== false && !!config?.phone;
  const showRccm = !hideMeta && config?.showRccm !== false && !!config?.rccmNumber;
  const showNiu = !hideMeta && config?.showNiu !== false && !!config?.niuNumber;
  const hasMeta = showAddress || showPhone || showRccm || showNiu || !!rightExtra;

  return (
    <div
      className={`flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 border-b-2 pb-4 sm:pb-5 mb-5 sm:mb-6 ${className}`}
      style={{ borderColor: accent }}
    >
      <div className="flex items-center gap-3 min-w-0">
        {showLogo && (
          <img
            src={logoUrl!}
            alt=""
            className="rounded-xl object-cover shrink-0"
            style={{ width: logoSize, height: logoSize }}
          />
        )}
        <div className="min-w-0">
          <h1
            className={`font-extrabold uppercase tracking-tight leading-tight break-words ${nameClassName}`}
            style={{ color: BLUE }}
          >
            {name}
          </h1>
          <p
            className={`font-bold uppercase tracking-wider mt-0.5 ${titleClassName}`}
            style={{ color: accent }}
          >
            {title}
          </p>
        </div>
      </div>

      {hasMeta && (
        <div
          className={`sm:text-right text-[10px] text-neutral-500 font-medium space-y-0.5 break-words ${metaClassName}`}
        >
          {showAddress && <p>{config!.address}</p>}
          {showPhone && <p>Tél : {config!.phone}</p>}
          {showRccm && <p>RCCM : {config!.rccmNumber}</p>}
          {showNiu && <p>NIU : {config!.niuNumber}</p>}
          {rightExtra}
        </div>
      )}
    </div>
  );
}
