import { createClient } from "@supabase/supabase-js";
import { CertificatNotFound, CertificatValid } from "./CertificatView";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function VerifyCertificatePage({ params }: { params: { code: string } }) {
  const { data, error } = await supabase.rpc("verify_certificate", { p_code: params.code });
  const cert = data?.[0];

  if (error || !cert) {
    return <CertificatNotFound />;
  }

  return <CertificatValid cert={cert} />;
}