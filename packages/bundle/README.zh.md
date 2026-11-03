---
description: "可安装的 DeepSeek Harness 插件包：将 Pi 编码代理注册为一次性子代理提供方，并添加 delegate_pi 工具。"
kind: "bundle-reference"
---

# dsh-pi（插件包）

[English](README.md) | 中文

## 概要

`dsh-pi` 是 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）的可安装插件包，把 [Pi 编码代理](https://github.com/earendil-works/pi-coding-agent) 接入 profile。一次安装会插入两行：

| 行 id | 插件模块 | 作用 |
|---|---|---|
| `subagent-pi` | `dsh-pi/subagent` | 注册一次性 `pi` 子代理提供方 |
| `tool-subagent-pi` | `dsh-pi/tool` | 注册模型可调用的 `delegate_pi` 工具 |

具体实现仍位于 [`dsh-subagent-pi`](../subagent-pi/README.zh.md) 与 [`dsh-tool-subagent-pi`](../tool-subagent-pi/README.zh.md)。插件包的子路径入口重新导出这些实现，并为每一行提供独立的本地化元数据和图标。

## 安装

通过 Plugin Manager（`install_bundle`）或 CLI 将插件包目录安装到 DSH profile：

```sh
dsh plugin --profile <profile> add /absolute/path/to/dsh-pi/packages/bundle
```

插件包以链接方式安装，因此请先构建工作区：

```sh
pnpm install
pnpm build
```

如果 profile 不会热加载插件包，请重启 DSH。之后模型即可看到 `delegate_pi`。

## 配置

插件包以默认值插入以下两行。可在 profile 的 `cordis.patch.yml` 中按行 id 覆盖，并完整重述该行需要的字段：

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

提供方字段的完整说明见 [`dsh-subagent-pi`](../subagent-pi/README.zh.md#配置)。

## 要求

- Node >= 22.19.0，且 DSH 运行时满足 `engines.dsh`（`^0.2.1-rc.3`）。
- Pi 已在其自身的 agent 目录中完成认证（默认 `~/.pi/agent`，或 `PI_CODING_AGENT_DIR`）。省略 `model` 时使用 Pi 自己的默认模型与思考级别。

## 展示元数据

`subagent` 与 `tool` 各自附带 `locale/en.json`、`locale/zh.json` 和原创 SVG 图标，并通过 `dsh-pi/subagent/locale/*.json`、`dsh-pi/subagent/icon`、`dsh-pi/tool/locale/*.json`、`dsh-pi/tool/icon` 导出，Plugin Manager 会为两行显示真实的标题、描述和图标。
