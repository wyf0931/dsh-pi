---
description: "把 Pi coding agent 作为 DeepSeek Harness 子代理运行——两个预稳定插件：一个注册 Pi 后端的 provider，一个注册委派任务给 Pi 的模型可见工具。"
kind: "package-group"
---

# dsh-pi

[English](README.md) | 中文

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)

## 摘要

`dsh-pi` 让 [Pi coding agent](https://github.com/earendil-works/pi-coding-agent) 运行在 DeepSeek Harness（DSH）内部。父 DSH 代理把一个自包含任务委派给 Pi，Pi 用自己的工具和模型在独立上下文中工作，父代理随后收到 Pi 的最终答案作为完成通知。Pi 通过其 SDK 运行在 DSH 进程内，因此无需安装或派生 Pi CLI。

该集成沿用 DSH 社区对 Codex 和 Claude Code 已有的 provider + tool 能力缝：

| 包 | 角色 |
|---|---|
| [`dsh-subagent-pi`](packages/subagent-pi/README.zh.md) | 在共享子代理服务上注册一个一次性 Pi `SubagentProvider` |
| [`dsh-tool-subagent-pi`](packages/tool-subagent-pi/README.zh.md) | 注册 `delegate_pi` 工具，供模型调用把工作交给 Pi |

两个包都处于预稳定状态。其公开 API 可能变化，并遵循 DSH 的[预稳定发布策略](https://github.com/deepseek-ai/deepseek-harness#readme)。

## 要求

- Node >= 22.19.0
- 已挂载子代理与工具能力缝的 DSH（任何暴露 `ctx.subagents` 和 `ctx.tools` 的 `dsh` profile）
- 已配置一个 Pi 模型 provider。Pi 通过自己的 agent 目录（默认 `~/.pi/agent`，或 `PI_CODING_AGENT_DIR`）解析模型，因此首次委派前先在那里配置认证。本包在委派被接受前不启动任何会话，也不安装 provider 凭证。

## 快速开始

把两个包声明为 DSH 组合的依赖，并加到 `dsh` profile 加载的 `cordis.yml` overlay 中：

```yaml
- name: dsh-subagent-pi
  config:
    providerName: pi
    model: deepseek/deepseek-chat
    effort: medium
- name: dsh-tool-subagent-pi
  config:
    providerName: pi
    toolName: delegate_pi
```

通过 `dsh` profile 启动组合后，模型就能看到 `delegate_pi` 工具，每次调用委派一个任务：

```jsonc
{
  "description": "找出失败的测试",
  "prompt": "在本仓库运行测试套件，报告第一个失败测试的名字及其所属文件。",
  "cwd": "."
}
```

该工具立即返回子 id；稍后的完成通知携带 Pi 的最终助手文本。把相互独立的委派一起启动，在它们运行时继续做有用的工作。当只剩等待结果时，结束回合而不是轮询。

## 仓库结构

```
packages/subagent-pi/       Pi 子代理 provider 插件
packages/tool-subagent-pi/  delegate_pi 工具插件
```

## 命令

```sh
pnpm install
pnpm build        # 先出 tsc 类型，再为每个包出 tsdown ESM 运行时产物
pnpm typecheck
pnpm test         # 单元测试；不需要网络或 Pi 凭证
pnpm test:e2e     # DSH_PI_E2E=1；通过已安装的 Pi SDK 真实委派一个任务
pnpm clean
```

## 许可

[MIT](LICENSE)
