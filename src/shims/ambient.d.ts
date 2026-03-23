/**
 * Declarações mínimas para módulos nativos / .cjs.
 */
declare module '*libsql.cjs' {
  const client: unknown
  export default client
}
