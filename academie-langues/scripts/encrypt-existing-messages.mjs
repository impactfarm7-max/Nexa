// Migration unique : chiffre les messages existants en base (au repos).
//
// ⚠️  AVANT DE LANCER :
//   1. Fais un backup / dump de la base Supabase.
//   2. L'app doit déjà savoir DÉCHIFFRER le format ci-dessous, sinon les
//      messages s'afficheront en "enc:..." (illisibles) après migration.
//   3. MESSAGE_ENC_KEY doit être IDENTIQUE ici et dans l'app.
//
// Idempotent : saute les lignes déjà préfixées "enc:". Rejouable sans risque.
//
// Lancer :
//   node scripts/encrypt-existing-messages.mjs           (migration réelle)
//   node scripts/encrypt-existing-messages.mjs --dry-run (compte seulement)
//
// Variables d'env requises :
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   MESSAGE_ENC_KEY            (32 octets, base64)

import { createClient } from "@supabase/supabase-js";
import {
  isEncrypted,
  infoFor,
  deriveSubkey,
  encryptWithKey,
} from "../app/utils/messageCrypto.core.mjs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MASTER_B64 = process.env.MESSAGE_ENC_KEY;
const DRY_RUN = process.argv.includes("--dry-run");

if (!SUPABASE_URL || !SERVICE_ROLE || !MASTER_B64) {
  console.error(
    "Env manquante. Requis : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MESSAGE_ENC_KEY"
  );
  process.exit(1);
}

const MASTER = Buffer.from(MASTER_B64, "base64");
if (MASTER.length !== 32) {
  console.error(`MESSAGE_ENC_KEY doit faire 32 octets (base64). Obtenu : ${MASTER.length}`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

// Récupère l'ensemble des IDs admin (pour identifier le studentId du support).
async function loadAdminIds() {
  const { data, error } = await supabase.from("profiles").select("id").eq("role", "admin");
  if (error) throw error;
  return new Set((data || []).map((p) => p.id));
}

// Parcourt une table par pages et chiffre les lignes en clair.
async function migrateTable({ table, infoFor: getInfo, pageSize = 500 }) {
  let from = 0;
  let scanned = 0;
  let encrypted = 0;

  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const row of data) {
      scanned++;
      if (isEncrypted(row.message) || row.message == null || row.message === "") continue;
      const info = getInfo(row);
      if (!info) continue; // contexte indéterminé -> on saute (à inspecter)
      const enc = encryptWithKey(row.message, deriveSubkey(MASTER, info));
      if (!DRY_RUN) {
        const { error: upErr } = await supabase
          .from(table)
          .update({ message: enc })
          .eq("id", row.id);
        if (upErr) throw upErr;
      }
      encrypted++;
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  console.log(
    `${table}: ${scanned} ligne(s) lue(s), ${encrypted} chiffrée(s)${DRY_RUN ? " [dry-run]" : ""}`
  );
}

async function main() {
  console.log(DRY_RUN ? "== DRY RUN (aucune écriture) ==" : "== Migration réelle ==");
  const adminIds = await loadAdminIds();

  const studentOf = (row) => {
    // support: student = participant non-admin
    if (!adminIds.has(row.from_user_id)) return row.from_user_id;
    if (!adminIds.has(row.to_user_id)) return row.to_user_id;
    return null;
  };

  await migrateTable({
    table: "community_messages",
    infoFor: (row) => infoFor({ kind: "community", channel: row.channel }),
  });
  await migrateTable({
    table: "private_messages",
    infoFor: (r) => infoFor({ kind: "private", userA: r.from_user_id, userB: r.to_user_id }),
  });
  await migrateTable({
    table: "support_messages",
    infoFor: (r) => {
      const sid = studentOf(r);
      return sid ? infoFor({ kind: "support", studentId: sid }) : null;
    },
  });
  await migrateTable({
    table: "guest_support_messages",
    infoFor: (row) => infoFor({ kind: "guest", token: row.guest_token }),
  });

  console.log("Terminé.");
}

main().catch((e) => {
  console.error("Échec migration :", e);
  process.exit(1);
});
