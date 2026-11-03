---
description: "可安装的 DeepSeek Harness 插件包：把 Pi 编码代理注册为一次性子代理提供方、delegate_pi 工具，并提供该提供方的配置页面。"
kind: "bundle-reference"
---

# dsh-pi（插件包）

[English](README.md) | 中文

## 概要

`dsh-pi` 是 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）的可安装插件包，把 [Pi 编码代理](https://github.com/earendil-works/pi-coding-agent) 接入 profile。一次安装会插入两行，并提供一个配置页面：

| 行 id | 插件模块 | 作用 |
|---|---|---|
| `subagent-pi` | `dsh-pi` | 注册一次性 `pi` 子代理提供方，并承载配置页面 |
| `tool-subagent-pi` | `dsh-pi/tool` | 注册模型可调用的 `delegate_pi` 工具 |

具体实现仍位于 [`dsh-subagent-pi`](../subagent-pi/README.zh.md) 与 [`dsh-tool-subagent-pi`](../tool-subagent-pi/README.zh.md)。插件包重新导出这些实现，为每一行提供独立的本地化元数据和图标，并附带浏览器半（`client.js`），在 Plugins 页面注册提供方的配置页。

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

## 在 UI 中配置

打开侧边栏的 **Plugins**，选择已安装的 `dsh-pi`，展开 **Pi Subagent** 行并点击 **Configure**。页面可编辑：

| 字段 | 含义 |
|---|---|
| 模型 | `provider/model`，例如 `deepseek/deepseek-flash`；留空使用 Pi 自己的默认模型 |
| 思考级别 | `off` 到 `max`；留空使用 Pi 自己的默认级别 |
| 回合超时 | prompt 被接受后的毫秒数；留空表示只在父回合取消时取消 |
| 排除的工具 | 逗号分隔的 Pi 工具名；留空表示不排除 |

**保存** 会通过配置编辑器写入 profile 覆盖层，并在下一次委派生效，无需重启插件。**恢复默认** 会清空这四个字段，回到插件包继承的值。页面跟随当前 UI 语言，并在发生并发修改时报告冲突，而不是覆盖更新的内容。

`providerName` 和 `agentDir` 只保留在 YAML 中，因为它们标识提供方实例及其 Pi 目录。

## 通过 YAML 配置

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

提供方字段的完整说明见 [`dsh-subagent-pi`](../subagent-pi/README.zh.md#配置)。UI 保存写入的是同一层 profile 配置，因此两条路径始终一致。

## 要求

- Node >= 22.19.0，且 DSH 运行时满足 `engines.dsh`（`^0.2.1-rc.3`）。
- Pi 已在其自身的 agent 目录中完成认证（默认 `~/.pi/agent`，或 `PI_CODING_AGENT_DIR`）。省略 `model` 时使用 Pi 自己的默认模型与思考级别。

## 展示元数据

提供方行使用插件包根目录的 `locale/en.json`、`locale/zh.json` 和 `icon.svg`。工具行使用 `tool/locale/*.json` 与 `tool/icon`。旧版 `dsh-pi/subagent` 子路径保留自己的副本，供仍按该名称插入的组合使用。因此两行在 Plugin Manager 中都会显示真实的标题、描述和图标。

## 浏览器半

`client.js` 声明 `dsh.client`（`platform: web`、`immediately: true`，依赖 `@deepseek-ai/dsh-client-ui-plugin-manager`）。它把 `plugins.row.config` 注册在 `dsh-pi#subagent-pi` 键上，通过 `ctx.configForms` 读取 `subagent-pi` 设置命名空间并渲染表单。Host 把 `model`、`effort`、`timeoutMs`、`disallowedTools` 声明为 volatile Config 字段，因此保存会更新运行中提供方的引用，而不是重新挂载它。
