# new-api 项目整体分析报告

- 生成时间：2026-04-18
- 分析方式：静态代码阅读 + 本地构建验证
- 本次验证结果：
  - `go build ./...`：通过
  - `bun run build`：通过，但前端产物体积较大并出现 chunk 警告
  - `go test ./...`：未全部通过，失败集中在 `relay/channel/claude`、`relay/helper`、`service`

## 1. 这个项目是做什么的

`new-api` 本质上是一个“统一 AI 网关 + 运营管理后台 + 计费与权限平台”。

它不只是一个简单的 API 转发器，而是把多家上游模型服务整合到一套统一入口里，让管理员和业务方可以用一套系统完成：

- 统一接入多家 AI 供应商
- 给不同用户、分组、令牌分配权限
- 对请求做路由、重试、限流、计费、日志记录
- 提供 Web 控制台做渠道管理、用户管理、充值订阅、统计分析
- 对外暴露 OpenAI 兼容接口，同时兼容 Claude、Gemini、Midjourney、Suno、视频生成等接口形态

换句话说，它的定位更接近：

- 面向企业或团队的 AI API 网关
- 面向运营场景的 AI 资产管理平台
- 面向 SaaS/自托管场景的多租户 AI 接入层

## 2. 它起什么作用

从业务角度看，这个项目主要承担 5 类作用：

### 2.1 统一入口

调用方不需要分别对接 OpenAI、Claude、Gemini、Azure、AWS Bedrock、VolcEngine、Ollama 等多家服务，只需要对接本项目暴露的统一地址即可。

### 2.2 统一治理

项目在 API 请求进入后，会统一处理：

- 身份认证
- 令牌校验
- 用户分组
- 速率限制
- 渠道路由
- 失败重试
- 配额预扣与结算
- 日志与统计

这意味着它不仅是“转发”，更是“治理层”。

### 2.3 统一运营

项目内置了完整后台，管理员可以在 Web 控制台中管理：

- 渠道和上游 key
- 模型映射
- 用户、令牌、分组
- 价格倍率和配额规则
- 充值、订阅、支付回调
- 登录方式和安全策略
- 公告、FAQ、首页内容等运营配置

### 2.4 格式转换

这个项目的另一个重点是“协议兼容与转换”。它并不只做原样透传，而是做了大量格式适配，例如：

- OpenAI Compatible -> Claude Messages
- OpenAI Compatible -> Gemini
- Gemini -> OpenAI Compatible
- OpenAI Responses、Realtime、Audio、Image、Video 等多形态接口统一处理

这使得调用侧可以尽量维持统一协议，而不必为每家上游写一套 SDK 适配。

### 2.5 多节点与部署形态支持

项目具备以下运行形态：

- 单机自托管
- 多节点部署
- 主从节点
- 内嵌前端部署
- 外置前端部署
- Docker / Systemd / Electron 桌面封装

## 3. 它是怎么工作的

## 3.1 启动链路

后端启动入口在 `main.go`。启动过程大致是：

1. 读取 `.env` 与命令行参数
2. 初始化环境变量、日志、倍率配置、HTTP 客户端、Tokenizer
3. 初始化主数据库与日志数据库
4. 初始化 Redis、内存缓存、系统监控、i18n、自定义 OAuth
5. 启动后台任务
6. 初始化 Gin 路由
7. 挂载 `/api`、`/v1`、`/v1beta`、`/mj`、`/kling/v1`、前端静态资源等路由
8. 启动 HTTP 服务

项目还会在启动时开启多个后台任务，例如：

- 渠道自动检测/自动测试
- Codex 凭据自动刷新
- 订阅配额周期性重置
- Midjourney / Task 轮询
- 渠道上游模型更新检查

## 3.2 请求链路

一个典型 API 请求的大致流向是：

客户端 -> Router -> Middleware -> Controller -> Service / Relay -> Model / Upstream -> Response

更细一点：

1. `router/` 决定这个请求属于控制台 API、统一中继 API、视频 API 还是前端页面
2. `middleware/` 处理认证、限流、分发、上下文注入、缓存和安全检查
3. `controller/` 接收请求并做领域编排
4. `service/` 处理计费、路由选择、格式转换、任务逻辑
5. `relay/` 根据渠道类型调用不同 provider adaptor
6. `model/` 负责数据库访问、状态更新、缓存同步

## 3.3 配置链路

这个项目实际上有两条配置链路并行存在：

- 启动时配置：来自环境变量和命令行参数
- 运行时配置：来自数据库中的 `options` 和模块化设置

也就是说，项目不是纯 env 驱动，也不是纯配置表驱动，而是两者混合：

- `common.InitEnv()` 处理端口、数据库、Redis、超时等启动配置
- `model.InitOptionMap()` + `model.UpdateOption()` 处理运行时运营配置
- `setting/config/` 则负责模块化配置对象的注册、导出、加载

这是项目功能强大的来源之一，但同时也增加了配置心智负担。

## 4. 核心能力概览

从代码结构和路由设计来看，这个项目已经不仅是聊天转发器，而是覆盖了较完整的 AI 平台能力：

- 多供应商中继：OpenAI、Claude、Gemini、Azure、AWS、VolcEngine、Ollama、OpenRouter、DeepSeek、Cohere、Cloudflare、Perplexity 等
- 多模态接口：Chat、Responses、Realtime、Image、Audio、Embedding、Rerank、Video
- 异步任务：Midjourney、Suno、视频生成、图生视频/文生视频
- 用户与权限：注册登录、OAuth、Passkey、2FA、Token、分组
- 运营计费：充值、订阅、价格倍率、预扣费、结算、支付回调
- 控制台：渠道管理、模型元数据、部署管理、日志与统计
- 国际化：后端 i18n + 前端 i18n
- 兼容部署：SQLite / MySQL / PostgreSQL，Redis 可选

## 5. 这个项目适合怎么用

### 5.1 作为统一 API 网关

如果你希望团队或产品只对接一个地址，但后端可以按需切换不同大模型供应商，这个项目很适合。

### 5.2 作为 AI 资源管理后台

如果你希望统一管理多个供应商 key、限流策略、模型价格、用户配额和调用日志，这个项目也很适合。

### 5.3 作为面向外部用户的 AI 平台

因为它内置了用户、支付、充值、订阅、公告、FAQ、首页等功能，它可以被用作一个对外运营的 AI 服务门户。

### 5.4 作为内部中台

如果你是企业内部平台团队，它可以充当 AI 接入中台，把模型调用治理、审计和权限统一起来。

## 6. 从代码规模看，这不是一个“小项目”

本次仓库扫描观察到：

- Go 文件约 528 个
- 前端 `web/src` 下 JS/JSX 文件约 386 个
- 测试文件约 23 个
- `relay/channel` 下有 37 个 provider / adaptor 子目录

这说明项目已经进入“平台型项目”规模，而不是“单一功能项目”规模。其维护重点不只是功能开发，还包括：

- 架构边界控制
- 配置治理
- 测试体系
- 性能与安全
- 运营可维护性

## 7. 当前实现的几个明显特点

### 7.1 优点

- 功能覆盖非常全，既有 API 网关，也有控制台和运营能力
- 供应商适配层丰富，支持多种协议和模型形态
- 分层结构整体清晰，Router / Controller / Service / Model 基本成立
- 前后端都做了国际化
- 数据库兼容意识较强，明确支持 SQLite / MySQL / PostgreSQL

### 7.2 代价

- 代码量大，认知成本高
- 配置入口较多，env 与 DB option 容易混用
- Relay 相关逻辑分布广，跨模块联动复杂
- 测试数量相对项目规模偏少，且当前已有红测

## 8. 本次本地验证结论

### 8.1 构建情况

- `go build ./...` 通过，说明整体可编译
- `bun run build` 通过，说明前端可生成生产构建

### 8.2 测试情况

`go test ./...` 未全部通过，失败点主要在：

- `relay/channel/claude`
  - `TestRequestOpenAI2ClaudeMessage_IgnoresUnsupportedFileContent`
  - `TestRequestOpenAI2ClaudeMessage_SupportsPDFFileContent`
  - `TestRequestOpenAI2ClaudeMessage_ConvertsTextFileContentToText`
- `relay/helper`
  - `TestStreamScannerHandler_StreamStatus_PreInitialized`
- `service`
  - `TestObserveChannelAffinityUsageCacheByRelayFormat_UnsupportedModeKeepsEmpty`

这说明当前项目虽然可构建，但回归测试并不是全绿状态。

## 9. 一句话总结

`new-api` 是一个功能非常完整的“多供应商 AI 网关 + 后台管理 + 运营计费平台”，适合做统一 AI 接入层、自托管 AI 平台或企业内部 AI 中台。它已经具备成熟平台的雏形，但代码规模、配置复杂度、前端体积和测试稳定性也说明它仍然有明显的持续优化空间。
