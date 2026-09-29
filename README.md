# Welcome to React Router!

A modern, production-ready template for building full-stack React applications using React Router.

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Previewing the Production Build

Preview the production build locally:

```bash
npm run preview
```

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

Deployment is done using the Wrangler CLI.

To build and deploy directly to production:

```sh
npm run deploy
```

To deploy a preview URL:

```sh
npx wrangler versions upload
```

You can then promote a version to production after verification or roll it out progressively.

```sh
npx wrangler versions deploy
```

## Design (Agrume v3)

The site wears the shared Yuzuctus design kit, Agrume v3
(`Personnel/Redesign/Agrume_Design`, see its `DESIGN.md`). There is no site palette
and no site font: colours, rules, grain, type (IBM Plex) and spacing come from the kit.

- `app/styles/agrume/` is a **verbatim copy** of the kit's `css/` core (`fonts`, `tokens`,
  `base`, `components`) plus `app.css` for the admin forms. `app/styles/fonts/` holds the
  kit's four `.woff2` files and their licences. Never edit these copies: change the kit
  first, then recopy. `.gitattributes` forces LF on the copy so parity holds.
- The core is loaded for every page in `app/root.tsx`; `app.css` only on `/osu-direct`.
- Site-local CSS stays small and uses `--ag-*` tokens only: `app/styles/root.css` (error
  page), `app/styles/skins.css` (public collection), `app/styles/admin.css` (OsuDirect admin).

Check that the copy is byte-identical to the kit (exit code 0):

```sh
node ../Redesign/Agrume_Design/check-parity.mjs app/styles/agrume
```

---

Built with ❤️ using React Router.
