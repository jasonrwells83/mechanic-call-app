# Repository Guidelines
Mechanic Call App keeps two-bay shops on schedule. Follow these practices for dependable contributions.

## Project Structure & Module Organization
- `src/` contains the Vite + React client: feature modules in `src/components`, route screens in `src/pages`, shared clients in `src/lib`, Zustand stores in `src/stores`, and Vitest setup in `src/test/setup.ts`.
- `public/` hosts static assets and favicons; `dist/` is generated output.
- `server/` ships the Express API with TypeScript sources under `server/src` and seed helpers in `server/scripts/seed.ts`.
- `tasks/` and `tools/` store MCP automation; sync with maintainers before changes.

## Build, Test, and Development Commands
- `npm run dev` starts the Vite client; `npm run dev:backend` runs the API; `npm run dev:full` wires both with concurrently.
- `npm run build` compiles the client bundle; `npm run preview` serves the build.
- `npm run build:backend` and `npm run start:backend` compile and execute the Express server.
- `npm run lint` enforces ESLint; `npm run test` runs Vitest; `cd server && npm run seed` loads InstantDB sample data.

## Coding Style & Naming Conventions
- Stick to TypeScript, functional React patterns, and Zustand stores; avoid class components.
- Use 2-space indentation, single quotes, trailing commas on multi-line literals, and colocate shared types in `src/types`.
- Name directories with kebab-case, React components with PascalCase, hooks as `useThing.ts`, and tests as `*.test.tsx/ts`.
- Run linting before PRs and keep comments focused on non-obvious reasoning.

## Testing Guidelines
- Write Vitest + Testing Library specs alongside code or in `__tests__` folders (see `src/stores/__tests__/selection-store.test.ts`).
- Prefer behavior-driven `describe/it` names and mock InstantDB calls through the shared clients.
- Use `npm run test -- --watch` while iterating and expand fixtures in `src/test` as coverage grows.
- Prioritize coverage for scheduling, call handling, and settings flows before merging.

## Commit & Pull Request Guidelines
- Author imperative, present-tense commit subjects under ~60 characters (e.g., `Refactor customer filtering`) and keep each commit scoped.
- PRs must include a summary, testing notes (`npm run test`, `npm run lint`), any linked issues, and UI screenshots or clips when visuals change.
- Flag API or env adjustments prominently and request reviewers from both app and server owners when shared contracts move.

## Security & Configuration Tips
- Copy `env.example` into `.env`/`.env.local` and keep credentials out of version control.
- Coordinate InstantDB keys across app and server configs and rotate them together.
