# ServerAddress 是什么，以及应该填什么

更新时间：2026-04-15

## 1. 先说结论

`ServerAddress` 不是支付宝或微信“发给你的一个参数”。

它是你自己的 `new-api` 站点对外公网地址，也就是：

- 用户浏览器能访问到的地址
- 支付平台异步回调也能访问到的地址

对你当前项目来说，它一般应该长这样：

```text
https://api.example.com
```

或者：

```text
https://newapi.example.com
```

不是下面这些：

- `http://localhost:3000`
- `http://127.0.0.1:3000`
- 服务器内网地址
- Docker 容器内部地址
- 只有你自己局域网能访问的地址

## 2. 在这套代码里，`ServerAddress` 实际有什么作用

当前项目里，`ServerAddress` 会影响很多地方，其中支付最关键。

支付回调地址的计算逻辑是：

- 如果没有配置 `CustomCallbackAddress`
- 就使用 `ServerAddress`

当前代码：

- [service/epay.go](D:/new-api/new-api/service/epay.go)
- [controller/topup_official.go](D:/new-api/new-api/controller/topup_official.go)

也就是说，你现在这套支付宝和微信官方支付的回调地址，默认就是：

- 支付宝：`<ServerAddress>/api/alipay/notify`
- 微信：`<ServerAddress>/api/wechatpay/notify`

例如如果你填的是：

```text
https://newapi.example.com
```

那么实际回调地址就是：

```text
https://newapi.example.com/api/alipay/notify
https://newapi.example.com/api/wechatpay/notify
```

## 3. 代码里 `ServerAddress` 存在哪里

### 3.1 默认值

当前默认值在：

- [setting/system_setting/system_setting_old.go](D:/new-api/new-api/setting/system_setting/system_setting_old.go)

默认是：

```go
var ServerAddress = "http://localhost:3000"
```

这只是开发默认值，不适合正式支付。

### 3.2 配置项映射

`ServerAddress` 会被读写到系统配置里：

- [model/option.go](D:/new-api/new-api/model/option.go)

### 3.3 前端设置入口

你现在可以在后台页面里直接改：

- [web/src/components/settings/SystemSetting.jsx](D:/new-api/new-api/web/src/components/settings/SystemSetting.jsx)
- [web/src/pages/Setting/Payment/SettingsGeneralPayment.jsx](D:/new-api/new-api/web/src/pages/Setting/Payment/SettingsGeneralPayment.jsx)

页面上的文案也已经明确写了：

- “该服务器地址将影响支付回调地址以及默认首页展示的地址，请确保正确配置”

## 4. 我应该从哪里“获取” `ServerAddress`

准确说，不是“获取”，而是“确定并填写”。

它来自你自己的部署方案。

### 场景 1：你已经有正式域名

例如你的网站已经对外使用：

```text
https://api.yourdomain.com
```

那么 `ServerAddress` 就填这个。

### 场景 2：你通过 Nginx / Caddy / 宝塔反代到 Go 服务

例如：

- 公网域名：`https://newapi.example.com`
- Go 服务实际监听：`http://127.0.0.1:3000`

那么 `ServerAddress` 也应该填：

```text
https://newapi.example.com
```

不是内部监听地址 `http://127.0.0.1:3000`。

### 场景 3：你还没有公网域名

那你现在还不能把官方支付正式联调做完整。

因为：

- 支付宝回调要访问你的服务
- 微信支付回调也要访问你的服务

如果没有公网可达地址，支付成功之后回调链路就不完整。

## 5. 应该填主站域名还是 API 子域名

原则很简单：

- 哪个地址最终对外承载这套 `new-api` 服务，就填哪个

如果你的前后端就是同一个站点，例如：

```text
https://newapi.example.com
```

那就直接填这个。

如果你把 API 独立到子域名，例如：

```text
前端站点：https://www.example.com
API 服务：https://api.example.com
```

那就要看你的 `new-api` 实际对外服务入口是谁。

对当前这套代码来说，支付回调和很多后台链接都依赖 `new-api` 本身的服务地址，所以通常应该填：

```text
https://api.example.com
```

前提是这个域名本身就能正确处理：

- `/api/alipay/notify`
- `/api/wechatpay/notify`
- 用户前端充值相关接口

## 6. 一定要用 HTTPS 吗

对正式支付，应该使用公网 HTTPS。

原因很直接：

- 支付平台回调通常要求正式、安全、稳定的地址
- 你当前是正式环境联调，不应该继续用 `http://localhost`
- 反向代理、浏览器、支付平台都会更倾向 HTTPS 正式域名

所以建议你把正式 `ServerAddress` 固定为：

```text
https://你的正式域名
```

## 7. `CustomCallbackAddress` 和 `ServerAddress` 是什么关系

当前项目还有一个配置项：

- `CustomCallbackAddress`

相关代码：

- [model/option.go](D:/new-api/new-api/model/option.go)
- [web/src/pages/Setting/Payment/SettingsPaymentGateway.jsx](D:/new-api/new-api/web/src/pages/Setting/Payment/SettingsPaymentGateway.jsx)
- [service/epay.go](D:/new-api/new-api/service/epay.go)

逻辑是：

- 如果 `CustomCallbackAddress` 为空，回调基地址使用 `ServerAddress`
- 如果 `CustomCallbackAddress` 不为空，回调基地址优先使用 `CustomCallbackAddress`

这意味着：

- 大多数场景只需要正确填写 `ServerAddress`
- 只有你前台访问地址和支付回调专用地址不同的时候，才需要单独配 `CustomCallbackAddress`

## 8. 你当前最常见的错误填法

### 8.1 填成 `localhost`

错误示例：

```text
http://localhost:3000
```

支付平台访问不了你电脑上的 localhost。

### 8.2 填成服务器内网地址

错误示例：

```text
http://10.0.0.5:3000
```

支付平台也访问不了你的私网 IP。

### 8.3 填成带路径的地址

不建议这样填：

```text
https://newapi.example.com/console
```

`ServerAddress` 应该是站点基地址，不应带业务路径。

### 8.4 填错协议

例如实际对外是 HTTPS，但你填成了 HTTP。

### 8.5 域名能打开首页，但回调路径没放行

即使域名本身能访问，如果：

- Nginx 没转发 `/api/alipay/notify`
- Nginx 没转发 `/api/wechatpay/notify`

那支付回调一样会失败。

## 9. 你现在该怎么确认自己应该填什么

你可以按这个顺序判断：

1. 你的 `new-api` 现在正式通过哪个公网域名访问
2. 这个域名是否已经配置 HTTPS
3. 这个域名是否真的能转发到你的 `new-api`
4. 这个域名下的 `/api/alipay/notify` 和 `/api/wechatpay/notify` 是否可被外网访问

如果这四项都成立，那么这个域名就是你应该填的 `ServerAddress`。

## 10. 举例

### 正确示例 1

```text
ServerAddress = https://newapi.example.com
```

回调自动变成：

```text
https://newapi.example.com/api/alipay/notify
https://newapi.example.com/api/wechatpay/notify
```

### 正确示例 2

```text
ServerAddress = https://api.example.com
```

回调自动变成：

```text
https://api.example.com/api/alipay/notify
https://api.example.com/api/wechatpay/notify
```

### 错误示例

```text
ServerAddress = http://localhost:3000
```

## 11. 如果你还没有域名怎么办

那你先不要直接做正式支付联调。

你应该先完成：

1. 准备一个公网域名
2. 配置 HTTPS
3. 用 Nginx / Caddy / 宝塔把域名反代到 `new-api`
4. 再把这个公网地址填进 `ServerAddress`

## 12. 与支付平台的关系

`ServerAddress` 不是支付宝后台给你的值，也不是微信支付后台给你的值。

它是你在自己的系统里告诉 `new-api`：

- “我的站点对外就是这个地址”

而支付平台只是在你下单时接收你拼出来的回调地址，然后在支付完成后回调它。

## 13. 官方与源码依据

源码依据：

- [service/epay.go](D:/new-api/new-api/service/epay.go)
- [controller/topup_official.go](D:/new-api/new-api/controller/topup_official.go)
- [web/src/pages/Setting/Payment/SettingsGeneralPayment.jsx](D:/new-api/new-api/web/src/pages/Setting/Payment/SettingsGeneralPayment.jsx)
- [web/src/components/settings/SystemSetting.jsx](D:/new-api/new-api/web/src/components/settings/SystemSetting.jsx)

## 14. 一句话结论

`ServerAddress` 就是你这套 `new-api` 对外公网访问的根地址。

如果你现在正式站点最终通过：

```text
https://your-domain.com
```

访问，那你就填：

```text
https://your-domain.com
```

不是问支付宝或微信“去拿”。
