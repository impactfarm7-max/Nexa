import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    const { data } = await supabase
      .from("user_sessions")
      .select("id")
      .eq("token", token)
      .single();

    return NextResponse.json({ valid: !!data });
  } catch {
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
