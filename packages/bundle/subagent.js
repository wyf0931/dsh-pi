/**
 * Bundle entry for the Pi subagent provider. The implementation lives in the
 * separately published `dsh-subagent-pi` package; this subpath re-exports it so
 * a linked checkout resolves the row from the bundle package itself.
 *
 * @module dsh-pi/subagent
 */
export * from 'dsh-subagent-pi'
