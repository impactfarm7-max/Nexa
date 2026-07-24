/**
 * Impression PDF sans en-tête/pied de page du navigateur (titre NEXA, URL, date).
 * Clone le contenu dans une iframe neutre puis lance l'impression.
 */
export function printElementClean(elementId: string) {
  const source = document.getElementById(elementId);
  if (!source) return;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }

  const headLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map((link) => {
      const href = (link as HTMLLinkElement).href;
      return href ? `<link rel="stylesheet" href="${href}">` : "";
    })
    .join("");

  const inlineStyles = Array.from(document.querySelectorAll("style"))
    .map((node) => `<style>${node.textContent || ""}</style>`)
    .join("");

  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title></title>
${headLinks}
${inlineStyles}
<style>
  @page { size: A4; margin: 0; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: white !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body { padding: 10mm !important; color: #11224E; box-sizing: border-box; }
  img { max-width: 100%; }
</style>
</head>
<body>${source.outerHTML}</body>
</html>`);
  doc.close();

  const cleanup = () => {
    win.onafterprint = null;
    iframe.remove();
  };

  const runPrint = () => {
    win.focus();
    win.print();
    win.onafterprint = cleanup;
    window.setTimeout(cleanup, 5000);
  };

  window.setTimeout(runPrint, 400);
}
