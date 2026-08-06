import { common } from "./messages/common";
import { landing } from "./messages/landing";
import { auth } from "./messages/auth";
import { marketing } from "./messages/marketing";
import { superadmin } from "./messages/superadmin";
import { admin } from "./messages/admin";
import { centre } from "./messages/centre";
import { dashboard } from "./messages/dashboard";

export const messages = {
  fr: {
    common: common.fr,
    landing: landing.fr,
    auth: auth.fr,
    marketing: marketing.fr,
    superadmin: superadmin.fr,
    admin: admin.fr,
    centre: centre.fr,
    dashboard: dashboard.fr,
  },
  en: {
    common: common.en,
    landing: landing.en,
    auth: auth.en,
    marketing: marketing.en,
    superadmin: superadmin.en,
    admin: admin.en,
    centre: centre.en,
    dashboard: dashboard.en,
  },
} as const;

export type Locale = keyof typeof messages;
export type MessageNamespace = keyof (typeof messages)["fr"];
