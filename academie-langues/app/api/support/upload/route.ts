import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export async function POST(req: Request) {
  const formData = await req.formData();
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

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { data: bucket } = await supabaseAdmin.storage.getBucket("support-attachments");
  if (!bucket) {
    const { error: createError } = await supabaseAdmin.storage.createBucket("support-attachments", {
      public: true,
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

  const { data } = supabaseAdmin.storage.from("support-attachments").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path });
}
