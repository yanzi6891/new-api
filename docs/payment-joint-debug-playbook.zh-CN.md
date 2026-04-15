# 支付宝与微信二维码支付联调实操手册

更新时间：2026-04-15

## 1. 这份文档适合什么阶段

这份文档适合你现在这个阶段：

- 支付宝官方二维码支付第一版已落地
- 微信支付 Native 二维码第一版已落地
- 前后端已经能编译
- 现在要开始真正联调

它不是概念介绍，而是一份从“启动服务”到“扫码成功”的实操手册。

## 2. 当前联调目标

你当前最合理的联调目标不是一次性验证所有场景，而是先跑通下面这条最短链路：

1. 用户在 PC 端打开充值页面
2. 选择支付宝或微信官方扫码支付
3. 后端成功创建订单
4. 前端成功展示二维码
5. 手机扫码完成支付
6. 支付平台回调到你的服务
7. 服务端更新充值订单状态
8. 前端轮询到成功状态
9. 用户额度正确增加

只要这条链路打通，第一版就算真正站住了。

## 3. 当前代码里你要关注的接口

当前联调涉及的核心接口是：

- `POST /api/user/alipay/pay`
- `POST /api/user/wechat/pay`
- `POST /api/alipay/notify`
- `POST /api/wechatpay/notify`
- `GET /api/user/topup/status/:tradeNo`

对应代码：

- [controller/topup_official.go](D:/new-api/new-api/controller/topup_official.go)

## 4. 当前前端里的实际交互顺序

当前页面流程是：

1. 用户进入充值页
2. 选择支付方式
3. 先弹出支付确认框
4. 点击确认后请求下单接口
5. 成功后弹出二维码窗口
6. 前端每 3 秒轮询一次订单状态
7. 支付成功后关闭二维码弹窗并刷新状态

对应前端代码：

- [web/src/components/topup/index.jsx](D:/new-api/new-api/web/src/components/topup/index.jsx)
- [web/src/components/topup/modals/PaymentConfirmModal.jsx](D:/new-api/new-api/web/src/components/topup/modals/PaymentConfirmModal.jsx)
- [web/src/components/topup/modals/QRCodePaymentModal.jsx](D:/new-api/new-api/web/src/components/topup/modals/QRCodePaymentModal.jsx)

## 5. 联调前的最小准备

开始联调前，至少确认下面这些项都成立：

- 后端可启动
- 前端可访问
- `ServerAddress` 已配置
- 已配置公网 HTTPS 域名
- 支付宝参数已填写
- 微信支付参数已填写
- 官方支付开关已开启
- 服务器时间准确
- 日志可查看

如果上面有任何一项没完成，不要直接开始扫二维码。

## 6. 先跑本地基础验证

### 6.1 后端编译验证

在项目根目录执行：

```powershell
& 'D:\Program Files\Go\bin\go.exe' build ./...
```

### 6.2 前端构建验证

在 `web` 目录执行：

```powershell
bun run build
```

### 6.3 本地启动

后端：

```powershell
& 'D:\Program Files\Go\bin\go.exe' run .
```

前端开发模式：

```powershell
cd web
bun run dev
```

如果你不是本地联调，而是直接在测试服务器联调，就用测试服务器启动方式即可。

## 7. 联调前先检查后台配置

### 7.1 支付宝

至少检查：

- `AlipayOfficialEnabled = true`
- `AlipayOfficialAppId`
- `AlipayOfficialPrivateKey`
- `AlipayOfficialPublicKey`
- `AlipayOfficialGateway`

### 7.2 微信支付

至少检查：

- `WeChatPayOfficialEnabled = true`
- `WeChatPayOfficialAppId`
- `WeChatPayOfficialMchId`
- `WeChatPayOfficialSerialNo`
- `WeChatPayOfficialPrivateKey`
- `WeChatPayOfficialAPIv3Key`
- `WeChatPayOfficialPlatformCert`

### 7.3 回调基地址

至少检查：

- `ServerAddress` 是否为正确公网地址
- 如果用了自定义回调地址，是否配置正确

当前代码会自动拼出：

```text
https://你的域名/api/alipay/notify
https://你的域名/api/wechatpay/notify
```

## 8. 先做“接口创建订单”联调

真正扫码前，先只验证“能不能成功创建二维码订单”。

### 8.1 支付宝下单接口

请求：

```http
POST /api/user/alipay/pay
Content-Type: application/json
Authorization: Bearer <你的用户令牌>

{
  "amount": 1000,
  "payment_method": "alipay_official"
}
```

### 8.2 微信下单接口

请求：

```http
POST /api/user/wechat/pay
Content-Type: application/json
Authorization: Bearer <你的用户令牌>

{
  "amount": 1000,
  "payment_method": "wxpay_native"
}
```

说明：

- `amount` 是充值额度，不一定等于人民币金额
- 实际应付金额会走你当前系统里的换算逻辑

### 8.3 你应该期待什么返回

成功时，当前代码会返回二维码相关数据，核心字段是：

- `trade_no`
- `qr_code`
- `expire_time`

也就是说，只要你拿到了：

- 订单号
- 二维码内容

就说明“创建支付订单”这一步基本通了。

## 9. 如果你想绕过前端，直接用接口联调

这一步很有价值。

因为如果页面没弹出二维码，你需要立刻判断：

- 是前端弹窗有问题
- 还是后端没成功创建支付订单

### 9.1 用浏览器登录态调试

如果你已经在页面中登录，最简单方式是：

- 在浏览器开发者工具里看网络请求
- 找 `/api/user/alipay/pay` 或 `/api/user/wechat/pay`
- 看返回里是否有 `trade_no` 和 `qr_code`

### 9.2 用 Postman / Apifox / curl 调试

如果你有用户 token，也可以直接调接口。

例如：

```powershell
curl -X POST "https://your-domain.com/api/user/alipay/pay" `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer <USER_TOKEN>" `
  -d "{\"amount\":1000,\"payment_method\":\"alipay_official\"}"
```

微信同理：

```powershell
curl -X POST "https://your-domain.com/api/user/wechat/pay" `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer <USER_TOKEN>" `
  -d "{\"amount\":1000,\"payment_method\":\"wxpay_native\"}"
```

## 10. 再做“二维码展示”联调

当你确认接口能返回 `qr_code` 后，再验证页面层。

当前页面二维码弹窗会显示：

- 支付方式标题
- 二维码
- 订单号
- 剩余有效时间
- 轮询状态

你应该观察：

- 弹窗是否正常出现
- 二维码是否真实可扫描
- 倒计时是否递减
- 是否提示“正在等待支付结果”

如果接口成功但页面不展示，优先看：

- 前端控制台报错
- `qr_code` 是否为空
- 弹窗状态是否被重置

## 11. 再做“订单状态轮询”联调

当前前端每 3 秒轮询一次：

```text
GET /api/user/topup/status/:tradeNo
```

这一步非常关键，因为即使支付回调偶发延迟，前端仍可能通过主动查单完成状态刷新。

你联调时要观察：

- 轮询请求是否持续发出
- 订单状态是否从 `pending` 变成 `success`
- 支付成功后弹窗是否自动关闭
- 页面余额或额度是否自动刷新

## 12. 支付宝联调实操步骤

建议按这个顺序：

### 第一步：先测下单

检查：

- `/api/user/alipay/pay` 能返回 `trade_no`
- 返回里有 `qr_code`

### 第二步：用支付宝扫码

检查：

- 二维码能被支付宝识别
- 支付页金额正确
- 商品说明基本合理

### 第三步：支付成功后看服务端日志

你应重点查：

- 是否进入 `/api/alipay/notify`
- 是否出现 `alipay official notify verify failed`
- 是否出现金额不一致日志

当前代码会校验：

- 签名
- 交易状态
- 本地金额和通知金额是否一致

### 第四步：看前端状态变化

你应确认：

- 二维码弹窗没有一直卡住
- 状态轮询最终变成功
- 用户余额或额度增加

### 第五步：验证重复回调

你至少要确认：

- 即使支付宝重复通知，也不会重复加额

## 13. 微信支付联调实操步骤

建议按这个顺序：

### 第一步：先测下单

检查：

- `/api/user/wechat/pay` 能返回 `trade_no`
- 返回里有 `qr_code`

注意：

- 微信这里返回的其实是 `code_url`
- 但当前后端已统一映射到 `qr_code`

### 第二步：用微信扫码

检查：

- 二维码能被微信识别
- 金额正确
- 用户侧能进入微信支付确认页

### 第三步：支付成功后看服务端日志

你应重点查：

- 是否进入 `/api/wechatpay/notify`
- 是否出现 `wechat pay official notify verify failed`
- 是否出现 `amount mismatch`

当前代码会做：

- 回调签名校验
- APIv3 Key 解密
- 金额校验

### 第四步：看前端轮询

你应确认：

- 状态轮询能最终识别成功
- 成功后弹窗关闭
- 用户额度增加

### 第五步：验证重复通知

至少确认：

- 微信支付重复通知不会导致重复充值

## 14. 推荐的联调日志观察点

你至少要同时观察三类信息：

### 14.1 浏览器网络请求

重点看：

- 创建订单请求
- 轮询状态请求

### 14.2 后端应用日志

重点搜这些关键词：

- `official qr payment create failed`
- `alipay official notify verify failed`
- `wechat pay official notify verify failed`
- `amount mismatch`
- `complete topup failed`

### 14.3 支付平台后台记录

重点确认：

- 订单是否真实创建
- 用户是否真实支付成功
- 回调是否发送

## 15. 联调时最容易出现的 8 类问题

### 15.1 创建订单失败

通常先看：

- 商户参数是否填错
- 支付能力是否开通
- 网关地址是否对

### 15.2 二维码能生成但扫不了

通常先看：

- 返回的二维码内容是否为空
- 前端二维码组件是否渲染异常
- 支付平台下单结果是否真实成功

### 15.3 扫码能支付，但前端一直等待

通常先看：

- 回调有没有到达
- 轮询接口是否仍返回 `pending`
- 是否发生验签失败

### 15.4 回调到了，但签名失败

通常先看：

- 支付宝公钥是否填错
- 微信平台证书是否填错
- 商户私钥或平台证书是否和当前环境匹配

### 15.5 支付成功，但没入账

通常先看：

- 金额校验是否不一致
- 本地订单是否查得到
- 订单是否已经被处理过

### 15.6 支付成功，但前端没刷新

通常先看：

- `/api/user/topup/status/:tradeNo` 返回内容
- 前端轮询是否被中断
- 支付成功后页面刷新逻辑是否执行

### 15.7 微信支付参数明明都填了，但还是不通

通常先看：

- `AppID` 和商户号是否真实绑定
- `SerialNo` 是否是商户 API 证书序列号
- `APIv3Key` 是否正好 32 字节

### 15.8 只在测试环境能通，正式环境失败

通常先看：

- 沙箱与正式参数是否混用
- 正式回调地址是否公网可访问
- 正式域名 HTTPS 是否正常

## 16. 建议的联调顺序

不要支付宝和微信一起乱测。

推荐顺序是：

1. 先只打通支付宝
2. 再只打通微信
3. 再验证重复回调
4. 再验证超时未支付
5. 再验证用户关闭弹窗后重新进入

这样排查成本最低。

## 17. 最小验收标准

只要下面这些都成立，你这版就可以认为联调通过：

- 支付宝可正常扫码支付
- 微信可正常扫码支付
- 回调可达且验签通过
- 金额校验通过
- 订单状态能变成功
- 用户额度只增加一次
- 前端轮询能识别成功

## 18. 联调成功后下一步该做什么

联调成功后，不要立刻全量上线。

下一步应该是：

1. 把当前功能分支推到你自己的 fork
2. 小范围测试环境复测
3. 合并到 `stable/v0.12.9`
4. 用小金额在正式环境做首单验证
5. 再对外开放

## 19. 一句话结论

你当前这套第一版支付联调，最有效的方式不是一上来就盯着页面，而是按这个顺序排：

先确认参数正确，再确认创建订单，再确认二维码展示，再确认回调，再确认轮询和入账。
