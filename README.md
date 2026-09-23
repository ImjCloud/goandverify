# Executive Political Evidence Gallery — V4.1

A Next.js + TypeScript + Tailwind starter for a source-led public-record archive.

## What V4.1 fixes

## Folder structure

```text
app/
components/
lib/
public/
next.config.ts
package.json
tsconfig.json
postcss.config.mjs
.env.example
```

## Run locally in VS Code

Open the folder containing **package.json** in VS Code, then run:

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

Before production deployment:

```powershell
npm run build
```

## Important replacement step

Do not copy individual files over the old V4 folder. Delete/rename the old V4 project folder and extract this V4.1 ZIP as a complete project. Then open the folder that directly contains `package.json` in VS Code.

If PowerShell shows a path such as:

```text
...\evidence-gallery-v4\evidence-gallery-v4>
```

that is acceptable only if the **current folder itself** contains `package.json`, `app`, `components`, `lib`, and `public`.

## Backend

The project includes the Supabase schema in `lib/supabase.sql` and `.env.example`. Connect Supabase only after the local UI builds successfully.

## Evidence integrity

The included evidence and giving records are source-led demonstration data. Do not treat the presence of a record in this starter as independent proof of the underlying claim. Before public launch, replace placeholders with verified, legally usable source material and preserve source URLs, dates, rights information and verification status.

This project is a test run of my AI coding skill.
