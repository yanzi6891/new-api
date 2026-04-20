# `new-api` 支付后台填写与联调操作手册

更新时间：2026-04-19

## 1. 这份手册解决什么问题

这份文档专门回答下面这类问题：

- 支付宝 / 微信商户资料申请下来后，应该在 `new-api` 后台哪里填
- 每个字段到底填什么
- 先填哪些，再开哪些开关
- 回调地址是怎么来的
- 怎么确认前端已经显示充值按钮
- 怎么按顺序做联调

它不是商户申请文档，申请步骤请配合下面两份一起看：

- `docs/payment-static-qr-vs-merchant-account-guide.zh-CN.md`
- `docs/payment-merchant-application-materials-template.zh-CN.md`

## 2. 先记住当前项目的真实实现

当前项目不是“任意支付都支持”，而是已经明确接好了两条官方扫码链路：

- 支付宝：`alipay.trade.precreate`
- 微信支付：`Native` + API v3 `/v3/pay/transactions/native`

对应支付方式常量是：

- 支付宝：`alipay_official`
- 微信：`wxpay_native`

只有把参数填对、开关打开、回调地址可访问后，前端钱包页才会显示官方充值按钮。

## 3. 后台入口在哪里

管理员进入后台后，路径是：

1. 左侧菜单进入 `系统设置`
2. 打开 `支付设置`

在支付设置里，当前和官方扫码最相关的是两个区块：

- `通用设置`
- `官方扫码支付`

如果你还要设置最小充值金额、充值档位、回调基地址，也要看：

- `支付设置`

## 4. 正确填写顺序

强烈建议按这个顺序，不要一上来就先开开关。

### 4.1 第一步：先填服务器地址

后台位置：

- `系统设置 -> 支付设置 -> 通用设置`

字段：

- `服务器地址`

示例：

```text
https://pay.your-domain.com
```

这个字段非常关键，因为：

- 默认支付回调地址会基于它拼接
- 二维码支付设置页也会直接展示它拼出的回调地址

如果这里没填，官方扫码设置页提交时会直接提示：

- `请先填写服务器地址`

### 4.2 第二步：填基础支付策略

后台位置：

- `系统设置 -> 支付设置 -> 支付设置`

建议先确认这些字段：

- `Price`
- `MinTopUp`
- `CustomCallbackAddress`
- `AmountOptions`
- `AmountDiscount`

它们的作用分别是：

| 字段 | 作用 |
| --- | --- |
| `Price` | 充值金额换算单价 |
| `MinTopUp` | 最小充值数量 |
| `CustomCallbackAddress` | 自定义回调基地址，不填则默认用 `ServerAddress` |
| `AmountOptions` | 前端显示的充值档位 |
| `AmountDiscount` | 指定充值档位折扣 |

如果你只做最基础联调，可以先保证：

- `Price` 正确
- `MinTopUp` 正确
- `AmountOptions` 是合法 JSON

示例：

```json
[10, 20, 50, 100, 200, 500]
```

如果你要做充值折扣，可以填：

```json
{
  "100": 0.95,
  "200": 0.9
}
```

意思是：

- 充值 `100` 时按 `95%` 价格计算
- 充值 `200` 时按 `90%` 价格计算

### 4.3 第三步：再填官方扫码支付参数

后台位置：

- `系统设置 -> 支付设置 -> 官方扫码支付`

这一步先全部填完，**最后才打开开关**。

## 5. 支付宝字段逐项怎么填

### 5.1 `AlipayOfficialEnabled`

含义：

- 是否启用支付宝官方扫码

正确操作：

- **先不要开**
- 等 `AppId`、私钥、公钥都填好并联调通过后再开

项目限制：

- 如果你先开，而 `AppId / 私钥 / 公钥` 任一为空，后端会拒绝启用

### 5.2 `AlipayOfficialAppId`

填什么：

- 支付宝开放平台应用里的 `AppId`

不要填错成：

- 支付宝登录账号
- PID
- UID
- 商家收款账号

### 5.3 `AlipayOfficialGateway`

填什么：

- 正式环境一般填：

```text
https://openapi.alipay.com/gateway.do
```

- 沙箱环境一般填：

```text
https://openapi.alipaydev.com/gateway.do
```

常见错误：

- 正式参数 + 沙箱网关混用
- 沙箱参数 + 正式网关混用

### 5.4 `AlipayOfficialPrivateKey`

填什么：

- 你的应用私钥 PEM 内容

必须注意：

- 要填完整内容
- 头尾不能丢
- 多行格式不能破坏

常见样式：

```pem
-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----
```

### 5.5 `AlipayOfficialPublicKey`

填什么：

- 支付宝公钥 PEM 内容

不要填错成：

- 你自己的应用公钥

### 5.6 支付宝启用判定条件

当前项目后端判定“支付宝官方支付可用”的条件是：

- `AlipayOfficialEnabled = true`
- `AlipayOfficialAppId` 非空
- `AlipayOfficialPrivateKey` 非空
- `AlipayOfficialPublicKey` 非空

只要少一个，前端就不会把支付宝官方充值按钮展示出来。

## 6. 微信支付字段逐项怎么填

### 6.1 `WeChatPayOfficialEnabled`

含义：

- 是否启用微信官方扫码

正确操作：

- **先不要开**
- 等 `AppId / MchId / SerialNo / 私钥 / APIv3 Key / 平台证书` 全填好后再开

项目限制：

- 如果缺任意必填项，后端会拒绝启用

### 6.2 `WeChatPayOfficialAppId`

填什么：

- 已和商户号绑定的 `AppID`

最常见错误：

- 有 `AppID`，但没和 `mchid` 绑定
- 填了别的公众号 / 小程序 / 应用的 `AppID`

### 6.3 `WeChatPayOfficialMchId`

填什么：

- 微信支付商户号

不要填成：

- 服务商号
- 子商户号
- 其他测试商户号

### 6.4 `WeChatPayOfficialSerialNo`

填什么：

- 商户 API 证书序列号

不要填成：

- 微信支付平台证书序列号

### 6.5 `WeChatPayOfficialPrivateKey`

填什么：

- 商户 API 证书对应的私钥 PEM 内容

常见样式：

```pem
-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----
```

### 6.6 `WeChatPayOfficialAPIv3Key`

填什么：

- 你在微信支付商户平台配置的 APIv3 Key

项目要求：

- 长度必须正好是 `32`

最常见错误：

- 多了空格
- 少一位
- 复制时截断

### 6.7 `WeChatPayOfficialPlatformCert`

填什么：

- 微信支付平台证书 PEM 内容

当前项目要求的是：

- **平台证书模式**

不是：

- 微信支付公钥模式

因此不要填错成：

- 微信支付公钥
- 商户 API 证书

### 6.8 微信启用判定条件

当前项目后端判定“微信官方支付可用”的条件是：

- `WeChatPayOfficialEnabled = true`
- `WeChatPayOfficialAppId` 非空
- `WeChatPayOfficialMchId` 非空
- `WeChatPayOfficialSerialNo` 非空
- `WeChatPayOfficialPrivateKey` 非空
- `WeChatPayOfficialAPIv3Key` 非空
- `WeChatPayOfficialPlatformCert` 非空

额外还有一个隐藏条件：

- `WeChatPayOfficialAPIv3Key` 长度必须是 `32`

## 7. 回调地址到底是怎么来的

很多人最容易搞错这里。

当前项目并不是分别手工输入“支付宝回调地址”和“微信回调地址”。

而是按下面逻辑自动生成：

1. 如果设置了 `CustomCallbackAddress`，优先用它
2. 否则使用 `ServerAddress`
3. 然后自动拼接固定路径

最终结果通常是：

### 7.1 支付宝回调

```text
https://你的域名/api/alipay/notify
```

### 7.2 微信支付回调

```text
https://你的域名/api/wechatpay/notify
```

所以你要重点检查：

- `ServerAddress` 是否正确
- 如果用了 `CustomCallbackAddress`，它是否正确
- 域名是否公网可访问
- 是否是 HTTPS
- 代理层是否没有把路径改坏

## 8. 开关打开后，前端为什么还不显示

当前钱包页是否显示官方支付按钮，不取决于“你觉得配好了”，而取决于后端接口 `/api/user/topup/info` 的返回值。

只要下面任一条件不满足，按钮就不会显示：

- 支付宝启用条件未满足
- 微信启用条件未满足
- 前端没刷新到最新配置

后端返回里相关字段有：

- `enable_alipay_official_topup`
- `enable_wechat_official_topup`
- `pay_methods`

也就是说，排查顺序应是：

1. 看后台参数是否真保存成功
2. 看启用条件是否全满足
3. 看 `ServerAddress` 是否已配置
4. 重新刷新前端钱包页

## 9. 推荐联调顺序

最稳妥的联调顺序如下。

### 9.1 第一步：只验证后台配置能保存

先做这些检查：

- 能成功保存 `ServerAddress`
- 能成功保存官方支付参数
- 开关能成功开启

如果启用时报错，先不要继续。

### 9.2 第二步：验证前端展示

登录普通用户账号，在钱包页确认：

- 出现支付宝官方支付按钮
- 出现微信官方支付按钮

如果没出现，优先查启用条件。

### 9.3 第三步：验证下单

分别测试：

- 支付宝下单接口：`POST /api/user/alipay/pay`
- 微信下单接口：`POST /api/user/wechat/pay`

期望结果：

- 成功返回 `trade_no`
- 成功返回二维码内容
- 前端弹出二维码窗口

### 9.4 第四步：验证扫码支付

分别测试：

- 支付宝手机扫码能拉起支付
- 微信扫一扫能拉起支付

### 9.5 第五步：验证回调

最重要的检查项：

- 回调是否真的打到你的公网服务
- 支付宝验签是否通过
- 微信验签是否通过
- 金额是否和本地订单一致
- 订单是否从 `pending` 变成 `success`
- 用户余额 / 额度是否只增加一次

### 9.6 第六步：验证查单兜底

当前项目在订单状态查询时，会对待支付订单做官方查单兜底。

你还需要确认：

- 即使回调偶发失败，前端轮询状态时也能把成功订单补回来
- 已关闭 / 已过期订单不会误判成功

## 10. 小白最容易踩的坑

### 10.1 支付宝常见坑

- `AppId` 填错
- 私钥 / 公钥填反
- 网关填错环境
- 域名不可公网访问
- 后台已开开关，但参数没填完整

### 10.2 微信支付常见坑

- `AppID` 没和商户号绑定
- `SerialNo` 填成平台证书序列号
- APIv3 Key 长度不是 32
- 平台证书填成商户证书
- 平台公钥和平台证书概念混淆

### 10.3 项目配置常见坑

- `ServerAddress` 没填
- `CustomCallbackAddress` 配错
- HTTPS 没配好
- 反向代理拦截了回调
- 前端还没刷新到新的配置

## 11. 上线前最短检查清单

上线前至少逐项确认：

- `ServerAddress` 正确
- `CustomCallbackAddress` 正确或留空
- `Price` 正确
- `MinTopUp` 正确
- `AmountOptions` 是合法 JSON
- 支付宝参数完整
- 微信参数完整
- 开关已打开
- 钱包页已显示按钮
- 支付宝扫码成功
- 微信扫码成功
- 回调成功
- 查单成功
- 重复回调不重复加额

## 12. 常用示例

### 12.1 `ServerAddress` 示例

```text
https://pay.example.com
```

### 12.2 `CustomCallbackAddress` 示例

如果支付回调单独走另一个域名，可填：

```text
https://callback.example.com
```

不需要单独域名就留空。

### 12.3 `AmountOptions` 示例

```json
[10, 20, 50, 100, 200, 500]
```

### 12.4 `AmountDiscount` 示例

```json
{
  "100": 0.98,
  "200": 0.95,
  "500": 0.9
}
```

## 13. 建议你配合阅读的仓库文档

- `docs/alipay-official-setup.zh-CN.md`
- `docs/wechatpay-official-setup.zh-CN.md`
- `docs/payment-go-live-checklist.zh-CN.md`
- `docs/official-payment-not-showing-troubleshooting.zh-CN.md`
- `docs/payment-joint-debug-playbook.zh-CN.md`

## 14. 官方参考链接（截至 2026-04-19）

- 支付宝开放平台创建应用：<https://open.alipay.com/module/webApp>
- 支付宝商家中心：<https://b.alipay.com/>
- 微信支付 PC 网站接入支付指引：<https://pay.wechatpay.cn/static/applyment_guide/applyment_detail_website.shtml>
- 微信支付 `mchid` 与 `appid` 申请：<https://pay.wechatpay.cn/doc/v3/merchant/4012071573>
- 微信支付开发必要参数说明：<https://pay.wechatpay.cn/doc/v3/merchant/4013070756>
