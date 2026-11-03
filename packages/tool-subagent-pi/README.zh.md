---
description: "注册 DeepSeek Harness 工具，把自包含任务交给 Pi 子代理 provider。"
kind: "package-reference"
---

# dsh-tool-subagent-pi

[English](README.md) | 中文

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)

## 摘要

`dsh-tool-subagent-pi` 注册 `delegate_pi` 工具：模型把一个自包含任务交给 [Pi coding agent](https://github.com/earendil-works/pi-coding-agent) 的模型可见入口，通过 [`dsh-subagent-pi`](../subagent-pi/README.zh.md) provider 执行。工具接受任务描述、任务提示和可选工作目录，启动一个 Pi 子代理，并返回其子 id。稍后的完成通知携带 Pi 的最终答案。

挂载本包以向模型暴露 Pi 委派。同时挂载 [`dsh-subagent-pi`](../subagent-pi/README.zh.md) 以确保 `pi` provider 存在。

## 契约

- **一次调用、一个任务、一个子。** 一次 `delegate_pi` 调用启动一个 Pi 子代理并立即返回其子 id。子代理在独立上下文中工作，看不到调用方的对话。
- **无续跑。** 子代理启动后不接受后续消息。把相互独立的任务一起启动，在它们运行时继续做有用的工作。
- **要求有调用方。** 无调用方代理的调用失败。
- **provider 必须是一次性的。** 若配置的 provider 继承父上下文或支持续跑，则加载失败，因为本工具只交接自包含工作。

## 安装

最简单的方式是使用 [`dsh-pi` 插件包](../bundle/README.zh.md)，它会一起安装本工具和 [`pi` 提供方](../subagent-pi/README.zh.md)。手动组合时：

```sh
pnpm add dsh-tool-subagent-pi
```

本包声明 `engines.dsh: ^0.2.1-rc.3`；其 DSH 对等依赖由宿主提供。

## 组合

```yaml
- name: dsh-subagent-pi
  config:
    providerName: pi
- name: dsh-tool-subagent-pi
  config:
    providerName: pi
    toolName: delegate_pi
```

## 配置

| 字段 | 默认 | 含义 |
|---|---|---|
| `providerName` | `pi` | 工具启动委派时所用的已注册 Pi provider |
| `toolName` | `delegate_pi` | 模型可见的工具名称 |

## 工具参数

| 参数 | 必填 | 含义 |
|---|---|---|
| `description` | 是 | 任务简述，展示给用户 |
| `prompt` | 是 | 完整、自包含的任务 |
| `cwd` | 否 | 子工作目录；省略则继承父的 |

## 模型体验

#### 模型看到什么

工具描述声明子代理独立工作、返回子 id、不接受续跑，以及模型应批量启动独立任务、继续工作而非轮询。

#### Token 影响

激活确认添加一行短子 id。终结通知添加 Pi 的答案或失败细节。两者都追加在父的可复用前缀之后。

## 已知限制

- **需要 Pi provider。** `delegate_pi` 在配置的 provider 上启动委派；缺少 [`dsh-subagent-pi`](../subagent-pi/README.zh.md)（或其他 `pi` provider）时，调用在激活阶段失败。
- **交付给父。** 结果作为父通知交付；本工具不携带面向调用方的交付模式。

## 源码映射

| 文件 | 角色 |
|---|---|
| [`src/index.ts`](src/index.ts) | 插件入口：配置与 `delegate_pi` 注册 |
