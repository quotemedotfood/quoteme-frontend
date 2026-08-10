import { setupServer } from 'msw/node';
import { handlers } from './handlers.js';

// onUnhandledRequest: 'error' so an endpoint this suite forgot to mock fails
// the test loudly instead of a silent real network call (there is no real
// network available in CI/this sandbox anyway, but failing loudly here is
// the point: a forgotten handler should read as a test bug, not a hang).
export const server = setupServer(...handlers);
