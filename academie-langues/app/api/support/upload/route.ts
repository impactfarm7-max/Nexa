import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { consumeFixedWindow } from "@/app/utils/fixed-window-rate-limit";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};
const GUEST_TOKEN_RE = /^[a-f0-9-]{36}$/i;

function hasValidImageSignature(bytes: Buffer, type: string) {
  if (type === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/gif") return ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("ascii"));
  if (type === "image/webp") return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  const formData = await req.formData();
  const guestToken = String(formData.get("guestToken") || "").trim();
  if (!user && !GUEST_TOKEN_RE.test(guestToken)) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }
  const actorKey = user ? `user:${user.id}` : `guest:${guestToken}`;
  const rate = await consumeFixedWindow(`support-upload:${actorKey}`, 10, 60 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Trop de fichiers envoyes. Reessayez plus tard." }, { status: 429 });
  }
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Image manquante" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Format image non supporte" }, { status: 400 });
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return NextResponse.json({ error: "Image trop lourde (max 5 Mo)" }, { status: 400 });
  }

  const ext = EXTENSION_BY_TYPE[file.type];
  const ownerPath = user ? `users/${user.id}` : `guests/${guestToken}`;
  const path = `${ownerPath}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!hasValidImageSignature(bytes, file.type)) {
    return NextResponse.json({ error: "Le contenu du fichier ne correspond pas au format annonce" }, { status: 400 });
  }

  const { data: bucket } = await supabaseAdmin.storage.getBucket("support-attachments");
  if (!bucket) {
    const { error: createError } = await supabaseAdmin.storage.createBucket("support-attachments", {
      public: false,
    });
    if (createError) return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  const { error } = await supabaseAdmin.storage
    .from("support-attachments")
    .upload(path, bytes, {
      contentType: file.type,
      upsert: false,
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: uploadedFile, error: verifyError } = await supabaseAdmin.storage
    .from("support-attachments")
    .download(path);

  if (verifyError || !uploadedFile) {
    return NextResponse.json({
      error: verifyError?.message || "Upload non verifie dans le bucket support-attachments",
    }, { status: 500 });
  }

  const { data: signed, error: signedError } = await supabaseAdmin.storage
    .from("support-attachments")
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signedError || !signed?.signedUrl) {
    return NextResponse.json({ error: "Impossible de securiser le lien du fichier" }, { status: 500 });
  }
  return NextResponse.json({ url: signed.signedUrl, path });
}
