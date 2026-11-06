/** Auth/permission errors. Kept free of server-only imports so client-safe
 *  helpers (e.g. action state utilities) can reference them without dragging
 *  `next/headers` into the client bundle. */
export class AuthError extends Error {}
export class ForbiddenError extends Error {}
