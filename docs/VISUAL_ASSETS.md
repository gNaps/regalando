# Immagini della UI

## Accenti tipografici

La UI usa Geist per testi e controlli. Lora Italic aggiunge un accento serif a «da te.» nel titolo della landing, «felice?» nell’invito finale e alla tagline nella landing e nei footer. La tagline usa le maiuscole solo a inizio frase, con spaziatura naturale e dimensioni leggibili anche su mobile.

Il font variabile è servito localmente tramite `next/font/local`: `app/fonts/Lora-ItalicVF.ttf`, con licenza in `app/fonts/Lora-OFL.txt`. Fonte: [repository Google Fonts, Lora](https://github.com/google/fonts/tree/main/ofl/lora). Non sono richieste connessioni a Google durante la build o la visita dell’app.

## Finitura oro

I pulsanti primari condividono una sfumatura champagne con un riflesso chiaro e bordi leggermente più scuri. Hover e pressione hanno stati dedicati; il testo rimane scuro su tutta la superficie. Gli accenti dorati nei titoli della landing e nelle etichette usano un gradiente più luminoso, ritagliato sulle lettere. Le etichette grigie mantengono il loro colore. I colori pieni rimangono disponibili come fallback e la modalità a contrasto forzato usa i colori di sistema.

## Animazioni della landing

Intestazione e contenuti della hero entrano con un movimento breve e progressivo. Il nastro compie una leggera oscillazione e poi si ferma. Scorrendo, testi, immagini e benefici appaiono una sola volta, con piccoli ritardi tra gli elementi. Pulsanti e frecce rispondono al passaggio del mouse; i link interni scorrono dolcemente alla sezione.

`LandingMotion` usa IntersectionObserver, senza gestori di scroll o dipendenze aggiuntive. I contenuti sono visibili nell’HTML iniziale e rimangono disponibili senza JavaScript. Il focus da tastiera rende subito visibile l’elemento raggiunto. La preferenza `prefers-reduced-motion` disattiva i movimenti, anche quando cambia a pagina aperta.

## Segno visivo attuale

`public/images/desire-ribbon.png`: nastro scultoreo oro/argento su fondo trasparente, generato con il tool integrato imagegen (generazione da testo). Integrato nella composizione della landing e dell’elenco delle liste. I dettagli delle liste e i regali usano ora la famiglia di illustrazioni 3D descritta sotto.

## Illustrazioni 3D per liste e categorie — 12 ottobre 2026

Tredici asset generati con il tool integrato imagegen. Fondi trasparenti, materiali nero opaco, argento e oro champagne, illuminazione da studio e prospettiva a tre quarti. Gli asset finali sono WebP fino a 1024 × 1024, con alpha originale preservato e qualità 90; Next/Image li serve nelle dimensioni adatte alla UI. I prompt esatti sono in [ILLUSTRATION_PROMPTS.json](ILLUSTRATION_PROMPTS.json).

L’intestazione della lista è una composizione aperta: testo e illustrazione affiancati, con pacco da 200 px su desktop e 96 px su mobile. Il vecchio riquadro con anelli e monogramma è stato rimosso. Il selettore dell’atmosfera usa le stesse illustrazioni in miniatura.

Le card regalo privilegiano nome e prezzo, con illustrazione laterale da 84 px (68 px su mobile), descrizione breve e azione Dettagli in fondo. Il dettaglio usa una miniatura da 80 px, prezzo in evidenza e sezioni separate per descrizione e luoghi di acquisto. I link mostrano il dominio; negozi e indirizzi hanno righe dedicate. Anche la modale «Sorpresa protetta» usa il marchio attuale `GiftMark`, condiviso con l’intestazione.

| Asset in `public/images/` | Utilizzo |
| --- | --- |
| `cover-black.webp` | Pacco nero con nastro oro; atmosfera Nero (`plum`) |
| `cover-silver.webp` | Variante argento con nastro oro (`sage`) |
| `cover-gold.webp` | Variante oro con nastro argento (`sand`) |
| `category-design.webp` | Vaso scultoreo: Casa e design |
| `category-tech.webp` | Smartphone: Tecnologia |
| `category-gaming.webp` | Controller: Console e videogames |
| `category-music.webp` | Cuffie: Musica |
| `category-art.webp` | Cornice e libro d’arte: Arte |
| `category-travel.webp` | Valigia: Viaggi |
| `category-style.webp` | Borsa: Fashion e stile |
| `category-beauty.webp` | Flacone di profumo: Beauty |
| `category-experiences.webp` | Biglietti: Experience |
| `category-other.webp` | Pacco regalo: Altro |

Le immagini rappresentano la categoria, non il prodotto specifico desiderato. La categoria precedente `books` resta leggibile per i regali esistenti e usa la composizione con il libro d’arte; non viene proposta per un nuovo regalo. Nessun dato esistente è stato migrato o cancellato. I nomi interni `experiences` e `style` sono conservati per compatibilità, con le nuove etichette richieste.

Prompt:

Use case: brand UI illustration. Create one spectacular sculptural ribbon object for a contemporary premium gift wishlist app. A long wide satin-metal ribbon curls in an asymmetric elegant looping knot, halfway between a gift bow and abstract kinetic sculpture. Two intertwined continuous strips: one polished liquid silver chrome, one brushed champagne gold. Oversized dramatic flowing loops with one long tapering tail descending to the left, a dynamic tilted composition. Physically believable refined reflections, beautiful studio lighting, smooth fluid silhouette, high-end experimental digital art and fashion art direction. Centered isolated object filling 85% of a square canvas, three-quarter perspective, generous clear spaces inside loops. Transparent background with genuine alpha; no backdrop, no floor, no drop shadow outside object. No text, no logos, no gifts, no products, no headphones, no vase, no pedestal, no sparkles, no UI. This object will be layered into the interface itself, not used as a list cover.

## Esplorazione precedente

Le due immagini seguenti sono integrate nella landing pubblica: libri e vaso accanto all’introduzione dei benefici, cuffie e regalo accanto alle occasioni d’uso. Le immagini sfumano nel fondo della pagina tramite maschere CSS, senza card o didascalie sovrapposte. Non sono utilizzate nelle liste. Le immagini sono importate staticamente e servite con Next/Image, dimensioni responsive, caricamento differito e placeholder sfocato.

Il logo condiviso usa `app/components/ui/gift-mark.tsx`: quattro quadrati che suggeriscono un pacco che si apre. Tre formano la base compatta; il quarto è sollevato e ruotato di 24°, creando una silhouette asimmetrica. Il nastro è rappresentato solo dal fiocco sopra il pacco, con due anelli ampi e un tratto luminoso più marcato. Gli angoli sono appena ammorbiditi, con una sfumatura oro champagne e un sottile bordo luminoso. La scritta ha un peso più leggero e maggiore spazio rispetto al simbolo. Ogni istanza SVG usa un identificatore del gradiente distinto, così intestazione e footer possono convivere nella stessa pagina.

Copertine decorative generate con il tool integrato imagegen (generazione da testo), l’11 ottobre 2026. Palette nero, argento e oro; nessun servizio immagini esterno richiesto a runtime. Next/Image serve dimensioni e formati ottimizzati, con placeholder sfocato.

- `public/images/wishlist-night.png`: composizione con cuffie argento, pacco nero e nastro oro. Atmosfera Nero; variante cromatica per Oro.
- `public/images/wishlist-silver.png`: composizione con vaso cromato, libri e nastro oro. Atmosfera Argento.

Le immagini rappresentano l’atmosfera delle liste, non i prodotti effettivamente contenuti. Le precedenti illustrazioni SVG dei regali sono state sostituite dalla famiglia 3D di categoria.

## Prompt: Nero

Use case: product-mockup. Asset type: wide photographic cover for a bold modern wishlist app, landscape 3:2 composition. Create an exceptionally polished editorial still life: a sculptural brushed silver over-ear headphone with black ear cushions, a small matte black gift box with an elegant thin champagne-gold satin ribbon, and a polished chrome sphere. Objects composed as a striking diagonal arrangement on a dark charcoal architectural plinth. Deep black studio backdrop, strong controlled spotlight from upper left, crisp specular chrome highlights and warm muted gold reflections. Tactile matte black, satin and brushed metal surfaces, premium fashion magazine photography, believable physical objects, sophisticated and youthful. Frame objects mostly in center and right two thirds, leave bottom quarter predominantly dark with soft shadow so white UI text can overlay. Full-bleed, dynamic close crop, cinematic but clean, no ambient busy details. Strict palette: black, silver, muted champagne gold. No text, no letters, no logos, no watermark, no decorative stars, no envelopes, no wax seal. This is an artistic collection cover, not a UI mockup.

## Prompt: Argento

Use case: product-mockup. Asset type: wide photographic cover for a bold modern wishlist app, landscape 3:2 composition. Create an exceptionally polished editorial still life for a home/design wish collection: one sculptural polished silver donut-shaped vase with a single graceful dark branch, two thick unbranded ivory and charcoal art books stacked at a slight angle, and one softly crumpled champagne-gold satin ribbon curling across the foreground. Composition on a cool silver-grey monolithic pedestal against charcoal studio backdrop, with generous architectural negative space. Beautiful sculptural side light, detailed reflections, premium contemporary design magazine photography. Objects in center and right two thirds, bottom quarter dark and quiet for white overlaid UI text. A striking asymmetric close composition, tactile materials and strong silhouettes. Strict palette black, silver, soft ivory and muted gold. No text, no letters, no branding, no watermark, no graphic UI, no stars, no envelopes, no wax seal. This is an artistic collection cover.
