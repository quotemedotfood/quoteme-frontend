// FE-TESTING epic slice 1 — global setup for DOM-rendering (jsdom) tests.
//
// Only test files that opt into the jsdom environment (via the
// `// @vitest-environment jsdom` pragma at the top of the file) load a DOM,
// so this setup only matters for those files. It adds jest-dom's custom
// matchers (toBeDisabled, toBeEnabled, toBeInTheDocument, etc.) on top of
// vitest's `expect`.
import '@testing-library/jest-dom/vitest';

// findBy*/waitFor wait 1s by default. Under full-suite load the chef receipt
// page (ChefQuoteReceiptPage.render.test A2) needed longer to show its
// "Accept and start order guide" button, and failed both full runs on
// unchanged main while passing alone (2026-10-05). Waiting longer for the
// SAME element changes no expectation: a button that never renders still
// fails, just later.
import { configure } from '@testing-library/react';
configure({ asyncUtilTimeout: 5000 });
