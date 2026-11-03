---
description: "把 Pi coding agent 注册为 DeepSeek Harness 的一次性子代理 provider——每次委派打开一个进程内 Pi 会话并返回最终答案。"
kind: "package-reference"
---

# dsh-subagent-pi

[English](README.md) | 中文

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)

## 摘要

`dsh-subagent-pi` 注册一个由 [Pi coding agent](https://github.com/earendil-works/pi-coding-agent) 支持的一次性子代理 provider。每次委派在 DSH 进程内打开一个 Pi 会话，运行一个任务，并把 Pi 的最终助手文本作为子结果返回。Pi 保留自己的工具、模型选择和对话；父代理只看到答案。

选择本包是为了让 DSH 代理把自包含的工作交给 Pi。搭配 [`dsh-tool-subagent-pi`](../tool-subagent-pi/README.zh.md) 使用：后者注册模型可见的工具，发起委派。

## 契约

- **一次性、独立上下文。** provider 不声明任何启动时能力（`agentOptions`、`agentPreset`、`outputSchema`、`depthLimit`），也不继承父上下文。每次委派只承载一个文本任务。
- **Pi 在进程内运行。** provider 动态导入 Pi SDK，每次被接受的委派打开一个会话。不派生 Pi CLI，也不创建 DSH 子会话。
- **发布后的结果绝不 reject。** 正常回合以 `completed` 结束；Pi 的协作式中止或父取消以 `aborted` 结束；回合失败以 `error` 结束，附带固定的、不含凭证的诊断。释放时会释放 Pi 会话。
- **配置在加载时读取一次。** Pi 全局配置目录、模型和思考级别来自插件配置，而非每次运行的发现。

## 安装

```sh
pnpm add dsh-subagent-pi
```

本包依赖 `@earendil-works/pi-coding-agent`，并把 DSH 能力缝声明为对等依赖；Pi 1.4.0 是本发行版验证过的版本。

## 组合

把本包挂载到 `dsh` profile 加载的 `cordis.yml` overlay 中：

```yaml
- name: dsh-subagent-pi
  config:
    providerName: pi
    model: deepseek/deepseek-chat
    effort: medium
```

搭配 [`dsh-tool-subagent-pi`](../tool-subagent-pi/README.zh.md) 使用，后者的工具按名称选择本 provider。

## 配置

| 字段 | 默认 | 含义 |
|---|---|---|
| `providerName` | `pi` | provider 在共享子代理服务上注册的名称 |
| `agentDir` | Pi 的默认 | Pi 全局配置目录；`PI_CODING_AGENT_DIR` 覆盖 Pi 的默认 |
| `model` | Pi 自己的选择 | `provider/model` 形式的模型；从会话读回以确认已生效 |
| `effort` | Pi 自己的选择 | 思考级别：`off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max` |
| `disallowedTools` | `[]` | 每次委派会话中排除的工具名称 |
| `timeoutMs` | 仅随父取消 | 提示被接受后回合的超时（毫秒） |

未知模型、Pi 未生效的模型、无法识别的思考级别或 Pi 未生效的思考级别都会在启动时以类型化错误失败。预信任被委派的工作目录不可配置：嵌入会话没有人类回答信任提示。

## 环境

provider 在每次委派时读取 `PI_CODING_AGENT_DIR` 来解析 Pi 全局配置目录。首次委派前先在该目录中配置 Pi 的模型 provider 和认证；本包不安装也不代理任何凭证。

## 模型体验

#### 子会话看到什么

被委派的 Pi 会话收到任务文本和解析后的子工作目录。Pi 自己的模型、工具、技能和扩展决定运行；配置提供模型、思考级别和工具排除。

#### 父会话看到什么

父会话收到 Pi 最后一条非空助手文本作为子结果。Pi 的推理、工具流量和转录历史留在 Pi 内；父会话永远看不到。

#### Token 影响

子请求独立于父的缓存前缀：Pi 为自己的上下文和回合付费，父只为完成通知中返回的答案付费。

## 已知限制

- **一次性文本。** 不支持续跑、恢复、结构化输出或进度流。取消会停止运行；Pi 在取消前所做的文件改动保留。
- **无 Pi 会话发现。** provider 每次委派打开新会话，不恢复先前的 Pi 对话。
- **只有根文本。** 只有根助手文本进入答案；嵌套和旁路请求的输出不会被呈现。
- **诊断而非转录。** 失败的运行报告固定的阶段和类别诊断，绝不包含 Pi 的原始错误或环境值。

## 源码映射

| 文件 | 角色 |
|---|---|
| [`src/index.ts`](src/index.ts) | 插件入口：配置、provider 注册、诊断观察者 |
| [`src/run.ts`](src/run.ts) | 一次性执行、答案选择、取消、超时、失败阶段 |
| [`src/session.ts`](src/session.ts) | 打开 Pi 会话、读回模型和思考级别、释放 |
| [`src/sdk.ts`](src/sdk.ts) | 惰性 Pi SDK 导入和安装探测 |
| [`src/task.ts`](src/task.ts) | 文本任务校验和答案收集 |
| [`src/environment.ts`](src/environment.ts) | Pi agent 目录和按 cwd 的会话目录 |
| [`src/failures.ts`](src/failures.ts) | 类型化失败阶段和类别 |
