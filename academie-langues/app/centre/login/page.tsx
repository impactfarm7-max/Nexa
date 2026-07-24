import { redirect } from "next/navigation";

/** Ancienne route — tout le monde passe par /login */
export default function CenterLoginRedirect() {
  redirect("/login");
}
