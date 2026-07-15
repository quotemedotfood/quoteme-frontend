// FE-TESTING epic slice 1 — global setup for DOM-rendering (jsdom) tests.
//
// Only test files that opt into the jsdom environment (via the
// `// @vitest-environment jsdom` pragma at the top of the file) load a DOM,
// so this setup only matters for those files. It adds jest-dom's custom
// matchers (toBeDisabled, toBeEnabled, toBeInTheDocument, etc.) on top of
// vitest's `expect`.
import '@testing-library/jest-dom/vitest';
