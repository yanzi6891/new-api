# new-api 使用与启动指南

## 1. 你可以怎样使用这个项目

这个项目有三种最常见用法：

### 1.1 作为统一 API 网关

你的客户端只需要调用一个地址，比如：

- `/v1/chat/completions`
- `/v1/responses`
- `/v1/messages`
- `/v1/images/generations`
- `/v1/audio/transcriptions`
- `/v1beta/models/...`

由项目内部自动选择并转发到对应供应商。

### 1.2 作为带后台的 AI 平台

你可以直接把它当作一个有管理后台的服务：

- 管理员添加渠道
- 管理用户
- 设置价格和倍率
- 管理令牌
- 查看日志和统计
- 对接支付和订阅

### 1.3 作为内部中台

如果你是企业内部团队，也可以只开放后台和统一 API，不开放注册、支付等对外运营模块。

## 2. 启动前需要知道的几个事实

### 2.1 后端会内嵌前端构建产物

`main.go` 使用了：

- `//go:embed web/dist`
- `//go:embed web/dist/index.html`

这意味着如果你是“纯源码本地启动”，就要注意 `web/dist` 必须存在。最稳妥的做法是先在 `web/` 下执行一次前端构建。

### 2.2 数据库默认可用 SQLite

如果不设置 `SQL_DSN`，项目会默认使用 SQLite，因此本地快速试跑门槛并不高。

### 2.3 Redis 不是绝对必需

如果不设置 `REDIS_CONN_STRING`，Redis 会被禁用，项目仍然可以启动，只是部分缓存能力不会启用。

### 2.4 生产环境强烈建议显式设置 `SESSION_SECRET`

代码在未设置 `SESSION_SECRET` 时会自动生成随机值，虽然能启动，但重启后旧会话会失效，多机部署也会有问题。因此正式环境请明确设置。

## 3. 推荐启动方式一：Docker Compose

这是最简单、最接近“开箱即用”的方式。

## 3.1 步骤

1. 克隆仓库
2. 打开并修改 `docker-compose.yml`
3. 至少改掉数据库默认密码
4. 建议补充 `SESSION_SECRET`
5. 执行：

```bash
docker compose up -d
```

或旧写法：

```bash
docker-compose up -d
```

## 3.2 默认行为

当前 `docker-compose.yml` 默认会拉起：

- `new-api`
- `redis`
- `postgres`

其中：

- 服务端口默认映射到 `3000`
- 数据目录挂载到 `./data`
- 日志目录挂载到 `./logs`

## 3.3 启动后访问

浏览器打开：

```text
http://localhost:3000
```

首次运行时，前端会根据 `/api/status` 和 `/api/setup` 状态，把你引导到初始化流程。

## 4. 推荐启动方式二：本地源码启动

适合开发、调试和阅读代码。

## 4.1 后端 + 内嵌前端方式

### 第一步：构建前端

在仓库根目录执行：

```powershell
Set-Location web
bun install
$env:DISABLE_ESLINT_PLUGIN='true'
$version = Get-Content ..\\VERSION -Raw -ErrorAction SilentlyContinue
if ([string]::IsNullOrWhiteSpace($version)) {
  $version = git describe --tags --always
}
$env:VITE_REACT_APP_VERSION = $version.Trim()
bun run build
Set-Location ..
```

### 第二步：启动后端

```powershell
go run .
```

如果想指定端口或日志目录：

```powershell
go run . --port 3000 --log-dir .\\logs
```

### 第三步：访问页面

```text
http://localhost:3000
```

## 4.2 前后端分离开发方式

如果你想热更新前端：

### 后端

```powershell
go run .
```

### 前端

```powershell
Set-Location web
bun install
bun run dev
```

默认情况下，Vite 会把这些请求代理到 `http://localhost:3000`：

- `/api`
- `/mj`
- `/pg`

因此管理后台和 Playground 的前端开发体验会更好。

## 5. 首次初始化应该怎么做

项目当前的首次初始化是“页面向导模式”，不是纯命令行模式。

## 5.1 初始化入口

首次打开站点时，前端会检查：

- `/api/status`
- `/api/setup`

若系统未初始化，会自动跳到：

```text
/setup
```

## 5.2 初始化流程

初始化向导会引导你做三件事：

1. 检查数据库状态
2. 创建管理员账号
3. 选择使用模式

使用模式大致可理解为：

- 对外运营
- 自用模式
- 演示模式

初始化完成后，系统会刷新并进入正常登录流程。

## 6. 启动后你该怎么使用这个项目

建议按下面顺序使用。

## 6.1 第一步：登录后台

进入后台后，先确认系统状态、站点名称、基础设置是否正确。

## 6.2 第二步：配置上游渠道

在渠道管理中添加上游供应商信息。一个 channel 通常至少包含：

- 渠道类型
- API key
- 可用模型
- 分组
- Base URL
- 权重 / 优先级
- 模型映射
- 其他设置

这是项目最核心的配置步骤，因为没有 channel 就没有真正的可用上游。

## 6.3 第三步：配置模型与倍率

根据你的运营需求，配置：

- 模型价格
- 分组倍率
- 缓存倍率
- 请求限流
- 自动重试 / 自动禁用策略

## 6.4 第四步：创建令牌或用户

如果你是内部使用，通常直接创建 token 即可。

如果你是对外平台，则还需要：

- 用户注册与登录开关
- 充值 / 订阅
- OAuth
- 邮件验证

## 6.5 第五步：开始调用统一 API

例如 OpenAI 兼容接口：

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "user", "content": "你好，请介绍一下你自己"}
    ]
  }'
```

如果你的上游是 Claude 或 Gemini，也可以通过项目支持的兼容接口进行调用。

## 7. 常见使用场景

### 7.1 用后台调试渠道

后台提供渠道测试、余额检查、上游模型拉取、自动更新等能力，适合管理员排查问题。

### 7.2 用 Playground 做快速调试

前端内置 Playground，可以快速试验不同模型、参数和消息。

### 7.3 用日志页面做运营与排错

你可以查看：

- 调用日志
- 用户日志
- 渠道使用情况
- 配额数据
- 异步任务状态

### 7.4 用部署页面管理模型部署

项目内置了 io.net 部署相关页面，适合做模型部署管理扩展场景。

## 8. 关键环境变量建议

| 变量 | 是否重要 | 说明 |
| --- | --- | --- |
| `PORT` | 常用 | 服务监听端口，默认 3000。 |
| `SESSION_SECRET` | 非常重要 | 会话密钥，生产环境必须显式设置。 |
| `SQL_DSN` | 重要 | 主数据库连接串；不设时默认 SQLite。 |
| `LOG_SQL_DSN` | 可选 | 日志数据库单独分离时使用。 |
| `SQLITE_PATH` | 可选 | SQLite 文件路径。 |
| `REDIS_CONN_STRING` | 推荐 | Redis 连接。 |
| `DEBUG` | 开发时常用 | 打开调试日志。 |
| `ENABLE_PPROF` | 仅调试 | 开启 pprof。 |
| `FRONTEND_BASE_URL` | 特定场景 | 外置前端地址。 |
| `CHANNEL_UPDATE_FREQUENCY` | 可选 | 自动更新渠道频率。 |
| `BATCH_UPDATE_ENABLED` | 可选 | 批量更新开关。 |
| `STREAMING_TIMEOUT` | 常用 | 流式请求超时。 |
| `NODE_TYPE` | 多节点场景 | `master` / `slave`。 |
| `TRUSTED_REDIRECT_DOMAINS` | 安全相关 | 重定向域名白名单。 |

## 9. 几个重要的启动与使用注意点

### 9.1 `SESSION_SECRET` 最好固定

否则服务每次重启都可能导致旧登录态失效。

### 9.2 Docker Compose 里的默认数据库密码不能直接用于生产

当前模板为了快速试跑写了默认口令，正式环境必须修改。

### 9.3 如果你走本地源码启动，前端构建产物是关键前置条件

因为后端会嵌入 `web/dist`，所以不要忽略前端构建。

### 9.4 如果你只想快速体验，最省事的路径是：

1. 用 Docker Compose 启动
2. 打开 `http://localhost:3000`
3. 完成 `/setup`
4. 添加一个上游 channel
5. 创建 token
6. 用 `/v1/chat/completions` 开始调用

## 10. 建议的入门顺序

如果你是第一次接手这个项目，推荐这样上手：

1. 先读 `README.zh_CN.md`
2. 再看 `docker-compose.yml`
3. 跑起来后体验 `/setup`
4. 在后台新增一个渠道
5. 创建 token 做一次实际请求
6. 然后再去看 `router/`、`middleware/`、`controller/relay.go`、`service/channel_select.go`

这样理解速度会比一开始就从所有 Go 文件里硬读更快。
