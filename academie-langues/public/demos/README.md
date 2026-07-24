# Démos vidéo — page /presentation

Placez vos fichiers **MP4** ici. Ils remplacent automatiquement les mockups animés sur `/presentation`.

## Chemin sur ton PC

```
academie-langues/public/demos/
```

## Fichiers attendus

| Fichier | Module sur la page |
|---------|-------------------|
| `centre-dashboard.mp4` | Module 01 — Tableau de bord centre |
| `finance.mp4` | Module 02 — Finance |
| `cours.mp4` | Module 03 — Cours & devoirs |
| `examens.mp4` | Module 04 — Examens |
| `simulateur.mp4` | Module 05 — IA / tuteur |
| `communaute.mp4` | Module 06 — Communauté |
| `live.mp4` | Module 07 — Sessions live |
| `bibliotheque.mp4` | Module 08 — Bibliothèque |
| `presentation.mp4` | *(optionnel)* Vidéo pitch complète |

## Recommandations

- **Format :** MP4, 16:9, 1080p
- **Durée :** 15–45 s par module
- **Son :** muet de préférence (la page lit en boucle sans audio)
- **Poids :** ≤ 5–10 Mo par fichier si possible (compresse avec HandBrake si besoin)
- **Landing actuelle (2026-07) :** les 4 fichiers utilisés par `FourPillarCards` pèsent ~30–48 Mo chacun (~170 Mo au total) — **à recompresser**. Script : `pwsh scripts/compress-landing-demos.ps1` (ffmpeg requis, sortie dans `public/demos/_compressed/`).

## Comportement

- Fichier **présent** → la vidéo s'affiche avec bouton play
- Fichier **absent** → le mockup CSS animé reste affiché (fallback)

## Vérifier

1. Copie les MP4 dans `public/demos/`
2. Lance `npm run dev`
3. Ouvre `http://localhost:3000/presentation`
4. Scroll jusqu'aux modules — clique sur ▶ pour lire
