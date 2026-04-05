/**
 * Minimal declarations for native modules / .cjs.
 */
declare module '*libsql.cjs' {
  const client: unknown
  export default client
}
