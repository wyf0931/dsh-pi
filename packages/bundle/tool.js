/**
 * Bundle entry for the Pi delegation tool. The implementation lives in the
 * separately published `dsh-tool-subagent-pi` package; this subpath re-exports
 * it so a linked checkout resolves the row from the bundle package itself.
 *
 * @module dsh-pi/tool
 */
export * from 'dsh-tool-subagent-pi'
