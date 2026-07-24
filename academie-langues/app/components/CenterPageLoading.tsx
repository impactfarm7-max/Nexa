import CenterRouteSkeleton from "@/app/components/CenterRouteSkeleton";

type CenterPageLoadingProps = {
  mode?: "center" | "student" | "admin" | "account";
  variant?: "light" | "dark";
  /**
   * Conservé pour compatibilité avec les appelants historiques : le rendu est
   * désormais toujours content-only (la vraie sidebar est déjà montée par
   * CenterAppShell), donc cette prop n'a plus d'effet sur le résultat.
   */
  embedded?: boolean;
  /** Classe optionnelle appliquée au fond du conteneur (remplace le fond par défaut). */
  className?: string;
};

/** Skeleton contenu uniquement — la sidebar est fournie par CenterAppShell. */
export default function CenterPageLoading({
  mode = "center",
  variant = "light",
  className,
}: CenterPageLoadingProps) {
  return <CenterRouteSkeleton mode={mode} variant={variant} contentOnly className={className} />;
}
