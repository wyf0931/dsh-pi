---
description: "Register the Pi coding agent as a one-shot DeepSeek Harness subagent provider — opens an in-process Pi session per delegation and returns its final answer."
kind: "package-reference"
---

# dsh-subagent-pi

English | [中文](README.zh.md)

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)

## Summary

`dsh-subagent-pi` registers a one-shot subagent provider backed by the [Pi coding agent](https://github.com/earendil-works/pi-coding-agent). Each delegation opens one Pi session in the DSH process, runs one task, and returns Pi's final assistant text as the child result. Pi keeps its own tools, model selection, and conversation; the parent sees only the answer.

Choose this package to let a DSH agent hand self-contained work to Pi. Use [`dsh-tool-subagent-pi`](../tool-subagent-pi/README.md) alongside it: that package registers the model-facing tool that starts a delegation.

## Contract

- **One-shot, independent context.** The provider advertises no start-time capabilities (`agentOptions`, `agentPreset`, `outputSchema`, `depthLimit`) and does not inherit the parent's context. A delegation carries exactly one text task.
- **Pi runs in-process.** The provider imports the Pi SDK dynamically and opens one session per accepted delegation. No Pi CLI is forked and no DSH child session is created.
- **The published result never rejects.** A normal turn settles as `completed`; Pi's cooperative abort or parent cancellation settles as `aborted`; a turn failure settles as `error` with a fixed, credential-free diagnostic. Disposal disposes the Pi session.
- **Config is read once at load.** The Pi global config home, model, and thinking level come from the plugin config, not from per-run discovery.

## Install

```sh
pnpm add dsh-subagent-pi
```

The package peers on `@earendil-works/pi-coding-agent`; Pi 1.4.0 is the version this release was verified against.

## Compose

Mount the package in the `cordis.yml` overlay a `dsh` profile loads:

```yaml
- name: dsh-subagent-pi
  config:
    providerName: pi
    model: deepseek/deepseek-chat
    effort: medium
```

Pair it with [`dsh-tool-subagent-pi`](../tool-subagent-pi/README.md), whose tool selects this provider by name.

## Configuration

| Field | Default | Meaning |
|---|---|---|
| `providerName` | `pi` | Name the provider registers on the shared subagent service |
| `agentDir` | Pi's default | Pi global config home; `PI_CODING_AGENT_DIR` overrides Pi's default |
| `model` | Pi's own selection | Model spelled `provider/model`; read back from the session to confirm it applied |
| `effort` | Pi's own selection | Thinking level: `off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max` |
| `disallowedTools` | `[]` | Tool names excluded from every delegated session |
| `timeoutMs` | parent cancellation only | Turn deadline in milliseconds after the prompt is accepted |

An unknown model, a model Pi did not apply, an unrecognized thinking level, or a thinking level Pi did not apply fail at startup with a typed error. Pre-trusting the delegated working directory is not configurable: an embedded session has no human to answer a trust prompt.

## Environment

The provider reads `PI_CODING_AGENT_DIR` per delegation to resolve Pi's global config home. Configure Pi's model providers and authentication in that directory before the first delegation; this package installs no credentials and proxies none.

## Model Experience

#### What the child sees

The delegated Pi session receives the task text with the resolved child working directory. Its own model, tools, skills, and extensions determine the run; config supplies the model, thinking level, and tool exclusions.

#### What the parent sees

The parent receives Pi's last non-empty assistant text as the child result. Pi's reasoning, tool traffic, and transcript history stay in Pi; the parent never sees them.

#### Token effect

The child request is independent of the parent's cached prefix: Pi pays for its own context and turn, and the parent pays only for the returned answer in its completion notice.

## Known Limitations

- **One-shot text.** No continuation, resume, structured output, or progress stream. Cancellation stops the run; file changes Pi made before it remain.
- **No Pi session discovery.** The provider opens a fresh session per delegation and does not resume a prior Pi conversation.
- **Root text only.** Only root assistant text contributes to the answer; nested and side-request output is not surfaced.
- **Diagnostic, not transcript.** A failed run reports a fixed stage-and-category diagnostic, never Pi's raw error or environment values.

## Source map

| File | Role |
|---|---|
| [`src/index.ts`](src/index.ts) | Plugin entry: config, provider registration, diagnostic observer |
| [`src/run.ts`](src/run.ts) | One-shot execution, answer selection, cancellation, timeout, failure stages |
| [`src/session.ts`](src/session.ts) | Open the Pi session, read back model and thinking level, dispose |
| [`src/sdk.ts`](src/sdk.ts) | Lazy Pi SDK import and the installation probe |
| [`src/task.ts`](src/task.ts) | Text-task validation and answer collection |
| [`src/environment.ts`](src/environment.ts) | Pi agent directory and per-cwd session directory |
| [`src/failures.ts`](src/failures.ts) | Typed failure stages and categories |
