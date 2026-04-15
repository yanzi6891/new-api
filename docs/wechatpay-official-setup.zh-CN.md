# 微信支付官方参数申请与填写说明

更新时间：2026-04-15

## 1. 这份文档解决什么问题

这份文档专门对应当前 `new-api` 第一版微信支付官方扫码实现，重点回答：

- 微信支付商户和参数该怎么准备
- `new-api` 后台里的微信支付字段分别填什么
- 当前实现和微信支付官方推荐做法有哪些差异

## 2. 先说结论

你当前这套微信支付实现，实际接的是：

- 微信支付 `Native` 扫码支付
- 微信支付 API v3
- 商户直连模式
- 商户私钥签名
- 平台证书验签
- APIv3 Key 解密回调报文

不是：

- JSAPI / 小程序支付
- H5 支付
- 服务商多商户代调用模式
- 微信支付公钥模式

## 3. 当前代码真实依赖的字段

当前代码里微信支付官方配置项只有这 7 个：

- `WeChatPayOfficialEnabled`
- `WeChatPayOfficialAppId`
- `WeChatPayOfficialMchId`
- `WeChatPayOfficialSerialNo`
- `WeChatPayOfficialPrivateKey`
- `WeChatPayOfficialAPIv3Key`
- `WeChatPayOfficialPlatformCert`

对应代码可参考：

- [setting/payment_official.go](D:/new-api/new-api/setting/payment_official.go)
- [service/payment_wechat_official.go](D:/new-api/new-api/service/payment_wechat_official.go)
- [web/src/pages/Setting/Payment/SettingsPaymentGatewayOfficial.jsx](D:/new-api/new-api/web/src/pages/Setting/Payment/SettingsPaymentGatewayOfficial.jsx)

## 4. 当前实现到底适合什么场景

对你现在这个项目：

- PC 端展示二维码
- 用户用微信扫一扫付款
- 用于站内充值

最匹配的就是：

- 微信支付 `Native` 支付

微信支付官方文档中，`Native下单` 接口就是返回 `code_url`，由商户自己生成二维码给用户扫码。

这和你当前实现完全一致：

- 后端请求 `/v3/pay/transactions/native`
- 读取返回的 `code_url`
- 前端展示二维码
- 用户扫码完成付款

## 5. 当前实现适合哪种商户模式

这一点很重要。

当前实现更适合：

- 你自己的商户主体
- 你自己的微信支付商户号
- 你自己的 AppID
- 你自己的站点直连收款

不适合直接拿来做：

- 服务商模式
- 一套系统接多家外部商户
- 需要子商户号的场景
- 需要 `sp_mchid` / `sub_mchid` 的场景

原因很直接：

- 当前代码只传单一 `appid`
- 当前代码只传单一 `mchid`
- 没有服务商字段
- 没有多商户路由

所以你申请参数时，应按“单商户自营收款”思路准备。

## 6. 微信支付参数的大致准备顺序

建议按这个顺序准备：

1. 准备微信支付商户号
2. 开通 `Native` 支付能力
3. 准备并绑定 `AppID`
4. 申请商户 API 证书
5. 拿到商户 API 证书序列号
6. 保存商户私钥
7. 设置 APIv3 Key
8. 下载微信支付平台证书
9. 在 `new-api` 后台填写参数
10. 配置正式回调地址并联调

## 7. `new-api` 后台每个字段怎么填

### 7.1 `WeChatPayOfficialEnabled`

含义：

- 是否启用微信官方扫码支付

怎么填：

- 参数未准备完整前先关闭
- 联调通过后再启用

当前后端启用时会检查以下字段是否都不为空：

- `AppId`
- `MchId`
- `SerialNo`
- 商户私钥
- `APIv3Key`
- 平台证书

### 7.2 `WeChatPayOfficialAppId`

含义：

- 与当前微信支付商户号绑定的 `AppID`

来源：

- 你的微信开放平台、公众号、小程序等对应的 `AppID`
- 但必须与你当前商户号存在绑定关系

怎么填：

- 直接填与当前商户号绑定的那个 `AppID`

常见错误：

- 随便填了一个微信 `AppID`
- `AppID` 没和当前商户号绑定
- 把别的应用的 `AppID` 填进来

## 7.3 `WeChatPayOfficialMchId`

含义：

- 微信支付商户号

来源：

- 微信支付商户平台

怎么填：

- 直接填正式商户号

常见错误：

- 把服务商号、子商户号、测试号填混

### 7.4 `WeChatPayOfficialSerialNo`

含义：

- 商户 API 证书序列号

来源：

- 你申请商户 API 证书后得到的证书序列号

怎么填：

- 填与你当前商户私钥对应的那张商户 API 证书序列号

注意：

- 这是商户 API 证书序列号
- 不是微信支付平台证书序列号

常见错误：

- 把平台证书序列号填进来
- 商户私钥和证书序列号不是同一套

### 7.5 `WeChatPayOfficialPrivateKey`

含义：

- 商户私钥

来源：

- 你申请商户 API 证书时生成并保留的私钥

怎么填：

- 填完整 PEM 内容
- 应是商户私钥，例如常见的 `apiclient_key.pem` 内容

示例结构：

```pem
-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----
```

常见错误：

- 把商户证书内容填进来
- 把平台证书内容填进来
- 把私钥头尾删掉
- 粘贴后换行被破坏

当前代码会直接解析 PEM 私钥，所以格式必须正确。

### 7.6 `WeChatPayOfficialAPIv3Key`

含义：

- 微信支付 APIv3 Key

来源：

- 商户平台 `账户中心` / `API安全` 中设置的 APIv3 密钥

怎么填：

- 填你设置的那串 APIv3 Key

当前代码要求：

- 长度必须是 32 字节

所以最常见错误是：

- 长度不是 32
- 多了空格
- 正式环境和测试环境混用

### 7.7 `WeChatPayOfficialPlatformCert`

含义：

- 微信支付平台证书

来源：

- 从微信支付平台下载的平台证书

怎么填：

- 填完整 PEM 证书内容
- 当前实现要求的是整张证书，而不是单独的微信支付公钥

示例结构：

```pem
-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----
```

注意：

- 当前实现是“平台证书模式”
- 不是“微信支付公钥模式”

常见错误：

- 把微信支付公钥填进来
- 把商户 API 证书填进来
- 只填证书序列号，不填证书内容

## 8. 你后台里为什么没有“商户证书文件”字段

因为当前实现真正用到的是：

- 商户私钥
- 商户 API 证书序列号

请求签名时，代码使用：

- 商户私钥签名
- 商户 API 证书序列号写入 `Authorization`

因此后台只需要：

- 私钥内容
- 序列号

不需要额外上传整张商户证书文件。

## 9. 回调地址是怎么来的

当前实现不是让你单独填写微信回调地址字段。

代码逻辑是：

- 优先使用自定义回调基地址
- 否则使用系统 `ServerAddress`
- 最终拼接：

```text
/api/wechatpay/notify
```

也就是说，实际微信支付回调地址一般是：

```text
https://你的域名/api/wechatpay/notify
```

对应代码可参考：

- [service/epay.go](D:/new-api/new-api/service/epay.go)
- [controller/topup_official.go](D:/new-api/new-api/controller/topup_official.go)

所以你需要重点检查：

- `ServerAddress` 是否正确
- 是否为公网 HTTPS
- 反向代理是否正确放行该路径

## 10. 当前实现里的支付主流程

当前微信支付主流程是：

1. 前端发起充值
2. 后端调用 `Native下单`
3. 微信返回 `code_url`
4. 前端将 `code_url` 渲染成二维码
5. 用户微信扫码付款
6. 微信支付回调 `/api/wechatpay/notify`
7. 系统验签、解密回调报文、校验金额、完成充值
8. 前端轮询订单状态并展示支付成功

其中关键字段在代码里对应为：

- 下单接口：`/v3/pay/transactions/native`
- 支付回调解密：使用 `APIv3Key`
- 回调验签：使用 `PlatformCert`

## 11. 当前实现与微信支付官方推荐做法的差异

这部分你必须知道。

### 11.1 当前实现使用的是“平台证书模式”

当前代码会把 `WeChatPayOfficialPlatformCert` 当成完整 X.509 证书解析，然后取证书公钥做回调验签。

这意味着：

- 当前实现依赖平台证书
- 不是微信支付公钥模式

如果你下载的是“微信支付公钥”而不是“平台证书”，当前代码会直接不兼容。

### 11.2 当前实现只校验回调签名，不校验普通 API 响应签名

当前 `CreateWeChatOfficialPayment` 和 `QueryWeChatOfficialPayment` 走的请求响应流程里，没有额外校验微信支付返回报文头部签名。

这和微信支付官方的更完整安全建议相比，是偏简化的实现。

它不影响你现在先跑通第一版，但如果后续要进一步加固，优先级很高。

### 11.3 当前实现没有检查 `Wechatpay-Serial`

当前回调验签只使用：

- `Wechatpay-Timestamp`
- `Wechatpay-Nonce`
- `Wechatpay-Signature`

没有进一步比对：

- `Wechatpay-Serial`

这意味着：

- 当前代码依赖你后台填入的一张平台证书
- 如果平台证书轮换，你需要手动更新后台配置

### 11.4 当前实现没有检查回调时间窗口

当前代码会取 `Wechatpay-Timestamp` 参与验签，但没有额外做“时间是否过期”的校验。

这不一定马上出问题，但从安全加固角度看，也属于后续可补项。

## 12. 微信支付最常见的 10 个坑

### 12.1 `AppID` 没和商户号绑定

这是最常见问题之一。

### 12.2 `SerialNo` 填成了平台证书序列号

当前这里必须填：

- 商户 API 证书序列号

### 12.3 商户私钥和 `SerialNo` 不是同一套

签名会直接失败。

### 12.4 APIv3 Key 长度不对

当前代码明确要求长度为 32。

### 12.5 把微信支付公钥误填成平台证书

当前代码不能直接吃“公钥字符串”，它要的是证书 PEM。

### 12.6 回调地址不可公网访问

本地 `localhost` 不适合正式回调。

### 12.7 反向代理挡掉了回调

例如：

- 路由未转发
- 请求体大小限制
- 只允许 GET，不允许 POST

### 12.8 金额单位理解错

当前代码对外以元处理，对内下单时会转成分；回调金额也会从分转回元做对比。

### 12.9 以为这版支持服务商模式

这版没有服务商字段，也没有子商户逻辑。

### 12.10 平台证书轮换后忘记更新

当前实现没有自动拉取新平台证书，所以你必须关注平台证书变更。

## 13. 推荐的最短落地路径

如果你要尽快先跑通微信支付这条链路，建议按这个顺序：

1. 准备正式微信支付商户号
2. 开通 `Native` 支付
3. 准备并绑定可用 `AppID`
4. 申请商户 API 证书
5. 保存商户私钥
6. 记录商户 API 证书序列号
7. 设置 APIv3 Key
8. 下载微信支付平台证书
9. 在 `new-api` 后台填入 7 个字段
10. 确认 `ServerAddress` 为公网 HTTPS 地址
11. 测试下单、扫码、回调、入账

## 14. 你联调前至少要核对的后台项

至少核对以下项目：

- `ServerAddress`
- `WeChatPayOfficialEnabled`
- `WeChatPayOfficialAppId`
- `WeChatPayOfficialMchId`
- `WeChatPayOfficialSerialNo`
- `WeChatPayOfficialPrivateKey`
- `WeChatPayOfficialAPIv3Key`
- `WeChatPayOfficialPlatformCert`

对应页面可参考：

- [web/src/pages/Setting/Payment/SettingsPaymentGatewayOfficial.jsx](D:/new-api/new-api/web/src/pages/Setting/Payment/SettingsPaymentGatewayOfficial.jsx)

## 15. 对当前代码的工程判断

结合源码，当前微信支付配置层面的结论是：

- 这套实现已经足够支撑第一版 PC 扫码充值
- 参数准备齐全后可以进入联调
- 当前最关键的不是继续改前端，而是把商户证书、序列号、平台证书、APIv3 Key 配对正确

如果后续你要继续增强，优先建议：

1. 增加微信支付 API 响应签名校验
2. 增加 `Wechatpay-Serial` 校验
3. 增加平台证书轮换处理
4. 增加回调时间窗口检查

## 16. 官方参考链接

本次整理参考的微信支付官方文档与页面：

- 微信支付 API v3 文档入口：<https://pay.wechatpay.cn/doc/v3/merchant/4012365342>
- 微信支付 `Native下单`：<https://pay.wechatpay.cn/doc/v3/merchant/4012525171>
- 微信支付官方文档搜索页：<https://pay.wechatpay.cn/doc/v3/merchant/search>

说明：

- 文档中的“当前实现使用平台证书模式”“只校验回调签名”“未校验 `Wechatpay-Serial`”等结论，是基于你当前仓库源码得出的工程判断
- 文档中的 `Native`、商户 API 证书、APIv3 Key、平台证书等概念，来自微信支付官方 API v3 文档体系

## 17. 一句话结论

对你当前这套 `new-api` 第一版微信支付实现来说，最关键的是把下面这五件事配对正确：

- 正确的 `AppID`
- 正确的商户号
- 正确的商户私钥与商户证书序列号
- 正确的 APIv3 Key
- 正确的微信支付平台证书

再确保：

- 回调地址公网 HTTPS 可达
- `AppID` 与商户号已绑定
- 不把这套单商户直连实现误当成服务商多商户方案
