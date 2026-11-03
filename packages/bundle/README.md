---
description: "Installable DeepSeek Harness bundle that registers the Pi coding agent as a one-shot subagent provider, the delegate_pi tool, and a configuration page for the provider."
kind: "bundle-reference"
---

# dsh-pi (bundle)

English | [中文](README.zh.md)

## Summary

`dsh-pi` is the installable bundle for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) that wires the [Pi coding agent](https://github.com/earendil-works/pi-coding-agent) into a profile. One installation adds two rows and a configuration page:

| Row id | Plugin module | Role |
|---|---|---|
| `subagent-pi` | `dsh-pi` | Registers the one-shot `pi` subagent provider and hosts the configuration page |
| `tool-subagent-pi` | `dsh-pi/tool` | Registers the model-facing `delegate_pi` tool |

The implementations stay in [`dsh-subagent-pi`](../subagent-pi/README.md) and [`dsh-tool-subagent-pi`](../tool-subagent-pi/README.md). The bundle re-exports them, gives each row its own locale metadata and icon, and ships a browser half (`client.js`) that registers the provider's configuration page on the Plugins page.

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

## Configure in the UI

Open **Plugins** in the sidebar, select the installed `dsh-pi` bundle, open the **Pi Subagent** row, and click **Configure**. The page edits:

| Field | Meaning |
|---|---|
| Model | Provider/model, for example `deepseek/deepseek-flash`; empty uses Pi's own default |
| Thinking level | `off` through `max`; empty uses Pi's own default |
| Turn timeout | Milliseconds after the prompt is accepted; empty cancels only with the parent |
| Excluded tools | Comma-separated Pi tool names; empty excludes none |

**Save** writes a profile override through the config editor and applies it to the next delegation without restarting the plugin. **Restore defaults** clears the four fields, restoring the bundle's inherited values. The page follows the active UI language and reports conflicts instead of overwriting a newer change.

`providerName` and `agentDir` stay YAML-only because they identify the provider instance and its Pi home.

## Configuration from YAML

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

See [`dsh-subagent-pi`](../subagent-pi/README.md#configuration) for every provider field. A UI save writes the same profile layer, so both paths stay consistent.

## Requirements

- Node >= 22.19.0 and a DSH runtime that satisfies `engines.dsh` (`^0.2.1-rc.3`).
- Pi authenticated in its own agent directory (`~/.pi/agent` by default, or `PI_CODING_AGENT_DIR`). When `model` is omitted, Pi's own default model and thinking level apply.

## Display metadata

The provider row uses the bundle's root `locale/en.json`, `locale/zh.json`, and `icon.svg`. The tool row uses `tool/locale/*.json` and `tool/icon`. The legacy `dsh-pi/subagent` subpath keeps its own copies for compositions that still insert that name. Each row therefore shows a real title, description, and artwork in the Plugin Manager.

## Client half

`client.js` declares `dsh.client` (`platform: web`, `immediately: true`, depending on `@deepseek-ai/dsh-client-ui-plugin-manager`). It registers `plugins.row.config` under the key `dsh-pi#subagent-pi`, reads the `subagent-pi` settings namespace through `ctx.configForms`, and renders the form. The Host declares `model`, `effort`, `timeoutMs`, and `disallowedTools` as volatile Config fields, so a save updates the running provider's references instead of remounting it.
