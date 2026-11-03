---
description: "Installable DeepSeek Harness bundle that registers the Pi coding agent as a one-shot subagent provider and the delegate_pi tool."
kind: "bundle-reference"
---

# dsh-pi (bundle)

English | [中文](README.zh.md)

## Summary

`dsh-pi` is the installable bundle for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) that wires the [Pi coding agent](https://github.com/earendil-works/pi-coding-agent) into a profile. One installation adds two rows:

| Row id | Plugin module | Role |
|---|---|---|
| `subagent-pi` | `dsh-pi/subagent` | Registers the one-shot `pi` subagent provider |
| `tool-subagent-pi` | `dsh-pi/tool` | Registers the model-facing `delegate_pi` tool |

The implementations stay in [`dsh-subagent-pi`](../subagent-pi/README.md) and [`dsh-tool-subagent-pi`](../tool-subagent-pi/README.md). The bundle's subpath entries re-export them and give each row its own locale metadata and icon.

## Install

Install the bundle directory into a DSH profile with the Plugin Manager (`install_bundle`) or the CLI:

```sh
dsh plugin --profile <profile> add /absolute/path/to/dsh-pi/packages/bundle
```

The bundle links the checkout, so build the workspace first:

```sh
pnpm install
pnpm build
```

Restart DSH if the profile does not hot-reload bundles. The model then sees `delegate_pi`.

## Configuration

The bundle inserts these rows with defaults. Override them in the profile's `cordis.patch.yml` by row id, restating every field the row needs:

```yaml
- id: subagent-pi
  config:
    providerName: pi
    model: sensenova/sensenova-6.8-flash-lite
    effort: medium
- id: tool-subagent-pi
  config:
    providerName: pi
    toolName: delegate_pi
```

See [`dsh-subagent-pi`](../subagent-pi/README.md#configuration) for every provider field.

## Requirements

- Node >= 22.19.0 and a DSH runtime that satisfies `engines.dsh` (`^0.2.1-rc.3`).
- Pi authenticated in its own agent directory (`~/.pi/agent` by default, or `PI_CODING_AGENT_DIR`). When `model` is omitted, Pi's own default model and thinking level apply.

## Display metadata

`subagent` and `tool` each ship `locale/en.json`, `locale/zh.json`, and an original SVG icon, exported as `dsh-pi/subagent/locale/*.json`, `dsh-pi/subagent/icon`, `dsh-pi/tool/locale/*.json`, and `dsh-pi/tool/icon` so the Plugin Manager shows real titles, descriptions, and artwork for both rows.
