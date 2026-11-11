# Lara Oliveira — Portfolio

A plain HTML/CSS portfolio site. No build step, no dependencies.

The site is bilingual: English is the default, served from the root.
Portuguese (pt-BR) lives under `pt/`, mirroring the same structure. Every page
has a PT/EN switcher in the header linking to its counterpart.

## Structure

- `index.html` — English home page (hero, work, process, about, contact)
- `case-studies/` — English case study pages
- `pt/index.html` — pt-BR home page
- `pt/case-studies/` — pt-BR case study pages
- `styles.css`, `script.js` — shared stylesheet and script for the whole site
- `assets/logo-mark.png` — logo mark, used in the header and as favicon

## Viewing locally

Open `index.html` directly in a browser, or serve the folder with any static
file server, e.g.:

```bash
python3 -m http.server
```

Then visit `http://localhost:8000`.
