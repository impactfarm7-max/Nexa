import type { SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_DOC_UI_KEY = "document";
export const DEFAULT_DOC_DB_TYPE = "bulletin";

const BLUE = "#11224E";
const BLUE_RGB: [number, number, number] = [17, 34, 78];

export type DocumentExportConfig = {
  title: string;
  accentColor: string;
  accentRgb: [number, number, number];
  blueRgb: [number, number, number];
  showLogo: boolean;
  showRccm: boolean;
  showNiu: boolean;
  showAddress: boolean;
  showPhone: boolean;
  footerText: string | null;
  signatureIds: string[];
  legalName: string | null;
  logoUrl: string | null;
  rccmNumber: string | null;
  niuNumber: string | null;
  address: string | null;
  phone: string | null;
};

export function legacyDocKey(key: string): string {
  return key === DEFAULT_DOC_UI_KEY ? DEFAULT_DOC_DB_TYPE : key;
}

export function hexToRgb(hex: string, fallback: [number, number, number] = BLUE_RGB): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
  if (!m) return fallback;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

const defaultConfig = (): DocumentExportConfig => ({
  title: "Document officiel",
  accentColor: BLUE,
  accentRgb: BLUE_RGB,
  blueRgb: BLUE_RGB,
  showLogo: true,
  showRccm: true,
  showNiu: true,
  showAddress: true,
  showPhone: true,
  footerText: null,
  signatureIds: [],
  legalName: null,
  logoUrl: null,
  rccmNumber: null,
  niuNumber: null,
  address: null,
  phone: null,
});

type DocumentTitleRow = {
  document_type: string;
  title?: string | null;
  accent_color?: string | null;
  show_logo?: boolean | null;
  show_rccm?: boolean | null;
  show_niu?: boolean | null;
  show_address?: boolean | null;
  show_phone?: boolean | null;
  footer_text?: string | null;
  signature_ids?: string[] | null;
};

function findDocumentTitleRow(
  docRows: DocumentTitleRow[] | null | undefined,
  uiKey: string
): DocumentTitleRow | undefined {
  const dbType = legacyDocKey(uiKey);
  return (docRows || []).find(
    (r) => r.document_type === dbType || r.document_type === uiKey
  );
}

export async function fetchDocumentExportConfig(
  supabase: SupabaseClient,
  centerId: string,
  options?: { documentType?: string }
): Promise<DocumentExportConfig> {
  const [{ data: branding }, { data: docRows }] = await Promise.all([
    supabase.from("center_branding").select("*").eq("center_id", centerId).maybeSingle(),
    supabase.from("document_titles").select("*").eq("center_id", centerId),
  ]);

  const preferredKey = options?.documentType?.trim();
  let row = preferredKey ? findDocumentTitleRow(docRows, preferredKey) : null;
  if (!row) {
    const uiKey = branding?.default_document_type || DEFAULT_DOC_UI_KEY;
    row = findDocumentTitleRow(docRows, uiKey);
  }

  const base = defaultConfig();
  const accentColor = row?.accent_color || base.accentColor;

  return {
    title: row?.title?.trim() || base.title,
    accentColor,
    accentRgb: hexToRgb(accentColor, BLUE_RGB),
    blueRgb: BLUE_RGB,
    showLogo: row?.show_logo ?? base.showLogo,
    showRccm: row?.show_rccm ?? base.showRccm,
    showNiu: row?.show_niu ?? base.showNiu,
    showAddress: row?.show_address ?? base.showAddress,
    showPhone: row?.show_phone ?? base.showPhone,
    footerText: row?.footer_text?.trim() || null,
    signatureIds: row?.signature_ids || [],
    legalName: branding?.legal_name || null,
    logoUrl: branding?.logo_url || null,
    rccmNumber: branding?.rccm_number || null,
    niuNumber: branding?.niu_number || null,
    address: branding?.address || branding?.siege_address || null,
    phone: branding?.phone || branding?.siege_phone || null,
  };
}

export type SignatureRow = { id: string; label: string; signatureUrl?: string | null };

export function filterSignatures(
  all: Array<{ id: string; name?: string | null; title?: string | null; label?: string | null; signature_url?: string | null }>,
  signatureIds: string[]
): SignatureRow[] {
  const picked = signatureIds.length > 0 ? all.filter((s) => signatureIds.includes(s.id)) : all;
  return picked.map((s) => ({
    id: s.id,
    label: s.label || [s.name, s.title].filter(Boolean).join(" · ") || "Signataire",
    signatureUrl: s.signature_url ?? null,
  }));
}

/** Pied de page : mentions configurées + agent d'encaissement (recorded_by), pas le lecteur. */
export function buildDocumentFooterLines(opts: {
  footerText?: string | null;
  billingAgentName?: string | null;
}): string[] {
  const lines: string[] = [];
  const custom = opts.footerText?.trim();
  if (custom) lines.push(custom);
  if (opts.billingAgentName?.trim()) {
    lines.push(`Encaissé par ${opts.billingAgentName.trim()}`);
  }
  return lines;
}
