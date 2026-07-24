import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BRAND = { blue: "#11224E", orange: "#F87B1B" };

export default async function VerifyCertificatePage({ params }: { params: { code: string } }) {
  const { data, error } = await supabase.rpc("verify_certificate", { p_code: params.code });
  const cert = data?.[0];

  if (error || !cert) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] p-6 text-center font-sans">
        <div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Certificat introuvable</h1>
          <p className="text-slate-500 font-medium">Ce code ne correspond à aucun certificat NEXA valide.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] p-6 font-sans">
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl p-10 max-w-md w-full text-center">
        <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-emerald-100">
          <span className="text-emerald-600 text-2xl">✓</span>
        </div>
        <h1 className="text-xl font-black mb-1" style={{ color: BRAND.blue }}>Certificat authentique</h1>
        <p className="text-sm text-slate-500 font-medium mb-6">Délivré par NEXA</p>
        <div className="bg-slate-50 rounded-2xl p-5 text-left space-y-2">
          <p className="text-sm">
            <span className="font-bold text-slate-900">Candidat : </span>
            {cert.student_prenom}
          </p>
          <p className="text-sm">
            <span className="font-bold text-slate-900">Matière : </span>
            {cert.discipline_code}
          </p>
          <p className="text-sm">
            <span className="font-bold text-slate-900">Délivré le : </span>
            {new Date(cert.issued_at).toLocaleDateString("fr-FR")}
          </p>
          <p className="text-sm">
            <span className="font-bold text-slate-900">Code : </span>
            {cert.certificate_code}
          </p>
        </div>
      </div>
    </div>
  );
}