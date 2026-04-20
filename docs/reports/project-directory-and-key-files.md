# new-api 目录与关键文件说明

## 1. 说明

这个仓库文件数量很多，不适合逐个文件做平铺式解释。下面按“根目录 -> 一级目录 -> 关键二级目录 -> 关键文件”的方式说明其职责，既覆盖整体，又能帮助你快速定位代码入口。

## 2. 根目录关键文件

| 路径 | 作用 |
| --- | --- |
| `main.go` | 后端启动入口，负责资源初始化、后台任务启动、Gin 服务与前端静态资源挂载。 |
| `go.mod` / `go.sum` | Go 模块定义与依赖锁定。实际模块名为 `github.com/QuantumNous/new-api`。 |
| `Dockerfile` | 多阶段构建：先用 Bun 构建前端，再用 Go 编译后端，最后打包到 Debian 运行镜像。 |
| `docker-compose.yml` | 推荐部署模板，默认拉起 `new-api + redis + postgres`，并预留 MySQL 配置。 |
| `.env.example` | 环境变量示例，涵盖端口、数据库、Redis、调试、超时、安全与支付相关项。 |
| `makefile` | 简化开发命令，包含前端构建和后端启动。 |
| `new-api.service` | systemd 服务模板，适合 Linux 守护进程部署。 |
| `README.md` / `README.zh_CN.md` / 其他语言 README | 项目总说明、功能简介与部署入口。 |
| `VERSION` | 构建时注入版本号。 |
| `AGENTS.md` / `CLAUDE.md` | 项目开发约定与 AI 协作说明，不属于运行期逻辑，但对维护方式很重要。 |

## 3. 根目录一级目录说明

| 目录 | 作用 |
| --- | --- |
| `.github/` | GitHub 协作与 CI/CD 配置，包括 issue 模板、PR 模板、release / docker / electron workflow。 |
| `.cursor/` | Cursor 编辑器相关配置，和业务运行无关。 |
| `.idea/` | JetBrains IDE 元数据，和业务运行无关。 |
| `bin/` | 历史迁移脚本和一些辅助脚本。 |
| `common/` | 通用基础能力库，包含环境变量、JSON、Redis、缓存、加密、字符串、URL 校验、日志辅助等。 |
| `constant/` | 纯常量包，不放业务逻辑。主要存放上下文 key、渠道类型、任务类型、缓存键等。 |
| `controller/` | HTTP 控制器层，处理请求入参、响应输出、领域编排。 |
| `data/` | 运行期数据目录，常用于 SQLite 数据文件挂载。 |
| `docs/` | 项目附加文档、安装说明、支付接入说明、OpenAPI JSON、图片资源等。 |
| `dto/` | 请求/响应 DTO 定义，承担协议层结构体和跨层数据载体角色。 |
| `electron/` | Electron 桌面封装，用于把服务包装成桌面应用。 |
| `i18n/` | 后端国际化。 |
| `logger/` | 日志设施封装。 |
| `logs/` | 运行日志目录。 |
| `middleware/` | Gin 中间件，处理认证、限流、请求体缓存、分发、统计、性能保护等。 |
| `model/` | 数据模型与数据库访问层，负责 GORM 模型、缓存、查询、迁移、持久化。 |
| `oauth/` | 标准和自定义 OAuth 提供方实现。 |
| `pkg/` | 内部独立包，目前主要是缓存与 io.net 部署相关能力。 |
| `relay/` | 中继核心，负责协议适配、上游请求构造、响应转换、流式处理与 provider adaptor。 |
| `router/` | 路由注册层，负责 `/api`、`/v1`、`/mj`、视频和前端路由挂载。 |
| `service/` | 业务服务层，负责渠道选择、计费、格式转换、下载、Passkey、订阅任务等。 |
| `setting/` | 配置模块集合，拆分为系统、运营、性能、倍率、控制台等配置域。 |
| `types/` | 通用类型定义，例如错误类型、文件来源、价格结构、请求元信息等。 |
| `web/` | React 前端控制台与门户。 |

## 4. 重点二级目录说明

## 4.1 `common/`

| 子目录 / 文件 | 作用 |
| --- | --- |
| `common/json.go` | 项目约定的 JSON 包装层。按仓库规范，业务代码应该优先通过这里进行 JSON 编解码。 |
| `common/init.go` | 解析命令行参数与启动时环境变量，是后端启动配置入口。 |
| `common/constants.go` | 全局运行变量和默认值。 |
| `common/redis.go` | Redis 初始化与常用缓存操作。 |
| `common/database.go` / `common/env.go` / `common/gin.go` | 启动期与基础设施相关通用能力。 |
| `common/limiter/` | 限流器基础实现。 |

## 4.2 `controller/`

| 文件 / 方向 | 作用 |
| --- | --- |
| `controller/relay.go` | 统一中继控制器核心，负责构造 `RelayInfo`、计费、重试、调用具体 relay handler。 |
| `controller/setup.go` | 首次初始化流程，处理 `/api/setup`。 |
| `controller/channel.go` | 渠道管理核心控制器，功能很多，包含渠道 CRUD、拷贝、批量操作、多 key 管理等。 |
| `controller/user.go` | 用户注册、登录、个人资料、配额等。 |
| `controller/deployment.go` | io.net 模型部署管理相关控制器。 |
| `controller/midjourney.go` / `controller/task.go` | 异步任务与 Midjourney 相关控制逻辑。 |
| `controller/misc.go` | `/api/status`、公告、关于页、站点配置聚合输出等杂项接口。 |

## 4.3 `middleware/`

| 文件 | 作用 |
| --- | --- |
| `middleware/auth.go` | 用户、管理员、Root、Token 等认证授权。 |
| `middleware/distributor.go` | 核心分发逻辑，决定请求应该走哪个 channel。 |
| `middleware/rate-limit.go` | 全局、关键操作、搜索等限流。 |
| `middleware/model-rate-limit.go` | 模型请求级限流。 |
| `middleware/performance.go` | 系统性能保护。 |
| `middleware/stats.go` | 请求统计与观测数据。 |
| `middleware/turnstile-check.go` | Cloudflare Turnstile 验证。 |
| `middleware/jimeng_adapter.go` / `middleware/kling_adapter.go` | 特定接口格式转接。 |

## 4.4 `model/`

| 文件 | 作用 |
| --- | --- |
| `model/main.go` | 数据库初始化、迁移、跨数据库兼容处理核心。 |
| `model/channel.go` | 渠道模型与多 key 逻辑。 |
| `model/user.go` | 用户模型、配额变更、统计相关逻辑。 |
| `model/token.go` | 令牌模型与额度扣减。 |
| `model/option.go` | 运行时配置的数据库持久化与 `OptionMap` 同步。 |
| `model/log.go` | 调用日志模型。 |
| `model/pricing*.go` | 价格、倍率、默认定价、刷新逻辑。 |
| `model/midjourney.go` / `model/task.go` | 异步任务状态模型。 |

## 4.5 `oauth/`

| 目录 / 文件 | 作用 |
| --- | --- |
| `oauth/github.go` / `discord.go` / `oidc.go` / `linuxdo.go` | 各 OAuth 提供方接入实现。 |
| `oauth/provider.go` / `registry.go` | 统一 provider 注册与获取。 |
| `oauth/generic.go` | 通用 OAuth 逻辑。 |

## 4.6 `pkg/`

| 子目录 | 作用 |
| --- | --- |
| `pkg/cachex/` | 内部缓存组件，偏基础设施。 |
| `pkg/ionet/` | io.net 部署与硬件资源调用封装，是“模型部署”功能的底层依赖。 |

## 4.7 `relay/`

| 子目录 / 文件 | 作用 |
| --- | --- |
| `relay/relay_adaptor.go` | provider adaptor 注册入口，根据渠道类型返回具体 adaptor。 |
| `relay/common/` | 中继公共上下文、计费辅助、请求转换、流状态等。 |
| `relay/helper/` | 中继辅助函数，例如模型映射、流式扫描、合法请求检查。 |
| `relay/channel/` | 所有供应商适配器实现，是项目最复杂的部分之一。 |
| `relay/common_handler/` | 通用 handler 逻辑。 |
| `relay/reasonmap/` | Reasoning / thinking 相关映射逻辑。 |
| `relay/audio_handler.go` / `image_handler.go` / `responses_handler.go` 等 | 不同能力域的主 handler。 |

### `relay/channel/` 下的 provider 目录

这里是项目最有“AI 网关”特色的部分，每个目录通常代表一个供应商或协议族。当前可见目录包括：

- `openai/`
- `claude/`
- `gemini/`
- `aws/`
- `ali/`
- `baidu/`
- `baidu_v2/`
- `cloudflare/`
- `codex/`
- `cohere/`
- `coze/`
- `deepseek/`
- `dify/`
- `jimeng/`
- `jina/`
- `minimax/`
- `mistral/`
- `mokaai/`
- `moonshot/`
- `ollama/`
- `openrouter/`
- `palm/`
- `perplexity/`
- `replicate/`
- `siliconflow/`
- `submodel/`
- `tencent/`
- `vertex/`
- `volcengine/`
- `xai/`
- `xinference/`
- `xunfei/`
- `zhipu/`
- `zhipu_4v/`
- `task/`（任务类 adaptor 聚合目录）

这部分目录的核心作用是“把统一请求结构翻译成各家上游接口能理解的结构，再把响应翻译回统一输出”。

## 4.8 `router/`

| 文件 | 作用 |
| --- | --- |
| `router/main.go` | 路由总入口。 |
| `router/api-router.go` | 控制台 API、用户、渠道、日志、订阅、部署等管理接口。 |
| `router/relay-router.go` | OpenAI 兼容、Claude、Gemini、Midjourney、Suno 等中继 API。 |
| `router/video-router.go` | 视频生成与视频代理接口。 |
| `router/dashboard.go` | 老版 dashboard 兼容接口。 |
| `router/web-router.go` | 前端静态资源与 SPA 路由回退。 |

## 4.9 `service/`

| 子目录 / 文件 | 作用 |
| --- | --- |
| `service/channel_select.go` | 核心渠道选择算法。 |
| `service/convert.go` | 各协议之间的格式转换。 |
| `service/billing*.go` | 计费、订阅、支付会话相关逻辑。 |
| `service/http_client.go` | 上游 HTTP 客户端、代理支持与 SSRF 保护联动。 |
| `service/tokenizer.go` | Tokenizer 初始化与 token 估算。 |
| `service/subscription_reset_task.go` | 订阅额度重置后台任务。 |
| `service/passkey/` | WebAuthn / Passkey 相关服务。 |
| `service/openaicompat/` | OpenAI Responses / Chat 等兼容转换逻辑。 |

## 4.10 `setting/`

| 子目录 | 作用 |
| --- | --- |
| `setting/config/` | 配置对象注册、导出、从 DB 加载的统一机制。 |
| `setting/console_setting/` | 控制台页面内容配置，例如公告、FAQ、API 信息卡。 |
| `setting/model_setting/` | 模型相关配置。 |
| `setting/operation_setting/` | 运营配置，例如支付、配额、自动禁用、状态码规则。 |
| `setting/performance_setting/` | 性能参数配置。 |
| `setting/ratio_setting/` | 模型、分组、缓存等倍率和价格配置。 |
| `setting/reasoning/` | Reasoning / thinking 相关配置。 |
| `setting/system_setting/` | 站点地址、OIDC、Passkey、法律文本等系统配置。 |

## 4.11 `types/`

这里主要是跨模块复用的基础类型，例如：

- `types/error.go`
- `types/channel_error.go`
- `types/file_source.go`
- `types/price_data.go`
- `types/request_meta.go`

它们的作用是减少 DTO、Service、Relay 之间的硬编码耦合。

## 4.12 `web/`

| 子目录 / 文件 | 作用 |
| --- | --- |
| `web/package.json` | 前端依赖和脚本入口，项目约定优先使用 Bun。 |
| `web/vite.config.js` | Vite 构建、代理和 chunk 策略配置。 |
| `web/public/` | 前端静态资源，如 logo、favicon、图片。 |
| `web/src/` | React 前端源码。 |
| `web/dist/` | 前端构建产物，后端通过 `//go:embed` 嵌入。 |
| `web/node_modules/` | 前端依赖目录，不属于源码分析重点。 |

### `web/src/` 子目录

| 子目录 | 作用 |
| --- | --- |
| `components/` | 可复用组件。 |
| `constants/` | 前端常量。 |
| `context/` / `contexts/` | React Context 状态。 |
| `helpers/` | API 调用、渲染辅助、认证工具等。 |
| `hooks/` | 自定义 Hook，分领域封装数据获取和 UI 逻辑。 |
| `i18n/` | 前端国际化。 |
| `pages/` | 页面级组件。 |
| `services/` | 前端服务封装。 |

### `web/src/components/` 主要子目录

| 子目录 | 作用 |
| --- | --- |
| `auth/` | 登录、注册、找回密码、OAuth 回调、2FA 等认证组件。 |
| `common/` | 通用组件。 |
| `dashboard/` | 首页数据看板组件。 |
| `layout/` | 页面布局、边栏、页脚、初始化检查。 |
| `model-deployments/` | 模型部署页面组件。 |
| `playground/` | 在线调试台、消息渲染、SSE 观察器等。 |
| `settings/` | 管理后台设置页面相关组件。 |
| `setup/` | 首次初始化向导。 |
| `table/` | 表格类通用组件。 |
| `topup/` | 充值、套餐、邀请卡片等。 |

### `web/src/hooks/` 主要子目录

这些 Hook 按业务域拆分，例如：

- `channels/`
- `chat/`
- `common/`
- `dashboard/`
- `model-deployments/`
- `model-pricing/`
- `models/`
- `playground/`
- `redemptions/`
- `subscriptions/`
- `task-logs/`
- `tokens/`
- `usage-logs/`
- `users/`

这表明前端已经进入“按领域拆 Hook”的中大型项目结构。

## 5. 关键文件解读

## 5.1 `main.go`

这是整个后端的总引导文件，主要职责：

- 初始化资源
- 初始化数据库和 Redis
- 启动后台任务
- 设置会话和中间件
- 挂载路由
- 启动 HTTP 服务
- 注入前端统计脚本

它决定了系统是如何“活起来”的。

## 5.2 `common/init.go`

这个文件负责命令行参数和启动环境变量的解析，是项目启动配置的真正入口之一。`--port`、`--log-dir`、`SESSION_SECRET`、`SQLITE_PATH` 等都从这里进入全局运行态。

## 5.3 `model/main.go`

数据库初始化核心。这里不仅负责连接数据库，还承担：

- SQLite / MySQL / PostgreSQL 分流
- 迁移
- 日志库初始化
- 跨数据库兼容细节

如果你要研究“这个项目如何兼容三种数据库”，这里是最关键的文件之一。

## 5.4 `model/option.go`

这是“运行时配置”核心文件。它把数据库内的配置项同步到内存中的 `OptionMap`，再分发给各个模块。很多后台设置页最终都会落到这里。

## 5.5 `router/api-router.go`

这是业务后台 API 总路由，体量很大，几乎覆盖了：

- 用户
- 渠道
- 令牌
- 订阅
- Redemptions
- 日志
- 模型元数据
- 部署管理

如果你想快速知道“后台到底提供了哪些管理功能”，读这个文件最直观。

## 5.6 `router/relay-router.go`

这是项目“AI 网关”身份的核心路由文件，定义了：

- `/v1/chat/completions`
- `/v1/responses`
- `/v1/messages`
- `/v1/audio/*`
- `/v1/images/*`
- `/v1beta/models/*`
- `/mj/*`
- `/suno/*`

也就是外部调用方最关心的 API 面。

## 5.7 `middleware/distributor.go`

这个文件决定请求走哪个上游渠道。它会综合：

- 请求模型名
- 用户分组
- 令牌模型权限
- 指定 channel
- 自动分组
- affinity 偏好
- 重试状态

这是“智能路由”的核心。

## 5.8 `service/channel_select.go`

这个文件进一步实现了“随机满足条件渠道选择”和“auto 分组跨组重试”等细节，是路由策略落地的重要逻辑。

## 5.9 `controller/relay.go`

这个文件是中继业务编排核心。它把鉴权后的请求送进统一 relay 流程，并负责：

- 构造中继上下文
- token 预估与计费
- 调用具体 handler
- 错误归一化
- 失败重试

## 5.10 `relay/relay_adaptor.go`

这里是 adaptor 注册中心。每一种 provider 的实现最终都要在这里被选择和返回。新增渠道时，这里是关键接入点之一。

## 5.11 `relay/common/relay_info.go`

中继上下文结构定义在这里。它记录：

- 渠道信息
- 模型映射
- 是否流式
- 是否支持 `stream_options`
- 价格和计费数据
- 上游模型名与原始模型名

这个结构是 relay 逻辑的上下文骨架。

## 5.12 `service/convert.go`

这是协议转换最典型的文件之一，例如 Claude 和 OpenAI 之间的转换。很多“兼容能力”不是在 router 层完成，而是在这里完成。

## 5.13 `web/src/index.jsx`

前端根入口，负责挂载：

- `StatusProvider`
- `UserProvider`
- `ThemeProvider`
- `BrowserRouter`
- `PageLayout`
- i18n

它定义了前端应用的全局运行壳。

## 5.14 `web/src/App.jsx`

前端页面总路由文件，定义登录、设置、渠道、令牌、日志、Playground、部署、初始化等页面入口。

## 5.15 `web/src/helpers/api.js`

这是前端统一 API 访问层，封装了 axios 实例、全局错误处理、去重请求和部分 Playground 请求构造逻辑。

## 5.16 `web/src/components/setup/SetupWizard.jsx`

这个文件说明项目的首次初始化是“页面向导驱动”的，而不是靠命令行硬编码。首次访问时用户会被引导创建管理员并选择使用模式。

## 6. 如何理解这个目录结构

如果要用一句话总结整个仓库结构，可以这样理解：

- `router/` 决定“进哪扇门”
- `middleware/` 决定“先过哪些安检和路由规则”
- `controller/` 决定“这个请求要做哪件事”
- `service/` 决定“业务怎么编排”
- `relay/` 决定“怎么和上游 AI 服务说话”
- `model/` 决定“数据怎么存取”
- `setting/` 决定“系统运行规则是什么”
- `web/` 决定“管理后台如何展示和操作”

只要按这个思路看代码，定位问题会快很多。
