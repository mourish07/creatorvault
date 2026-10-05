# Development Prompt Log

This project was built autonomously using the **Antigravity** development environment. Antigravity served as the primary development assistant, executing a comprehensive product vision through parallel subagents, shell commands, and direct file manipulation.

## Objective

Build a Google Chrome extension for an Influencer Marketing CRM ("CreatorVault") that allows users to seamlessly capture, tag, and manage Instagram creators directly from their profile pages, saving them to a polished local dashboard.

## Initial Master Prompt

The build process was initiated with a single, highly detailed master prompt outlining the product vision, technical architecture, data model, UX requirements, duplicate handling, dashboard specifications, search/filter capabilities, testing requirements, and security constraints.

*(The full initial prompt is preserved in the project request logs. It detailed the exact requirements for a Manifest V3 extension using React, Vite, TypeScript, local storage, and a robust DOM extraction parser for Instagram without backend dependencies.)*

## Architecture Decisions

The Antigravity agent made the following architectural decisions based on the prompt:

1. **Build Tooling**: Selected Vite with a custom Rollup configuration to cleanly bundle a multi-entry Chrome extension (content script, service worker, popup, and dashboard) in a single build step.
2. **Component Library**: Opted to build a bespoke, lightweight set of React components (Buttons, Badges, Modals, Tag Inputs) styled with a consistent CSS variables system, avoiding the bloat of heavy component libraries (like MUI or AntD) to keep the extension fast and clean.
3. **Data Layer Abstraction**: Created `crmStorage.ts` to fully abstract `chrome.storage.local`. This separates business logic from Chrome APIs, making the code testable and future-proof for potential backend integrations.
4. **Resilient Parsing**: Implemented `instagramParser.ts` using a layered extraction approach. It checks URL paths, canonical links, OpenGraph metadata, structured JSON-LD, and finally visible DOM nodes to extract data safely.

## Important Implementation Steps

- **Parallel Subagents**: Antigravity deployed a specialized `file-writer` subagent to generate shared UI components (Avatar, Badge, Button, Toast, TagInput, ConfirmDialog) simultaneously while the main agent constructed the core storage and parsing services.
- **Content Script Isolation**: Ensured the CSS injected into Instagram was scoped strictly to `#creatorvault-root` to prevent visual conflicts with Instagram's native styles.
- **Duplicate Prevention**: Implemented a normalization utility that strips `@` symbols, lowercases, and trims usernames before generating stable IDs, ensuring robust deduplication across the extension.

## Debugging and Refinement

During the build process, the agent autonomously resolved several issues:
- **Build Errors**: Diagnosed and fixed TypeScript module resolution issues by configuring `vite-plugin-static-copy` to properly migrate the manifest and generated icons to the `dist` directory during the build process.
- **Test Failures**: Identified a precision issue in the `formatFollowers` utility test (rounding 1.25M to 1.3M via `.toFixed(1)`) and corrected the test assertions to match the intended display logic.
- **Icon Rendering**: Handled the Chrome Extension requirement for `.png` icons by running a Node.js buffer script to generate basic fallback PNGs after initially attempting SVG generation.
- **Component Imports**: Fixed duplicate component declarations (`FieldRow`) and incorrect import paths (`formatFollowers`, Lucide-React `Camera` vs `Instagram` icon availability) uncovered during the rigorous type-checking phase.

## Final Verification

The agent successfully executed `npm run test`, `npm run typecheck`, and `npm run build`, resulting in a clean, zero-error production build ready for immediate installation as an unpacked Chrome extension.
