---
description: This document outlines the high-level directory structure of the "Traceable" project, providing an overview of the purpose of its main directories and key configuration files.
globs: 
alwaysApply: false
---
Describe the project structure, focusing on file/directory purpose and key configuration/entry points:
- **public/**: Static assets (e.g., `vite.svg`).
- **src/**: Frontend (Svelte/Vite).
    - **assets/**: Imported static assets (images, icons).
    - **lib/** ($lib alias): Core library.
        - **components/**: Reusable Svelte components (categorized: calendar, dnd, loading, quill, setting, sidebar, todolist, ui). Includes generic UI from `shadcn-svelte`.
        - **panels/**: Higher-level UI views/sections (calendar, schedule, todo).
        - **states/**: State management, data models (proxies), Yjs integration. Crucial for data handling. Includes: `meta/` (core models), `states/` (UI states), `yjs/` (Yjs setup, Repository, loading), `signals.svelte.ts` (RxJS events), `stores.svelte.ts` (Svelte stores).
        - `index.ts`: Main export for `$lib`.
        - `utils.ts`: General utilities (e.g., `cn`).
    - **routes/**: Svelte components for application pages/views (used by `svelte-spa-router`).
    - `app.css`: Global CSS (Tailwind layers, custom styles).
    - `App.svelte`: Root Svelte component (layout, routing).
    - `main.ts`: Frontend entry point (mounts `App.svelte`).
    - `state.ts`: Initializes/exports global `Database` instance (data access).
    - `vite-env.d.ts`: Vite environment TS definitions.
- **src-tauri/**: Backend (Rust/Tauri).
    - **capabilities/**: Tauri app permissions (`default.json`).
    - **src/**: Rust source (`lib.rs`, `main.rs`).
    - `.gitignore`: `src-tauri` specific ignores.
    - `build.rs`: Cargo build script.
    - **`tauri.conf.json`**: **Key Tauri config** (identity, build, window, security, plugins, bundle).
- **`.env.development`**: Development environment variables.
- **`.gitignore`**: Git ignore rules.
- **`components.json`**: **Key `shadcn-svelte` config** (aliases, style, color).
- **`index.html`**: Main HTML entry point.
- **`package.json`**: **Node.js manifest** (dependencies, scripts).
- **`postcss.config.js`**: PostCSS config (Tailwind).
- **`README.md`**: Project documentation.
- **`svelte.config.js`**: **Svelte config** (preprocessors).
- **`tailwind.config.ts`**: **Tailwind CSS config** (design system, plugins, content).
- **`tsconfig.json`**: **Key Frontend TS config** (compiler options, aliases).
- **`tsconfig.node.json`**: Node.js environment TS config.
- **`vite.config.ts`**: **Key Vite config** (build, plugins, resolve aliases).