---
description: "Run the Pi coding agent as a DeepSeek Harness subagent — an installable bundle plus two pre-stable plugins that register a Pi-backed provider and the model-facing tool that delegates to it."
kind: "package-group"
---

# dsh-pi

English | [中文](README.zh.md)

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)

## Summary

`dsh-pi` runs the [Pi coding agent](https://github.com/earendil-works/pi-coding-agent) inside DeepSeek Harness (DSH). The parent DSH agent delegates a self-contained task to Pi, which works in its own context with its own tools and model, and the parent receives Pi's final answer as a completion notice. Pi runs in the DSH process through its SDK, so there is no Pi CLI to install or fork.

The integration follows the same provider-and-tool seam the DSH community already uses for Codex and Claude Code:

| Package | Role |
|---|---|
| [`dsh-pi`](packages/bundle/README.md) | The installable bundle: inserts both rows, with locale metadata and icons |
| [`dsh-subagent-pi`](packages/subagent-pi/README.md) | Registers a one-shot Pi `SubagentProvider` on the shared subagent service |
| [`dsh-tool-subagent-pi`](packages/tool-subagent-pi/README.md) | Registers the `delegate_pi` tool the model calls to hand work to Pi |

All three packages are pre-stable. Their public APIs may change, and they follow DSH's [pre-stable release policy](https://github.com/deepseek-ai/deepseek-harness#readme).

## Requirements

- Node >= 22.19.0
- A DSH runtime that satisfies `engines.dsh` (`^0.2.1-rc.3`), with the subagent and tool capability seams mounted (any `dsh` profile that exposes `ctx.subagents` and `ctx.tools`)
- A Pi model provider configured. Pi resolves models through its own agent directory (`~/.pi/agent` by default, or `PI_CODING_AGENT_DIR`), so configure authentication there before the first delegation. This package starts no session until a delegation is accepted and installs no provider credentials.

> The earlier `engines.dsh: ^0.2.1` declaration excluded every `0.2.1-rc.*` runtime even though the APIs are identical, so DSH denied both rows. The range is now `^0.2.1-rc.3`, which admits `0.2.1-rc.3`, `0.2.1-rc.5`, `0.2.1`, and `0.2.2-alpha.*`.

## Install

Build the checkout once, then install the bundle into a profile with the Plugin Manager (`install_bundle`) or the CLI:

```sh
pnpm install
pnpm build
dsh plugin --profile <profile> add /absolute/path/to/dsh-pi/packages/bundle
```

A linked checkout resolves both rows from the bundle package itself, so no extra profile dependencies are required. After installation the model sees the `delegate_pi` tool. If the profile does not hot-reload bundles, restart DSH.

Manual composition remains available: install [`dsh-subagent-pi`](packages/subagent-pi/README.md) and [`dsh-tool-subagent-pi`](packages/tool-subagent-pi/README.md) as profile dependencies and insert rows for both package names.

### Configure the model

The bundle inserts the provider with `providerName: pi` only, so Pi's own default model applies. Override it, or any other provider field, by row id in the profile's `cordis.patch.yml`; `config` is replaced wholesale, so restate every field the row needs:

```yaml
- id: subagent-pi
  config:
    providerName: pi
    model: deepseek/deepseek-flash
    effort: medium
```

## Quickstart

The model delegates one task per call:

```jsonc
{
  "description": "Find the failing test",
  "prompt": "Run the test suite in this repo and report the name of the first failing test and the file that owns it.",
  "cwd": "."
}
```

The tool returns a child id immediately; a later completion notice carries Pi's final assistant text. Start independent delegations together and continue useful work while they run. When only waiting for their results remains, end the turn instead of polling.

## Repository

```
packages/bundle/            The installable dsh-pi bundle (patch, rows, locale, icons)
packages/subagent-pi/       The Pi subagent provider plugin
packages/tool-subagent-pi/  The delegate_pi tool plugin
```

## Commands

```sh
pnpm install
pnpm build        # tsc types, then the tsdown ESM runtime artifact per package
pnpm typecheck
pnpm test         # unit tests; no network or Pi credentials needed
pnpm test:e2e     # DSH_PI_E2E=1; delegates a real task through the installed Pi SDK
pnpm clean
```

`pnpm test:e2e` uses Pi's configured default model. Set `DSH_PI_E2E_MODEL=provider/model` to pin the model the live test uses, for example `DSH_PI_E2E_MODEL=deepseek/deepseek-flash`.

## License

[MIT](LICENSE)
