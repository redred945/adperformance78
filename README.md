# AD Performance — site vitrine

Site vitrine pour **AD Performance** — reprogrammation moteur sur-mesure, passages au
banc de puissance et entretien haute performance. Spécialiste **VAG (VW · Audi · Seat ·
Škoda) · BMW · Porsche**, en **Yvelines (78)** et Île-de-France.

Même base technique que le site MBSR Auto : HTML / CSS / JS statiques, aucune étape de
build, servi tel quel par Vercel.

## Stack

- `index.html` — page unique : Gains chiffrés / Prestations / La méthode / Réalisations / Déroulé / Contact
- `contact.html` — page devis dédiée (`/contact` via `cleanUrls`)
- `assets/styles.css` — thème sombre, accent **bleu électrique `#0a84ff`**, police mono (JetBrains Mono) sur les libellés techniques
- `assets/main.js` — rideau de garage (1×/session), reveals dégradables, header îlot, **compteurs animés** des gains, carrousels à pastilles, formulaire de contact (mailto + DM Instagram)
- `assets/logo-adp.svg` — monogramme « ADP » recréé d'après la photo de profil Instagram (blanc + slash bleu)
- `assets/favicon.svg` / `assets/og.svg` — favicon + carte de partage
- Hero : **courbe de puissance animée** (origine vs Stage 1) en SVG inline
- GSAP + ScrollTrigger via CDN (cdnjs), optionnels

## Améliorations vs MBSR

- Accent bleu électrique + noir plus profond
- Courbe de puissance animée dans le hero (pas besoin de photos)
- Section « Gains » avec compteurs animés (+30 % · +80 ch · +130 Nm)
- Bandeau marques défilant
- Police mono sur les chiffres / labels → effet « lecture ECU / banc »
- Réalisations = « runs » : mini-courbe + gain chiffré par véhicule

## À personnaliser / compléter

| Élément | État actuel | À faire |
|---|---|---|
| Logo | Recréé en SVG d'après la photo de profil (basse résolution) | Remplacer par le vectoriel officiel si dispo (même nom `logo-adp.svg`) |
| Couleur d'accent | `#0a84ff` (bleu électrique, d'après le halo du logo) | Confirmer / ajuster avec le client sur ses visuels |
| Chiffres de gains | Valeurs indicatives (moteur turbo récent) | Remplacer par les fourchettes réelles du client + garder le disclaimer |
| Réalisations | 6 « runs » fictifs avec mini-courbes | Remplacer par de vrais relevés / photos de banc (mêmes blocs) |
| E-mail | `contact@adperformance78.fr` (placeholder) dans `main.js` | Mettre la vraie adresse ; sinon le DM Instagram reste le canal principal |
| Téléphone | non communiqué | Ajouter dans `.cinfo` (+ lien `tel:`) si souhaité |
| Adresse / atelier | non communiquée | Préciser commune + affiner `bbox`/`marker` de la carte OSM |
| `canonical` / `og:image` URL | `https://example.com` placeholder | Mettre le domaine réel après déploiement |
| `og.svg` | SVG (peu supporté par certains réseaux) | Exporter une version PNG 1200×630 si partage social important |
| FAP / EGR / prépa non homologuée | Cadré « circuit / export uniquement » dans un disclaimer | Vérifier le wording avec le client |

## Formulaire

Pas de backend : ouvre le client mail avec la demande pré-remplie. CTA secondaire =
DM Instagram `@adperformance_78`. Pour un vrai envoi : Formspree / Web3Forms ou une
fonction serverless.

## Déploiement

Fichiers statiques → Vercel. `vercel.json` : `cleanUrls`, HTML/CSS/JS en
`must-revalidate`, assets en cache court. Lier le dépôt GitHub au projet Vercel pour
l'auto-déploiement sur push.
