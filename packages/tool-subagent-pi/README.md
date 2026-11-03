---
description: "Register the DeepSeek Harness tool that hands a self-contained task to the Pi subagent provider."
kind: "package-reference"
---

# dsh-tool-subagent-pi

English | [中文](README.zh.md)

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)

## Summary

`dsh-tool-subagent-pi` registers the `delegate_pi` tool: the model-facing way to hand one self-contained task to the [Pi coding agent](https://github.com/earendil-works/pi-coding-agent) through the [`dsh-subagent-pi`](../subagent-pi/README.md) provider. The tool accepts a task description, the task prompt, and an optional working directory, starts one Pi subagent, and returns its child id. A later completion notice carries Pi's final answer.

Mount this package to expose Pi delegation to the model. Mount [`dsh-subagent-pi`](../subagent-pi/README.md) alongside it so the `pi` provider exists.

## Contract

- **One call, one task, one child.** A `delegate_pi` call starts exactly one Pi subagent and returns its child id immediately. The child works in an independent context and does not see the calling conversation.
- **No follow-up.** The child does not accept messages after it starts. Start independent tasks together and continue useful work while they run.
- **Requires a caller.** A call without a calling agent fails.
- **Provider must be one-shot.** Loading fails if the configured provider inherits parent context or supports continuations, because the tool hands over self-contained work only.

## Install

```sh
pnpm add dsh-tool-subagent-pi
```

## Compose

```yaml
- name: dsh-subagent-pi
  config:
    providerName: pi
- name: dsh-tool-subagent-pi
  config:
    providerName: pi
    toolName: delegate_pi
```

## Configuration

| Field | Default | Meaning |
|---|---|---|
| `providerName` | `pi` | Registered Pi provider the tool starts activations on |
| `toolName` | `delegate_pi` | Model-facing tool name |

## Tool parameters

| Parameter | Required | Meaning |
|---|---|---|
| `description` | yes | Short task description, shown to the user |
| `prompt` | yes | The complete, self-contained task |
| `cwd` | no | Initial child working directory; omission inherits the parent's |

## Model Experience

#### What the model sees

The tool description states that the child works independently, returns a child id, does not accept follow-ups, and that the model should batch independent tasks and keep working rather than poll.

#### Token effect

The activation acknowledgement adds a short child id line. The terminal notice adds Pi's answer or failure detail. Both append after the parent's reusable prefix.

## Known Limitations

- **Pi provider required.** `delegate_pi` starts an activation on the configured provider; without [`dsh-subagent-pi`](../subagent-pi/README.md) (or another `pi` provider) the call fails at activation.
- **Delivery to the parent.** The result is delivered as a parent notice; this tool carries no caller-facing delivery mode.

## Source map

| File | Role |
|---|---|
| [`src/index.ts`](src/index.ts) | Plugin entry: config and `delegate_pi` registration |
