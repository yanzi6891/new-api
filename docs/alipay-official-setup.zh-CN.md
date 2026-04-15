# 支付宝官方二维码支付参数申请与填写说明

更新时间：2026-04-15

## 1. 这份说明解决什么问题

这份文档专门对应当前 `new-api` 第一版支付宝官方二维码支付实现，回答三个实际问题：

- 支付宝商户和应用应该怎么申请
- `new-api` 后台里的 5 个支付宝字段分别填什么
- 联调时最容易踩哪些坑

## 2. 先说结论

你当前这套实现，支付宝部分实际依赖的是：

- `alipay.trade.precreate`
- `RSA2` 签名
- `AppId`
- 应用私钥
- 支付宝公钥
- 网关地址

也就是说，这一版接的是：

- 支付宝官方当面付扫码支付
- 公钥模式
- 单商户自营收款模式

不是：

- 证书模式
- 服务商代商户多商户授权模式
- 小程序支付 / JSAPI 支付

## 3. 当前代码的真实字段对应关系

当前代码里支付宝官方配置项只有这 5 个：

- `AlipayOfficialEnabled`
- `AlipayOfficialAppId`
- `AlipayOfficialPrivateKey`
- `AlipayOfficialPublicKey`
- `AlipayOfficialGateway`

默认网关在代码里就是：

```text
https://openapi.alipay.com/gateway.do
```

对应代码位置可参考：

- [setting/payment_official.go](D:/new-api/new-api/setting/payment_official.go)
- [service/payment_alipay_official.go](D:/new-api/new-api/service/payment_alipay_official.go)
- [web/src/pages/Setting/Payment/SettingsPaymentGatewayOfficial.jsx](D:/new-api/new-api/web/src/pages/Setting/Payment/SettingsPaymentGatewayOfficial.jsx)

## 4. 你应该申请什么类型的支付宝能力

对你当前这个场景：

- PC 端展示二维码
- 用户手机支付宝扫码支付
- 用于站内充值

最匹配的是：

- 支付宝开放平台应用
- 当面付
- 扫码支付

从支付宝官方页面可见：

- 开发者需要先创建应用
- 线下支付可走当面付
- 被扫模式中，“消费者扫描商家付款”应参照扫码支付接入指引
- 官方示例里也明确以 `alipay.trade.precreate` 作为当面付扫码支付联调示例

这是与你当前实现完全对齐的。

## 5. 当前实现适合哪种商户模式

这一点非常重要。

根据当前代码实现，你这版更适合：

- 你自己的主体
- 你自己的支付宝应用
- 你自己的收款账户
- 单商户自营收款

不适合直接拿来做：

- 一套系统接多个外部商户
- 服务商代商户签约
- 需要 `app_auth_token` 的服务商授权模式

原因很直接：

- 当前实现只传 `app_id`
- 没有 `app_auth_token`
- 没有代调用商户授权链路
- 没有多商户路由逻辑

所以你申请参数时，思路应该是：

- 用你自己的商户主体申请
- 用你自己的应用完成配置
- 用你自己的应用直接收款

## 6. 支付宝申请的大致步骤

### 6.1 准备主体

你至少需要：

- 已实名认证或已认证的支付宝主体
- 如果要正式生产收款，通常需要符合支付宝开放平台对应的商户与应用要求

### 6.2 创建应用

你需要在支付宝开放平台里创建应用。

当前更适合的方向是：

- 创建一个支付应用
- 作为你自己站点的收款应用

创建应用时，核心目标不是做花哨能力，而是先拿到：

- `AppId`

### 6.3 添加支付能力

你需要给该应用添加与线下扫码支付相对应的能力。

对当前实现来说，应以当面付扫码能力为核心。

### 6.4 配置密钥

你当前实现使用的是“公钥模式”。

也就是说，你要做的是：

1. 在你自己的服务器或本机生成 RSA 密钥对
2. 本地保留“应用私钥”
3. 将对应“应用公钥”上传到支付宝开放平台
4. 从支付宝开放平台拿到“支付宝公钥”

在 `new-api` 后台里：

- 填应用私钥
- 填支付宝公钥

不是把“应用公钥”填进系统。

## 7. `new-api` 后台每个字段怎么填

### 7.1 `AlipayOfficialEnabled`

含义：

- 是否启用支付宝官方二维码支付

怎么填：

- 联调完成前可先关闭
- 参数填好、回调可用后再开启

注意：

- 当前后端在启用时会检查 `AppId`、应用私钥、支付宝公钥是否为空

### 7.2 `AlipayOfficialAppId`

含义：

- 支付宝开放平台应用的 `AppId`

来源：

- 你在支付宝开放平台创建应用后得到

怎么填：

- 直接填应用详情页中的 `AppId`

常见错误：

- 把商户号、PID、UID 填成 `AppId`
- 把沙箱 `AppId` 填到正式环境

### 7.3 `AlipayOfficialPrivateKey`

含义：

- 你的应用私钥

来源：

- 你本地生成的 RSA 私钥

怎么填：

- 填完整 PEM 内容
- 支持 `PKCS1` 或 `PKCS8`
- 需要包含头尾，例如：

```pem
-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----
```

常见错误：

- 误填成应用公钥
- 误填成支付宝公钥
- 丢了头尾
- 多行换行被破坏

当前代码会做 PEM 解析，因此内容必须是真正可解析的私钥。

### 7.4 `AlipayOfficialPublicKey`

含义：

- 支付宝公钥

来源：

- 你上传应用公钥后，支付宝开放平台生成或展示的支付宝公钥

怎么填：

- 填完整 PEM 内容
- 必须是支付宝公钥，不是你的应用公钥

示例结构：

```pem
-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----
```

常见错误：

- 把自己生成的应用公钥误填到这里
- 少复制了头尾
- 公钥与当前应用不匹配

### 7.5 `AlipayOfficialGateway`

含义：

- 支付宝网关地址

正式环境一般填写：

```text
https://openapi.alipay.com/gateway.do
```

沙箱环境填写：

```text
https://openapi.alipaydev.com/gateway.do
```

常见错误：

- 正式环境配了沙箱网关
- 沙箱环境配了正式网关

## 8. 你后台里没有“应用公钥”字段，为什么

因为当前实现里：

- 请求签名使用的是应用私钥
- 回调验签使用的是支付宝公钥

应用公钥只是在支付宝开放平台上传时使用，用来换取平台侧信任关系。

因此在 `new-api` 后台里不需要单独保存应用公钥。

## 9. 回调地址是怎么来的

当前实现不是让你单独填写支付宝回调地址字段。

代码逻辑是：

- 先取回调基地址
- 如果配置了自定义回调地址，就用自定义回调地址
- 否则使用系统 `ServerAddress`
- 最后自动拼出：

```text
/api/alipay/notify
```

也就是说，当前支付宝回调地址最终一般是：

```text
https://你的域名/api/alipay/notify
```

你需要重点检查的是：

- `ServerAddress` 是否正确
- 如果用了自定义回调基地址，它是否正确
- 域名是否公网可访问
- 是否是 HTTPS

相关代码可参考：

- [service/epay.go](D:/new-api/new-api/service/epay.go)
- [controller/topup_official.go](D:/new-api/new-api/controller/topup_official.go)

## 10. 沙箱怎么配

如果你先做联调，优先建议从支付宝沙箱开始。

根据支付宝官方开发攻略页，沙箱联调至少需要：

- 沙箱 `AppId`
- 沙箱网关
- 沙箱应用私钥
- 沙箱支付宝公钥

这正好与你当前实现所需字段完全对应。

因此你可以先这样映射：

- `AlipayOfficialAppId` = 沙箱 `AppId`
- `AlipayOfficialPrivateKey` = 沙箱应用私钥
- `AlipayOfficialPublicKey` = 沙箱支付宝公钥
- `AlipayOfficialGateway` = `https://openapi.alipaydev.com/gateway.do`

等沙箱联调通过后，再切换成正式环境参数。

## 11. 正式环境怎么切换

正式切换时，你至少要替换这四项：

- `AppId`
- 应用私钥
- 支付宝公钥
- 网关地址

正式环境应改回：

```text
https://openapi.alipay.com/gateway.do
```

不要出现：

- 正式 `AppId` + 沙箱公钥
- 正式网关 + 沙箱密钥
- 沙箱 `AppId` + 正式网关

这三类混搭都会导致请求或验签失败。

## 12. 当前实现里的接口行为

你当前支付宝支付主流程是：

1. 用户在前端发起充值
2. 后端调用 `alipay.trade.precreate`
3. 支付宝返回二维码内容
4. 前端展示二维码
5. 用户用支付宝扫码支付
6. 支付宝异步通知 `/api/alipay/notify`
7. 系统验签、校验金额、完成充值
8. 前端通过订单状态轮询确认成功

所以联调时最关键的检查点是：

- 下单是否成功
- 二维码是否返回
- 回调是否到达
- 回调验签是否通过
- 金额是否一致
- 订单是否只入账一次

## 13. 最常见的 10 个坑

### 13.1 把应用公钥填到 `AlipayOfficialPublicKey`

错。

这里应该填：

- 支付宝公钥

不是：

- 应用公钥

### 13.2 私钥格式不对

如果你粘贴进去的不是完整 PEM，当前代码会解析失败。

### 13.3 开了开关但没填全参数

当前后端启用时会校验关键字段是否为空。

### 13.4 `ServerAddress` 没填

前端设置页提交时会先检查服务器地址。

因为没有正确的回调基地址，支付链路就不完整。

### 13.5 回调地址不是公网 HTTPS

本地 `localhost` 不能直接作为正式支付回调地址。

### 13.6 沙箱和正式环境混用

这是最常见问题之一。

### 13.7 商户产品没真正开通

即使应用建好了，如果支付产品权限没开通，实际调用也可能失败。

### 13.8 误以为这版支持服务商代调用

这版没有做 `app_auth_token` 逻辑。

### 13.9 回调成功但金额校验不一致

当前代码会校验订单金额与通知金额是否一致，不一致会直接失败。

### 13.10 重复通知导致重复加额的担心

当前逻辑已经带有订单锁和完成态处理，但你正式联调时仍然必须验证“重复回调不会重复充值”。

## 14. 推荐的最短落地路径

如果你要尽快跑通支付宝这一条链路，建议按这个顺序：

1. 先在支付宝开放平台创建应用
2. 给应用添加当面付扫码能力
3. 先生成并配置沙箱密钥
4. 在 `new-api` 后台填入沙箱参数
5. 把 `AlipayOfficialGateway` 改为沙箱网关
6. 确认 `ServerAddress` 为可回调地址
7. 测试下单、扫码、回调、入账
8. 沙箱通过后再切换到正式参数

## 15. 建议你联调前先核对的后台项

至少核对以下项目：

- `ServerAddress`
- `AlipayOfficialEnabled`
- `AlipayOfficialAppId`
- `AlipayOfficialPrivateKey`
- `AlipayOfficialPublicKey`
- `AlipayOfficialGateway`

对应页面可参考：

- [web/src/pages/Setting/Payment/SettingsPaymentGatewayOfficial.jsx](D:/new-api/new-api/web/src/pages/Setting/Payment/SettingsPaymentGatewayOfficial.jsx)

## 16. 官方参考链接

以下为本次整理时参考的支付宝官方页面：

- 支付宝开放平台“网页/移动应用”：<https://open.alipay.com/module/webApp>
- 支付宝开放平台“支付系统服务商 / 当面付开发攻略”：<https://open.alipay.com/paymentServicer/paymentProvider.htm>
- 支付宝开放平台帮助中心：<https://open.alipay.com/support/supportCenter.htm>

我还结合了你当前仓库里的实现代码进行判断，所以文档里有一部分是基于源码的工程结论，不只是照搬官方名词。

## 17. 一句话结论

对你当前这套 `new-api` 第一版实现来说，支付宝最关键的不是“找更多字段”，而是把下面四个东西配对正确：

- 正确的 `AppId`
- 正确的应用私钥
- 正确的支付宝公钥
- 正确的网关地址

再确保：

- 回调地址可公网访问
- 支付产品权限已开通
- 不把这套单商户实现误当成服务商多商户方案
