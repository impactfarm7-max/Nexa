type OralCorrectionErrorInput = {
  message: string;
  status?: number;
};

export function getOralCorrectionUserMessage({ message, status }: OralCorrectionErrorInput): string {
  const err = message.trim();
  const lower = err.toLowerCase();

  if (status === 401 || lower.includes("session expirée") || lower.includes("non autorisé")) {
    return "Votre session a expiré. Reconnectez-vous, puis relancez la correction.";
  }

  if (
    status === 403 ||
    lower.includes("abonnement") ||
    lower.includes("pack requis") ||
    lower.includes("accès révoqué") ||
    lower.includes("formation terminée") ||
    lower.includes("en pause")
  ) {
    return err.includes(".")
      ? err
      : "Votre accès au simulateur oral n'est pas actif pour le moment.";
  }

  if (
    status === 429 ||
    lower.includes("quota") ||
    lower.includes("limite hebdomadaire") ||
    lower.includes("eo épuisé") ||
    lower.includes("limite quotidienne")
  ) {
    return err || "Vous avez atteint votre limite de corrections orales. Réessayez plus tard ou contactez IAG Academy.";
  }

  if (lower.includes("aucune réponse") || lower.includes("aucune parole")) {
    return "Nous n'avons pas détecté de prise de parole. Enregistrez-vous à nouveau, puis lancez la correction.";
  }

  if (
    lower.includes("aborterror") ||
    lower.includes("timeout") ||
    status === 504
  ) {
    return "La correction a pris trop de temps. Vérifiez votre connexion, puis appuyez à nouveau sur « Corriger ». Votre enregistrement est conservé.";
  }

  if (lower.includes("failed to fetch") || status === 503) {
    return "Connexion interrompue. Vérifiez votre réseau et réessayez dans quelques secondes.";
  }

  if (
    status === 502 ||
    lower.includes("n'a pas pu être générée") ||
    lower.includes("plusieurs tentatives") ||
    lower.includes("surchargé")
  ) {
    return "Le correcteur est momentanément indisponible. Votre réponse est sauvegardée : réessayez dans 1 à 2 minutes.";
  }

  if (lower.includes("invalide") || lower.includes("json")) {
    return "La correction n'a pas abouti. Réessayez sans quitter la page — cela fonctionne généralement au second essai.";
  }

  if (err && err.length < 180 && !err.startsWith("Erreur ")) {
    return err;
  }

  return "Une erreur inattendue s'est produite. Réessayez ou contactez IAG Academy si le problème persiste.";
}
