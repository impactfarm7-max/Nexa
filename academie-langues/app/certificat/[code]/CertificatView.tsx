"use client";

import { useI18n } from "@/app/i18n/I18nProvider";

const BRAND = { blue: "#11224E", orange: "#F87B1B" };

type Cert = {
  student_prenom: string;
  discipline_code: string;
  issued_at: string;
  certificate_code: string;
};

export function CertificatNotFound() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] p-6 text-center font-sans">
      <div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">{t("marketing", "certificatNotFoundTitle")}</h1>
        <p className="text-slate-500 font-medium">{t("marketing", "certificatNotFoundMessage")}</p>
      </div>
    </div>
  );
}

export function CertificatValid({ cert }: { cert: Cert }) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "fr" ? "fr-FR" : "en-US";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] p-6 font-sans">
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl p-10 max-w-md w-full text-center">
        <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-emerald-100">
          <span className="text-emerald-600 text-2xl">✓</span>
        </div>
        <h1 className="text-xl font-black mb-1" style={{ color: BRAND.blue }}>{t("marketing", "certificatAuthenticTitle")}</h1>
        <p className="text-sm text-slate-500 font-medium mb-6">{t("marketing", "certificatIssuedByLabel")}</p>
        <div className="bg-slate-50 rounded-2xl p-5 text-left space-y-2">
          <p className="text-sm">
            <span className="font-bold text-slate-900">{t("marketing", "certificatCandidateLabel")} </span>
            {cert.student_prenom}
          </p>
          <p className="text-sm">
            <span className="font-bold text-slate-900">{t("marketing", "certificatSubjectLabel")} </span>
            {cert.discipline_code}
          </p>
          <p className="text-sm">
            <span className="font-bold text-slate-900">{t("marketing", "certificatIssuedOnLabel")} </span>
            {new Date(cert.issued_at).toLocaleDateString(dateLocale)}
          </p>
          <p className="text-sm">
            <span className="font-bold text-slate-900">{t("marketing", "certificatCodeLabel")} </span>
            {cert.certificate_code}
          </p>
        </div>
      </div>
    </div>
  );
}
