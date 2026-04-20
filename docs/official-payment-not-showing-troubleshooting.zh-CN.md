# 钱包管理页未展示支付宝/微信充值功能排查说明

## 1. 问题现象

在“钱包管理”页面中，只看到兑换码充值，或者看到“管理员未开启在线充值功能，请联系管理员开启或使用兑换码充值”，但代码里已经实现了：

- 支付宝官方扫码支付
- 微信官方 Native 扫码支付

这通常不是前端没写，而是当前运行中的后端没有把官方支付判定为“已启用”。

## 2. 页面为什么不显示

前端是否展示充值按钮，取决于后端接口 `/api/user/topup/info` 的返回结果。

关键链路如下：

- 前端页面入口：
  - [web/src/components/topup/index.jsx](D:/workspace2026/workspace-fromGithub/new-api/web/src/components/topup/index.jsx)
  - [web/src/components/topup/RechargeCard.jsx](D:/workspace2026/workspace-fromGithub/new-api/web/src/components/topup/RechargeCard.jsx)
- 后端充值信息接口：
  - [controller/topup.go](D:/workspace2026/workspace-fromGithub/new-api/controller/topup.go)

其中 `GetTopUpInfo` 会返回：

- `enable_alipay_official_topup`
- `enable_wechat_official_topup`
- `pay_methods`

只有这些值正确返回，前端才会展示支付宝/微信支付按钮。

## 3. 后端如何判定“已启用”

### 3.1 支付宝官方支付启用条件

判定逻辑见：

- [service/payment_alipay_official.go](D:/workspace2026/workspace-fromGithub/new-api/service/payment_alipay_official.go)

必须同时满足：

- `AlipayOfficialEnabled = true`
- `AlipayOfficialAppId` 非空
- `AlipayOfficialPrivateKey` 非空
- `AlipayOfficialPublicKey` 非空

只要少一个，`enable_alipay_official_topup` 就会是 `false`。

### 3.2 微信官方支付启用条件

判定逻辑见：

- [service/payment_wechat_official.go](D:/workspace2026/workspace-fromGithub/new-api/service/payment_wechat_official.go)

必须同时满足：

- `WeChatPayOfficialEnabled = true`
- `WeChatPayOfficialAppId` 非空
- `WeChatPayOfficialMchId` 非空
- `WeChatPayOfficialSerialNo` 非空
- `WeChatPayOfficialPrivateKey` 非空
- `WeChatPayOfficialAPIv3Key` 非空
- `WeChatPayOfficialPlatformCert` 非空

额外要求：

- `WeChatPayOfficialAPIv3Key` 长度必须正好是 32 字节

只要少一个，`enable_wechat_official_topup` 就会是 `false`。

## 4. 你应该去哪里配置

后台菜单路径如下。

### 4.1 一级入口

管理员侧边栏进入：

- `系统设置`

相关菜单定义可见：

- [web/src/components/layout/SiderBar.jsx](D:/workspace2026/workspace-fromGithub/new-api/web/src/components/layout/SiderBar.jsx)

### 4.2 二级入口

进入设置页后，打开：

- `支付设置`

对应配置页入口：

- [web/src/pages/Setting/index.jsx](D:/workspace2026/workspace-fromGithub/new-api/web/src/pages/Setting/index.jsx)
- [web/src/components/settings/PaymentSetting.jsx](D:/workspace2026/workspace-fromGithub/new-api/web/src/components/settings/PaymentSetting.jsx)

### 4.3 支付设置页内需要配置的区块

先配置：

- `通用设置`

再配置：

- `官方扫码支付`

对应文件：

- [web/src/pages/Setting/Payment/SettingsGeneralPayment.jsx](D:/workspace2026/workspace-fromGithub/new-api/web/src/pages/Setting/Payment/SettingsGeneralPayment.jsx)
- [web/src/pages/Setting/Payment/SettingsPaymentGatewayOfficial.jsx](D:/workspace2026/workspace-fromGithub/new-api/web/src/pages/Setting/Payment/SettingsPaymentGatewayOfficial.jsx)

## 5. 正确配置步骤

### 5.1 先配置服务器地址

先在“支付设置 -> 通用设置”里填写：

- `ServerAddress`

例如：

```text
https://your-domain.com
```

这个地址会影响：

- 支付回调地址展示
- 默认回跳地址
- 未单独指定回调域名时的支付回调基地址

相关代码：

- [web/src/pages/Setting/Payment/SettingsGeneralPayment.jsx](D:/workspace2026/workspace-fromGithub/new-api/web/src/pages/Setting/Payment/SettingsGeneralPayment.jsx)
- [service/epay.go](D:/workspace2026/workspace-fromGithub/new-api/service/epay.go)

### 5.2 再配置支付宝官方扫码支付

在“支付设置 -> 官方扫码支付”里填写：

- `AlipayOfficialEnabled`
- `AlipayOfficialAppId`
- `AlipayOfficialGateway`
- `AlipayOfficialPrivateKey`
- `AlipayOfficialPublicKey`

说明：

- `AlipayOfficialGateway` 生产环境一般是 `https://openapi.alipay.com/gateway.do`
- 沙箱联调一般是 `https://openapi.alipaydev.com/gateway.do`
- `AlipayOfficialPublicKey` 必须是支付宝公钥，不是应用公钥

### 5.3 再配置微信官方扫码支付

在“支付设置 -> 官方扫码支付”里填写：

- `WeChatPayOfficialEnabled`
- `WeChatPayOfficialAppId`
- `WeChatPayOfficialMchId`
- `WeChatPayOfficialSerialNo`
- `WeChatPayOfficialPrivateKey`
- `WeChatPayOfficialAPIv3Key`
- `WeChatPayOfficialPlatformCert`

说明：

- `WeChatPayOfficialSerialNo` 是商户 API 证书序列号
- `WeChatPayOfficialPlatformCert` 是微信支付平台证书完整 PEM 内容
- `WeChatPayOfficialAPIv3Key` 必须是 32 字节

## 6. 为什么开关可能点不开

后台在更新配置时做了前置校验。

相关代码：

- [controller/option.go](D:/workspace2026/workspace-fromGithub/new-api/controller/option.go)

也就是说：

- 如果支付宝必填项没填完，`AlipayOfficialEnabled` 切到 `true` 会失败
- 如果微信必填项没填完，`WeChatPayOfficialEnabled` 切到 `true` 会失败

对应校验条件：

- 支付宝缺少 `AppId`、应用私钥、支付宝公钥时，不允许开启
- 微信缺少 `AppId`、`MchId`、`SerialNo`、私钥、`APIv3Key`、平台证书时，不允许开启

## 7. 配完后是否需要重启

通常不需要。

原因是后台更新 `/api/option/` 时，会直接更新内存中的配置值。

相关代码：

- [controller/option.go](D:/workspace2026/workspace-fromGithub/new-api/controller/option.go)
- [model/option.go](D:/workspace2026/workspace-fromGithub/new-api/model/option.go)

也就是说，正常流程是：

1. 管理后台保存配置
2. 后端内存配置即时更新
3. 用户刷新“钱包管理”页
4. 前端重新调用 `/api/user/topup/info`
5. 充值按钮出现

## 8. 如何快速自查

最直接的方法是检查 `/api/user/topup/info` 的返回值。

重点看：

- `enable_alipay_official_topup`
- `enable_wechat_official_topup`
- `pay_methods`

理想返回示例：

```json
{
  "enable_alipay_official_topup": true,
  "enable_wechat_official_topup": true,
  "pay_methods": [
    {
      "name": "Alipay Official",
      "type": "alipay_official",
      "min_topup": "1"
    },
    {
      "name": "WeChat Pay Official",
      "type": "wxpay_native",
      "min_topup": "1"
    }
  ]
}
```

如果出现以下情况，就不会展示：

- `enable_alipay_official_topup = false`
- `enable_wechat_official_topup = false`
- `pay_methods` 里没有 `alipay_official`
- `pay_methods` 里没有 `wxpay_native`

## 9. 常见原因清单

### 9.1 只写了代码，没有在运行实例里填配置

最常见。代码存在不等于功能自动开启。

### 9.2 填了配置，但没打开 Enabled 开关

比如：

- `AlipayOfficialEnabled` 仍为 `false`
- `WeChatPayOfficialEnabled` 仍为 `false`

### 9.3 微信少填了 `SerialNo`

这是特别容易漏掉的一项。

### 9.4 微信 `APIv3Key` 长度不对

即使不为空，也可能因为长度不等于 32 而实际不可用。

### 9.5 `ServerAddress` 没配成公网地址

虽然这不一定导致前端按钮完全不显示，但会导致支付回调链路不完整，实际无法正常收款确认。

### 9.6 当前访问的不是你刚配置的那台实例

例如：

- 配的是本地服务
- 打开的却是另一个环境的页面

### 9.7 前端页面未刷新

配置已生效，但页面还保留旧状态，需要刷新重新拉取 `/api/user/topup/info`。

## 10. 对应回调地址

官方扫码支付使用的回调地址为：

- 支付宝：`/api/alipay/notify`
- 微信：`/api/wechatpay/notify`

请求创建逻辑见：

- [controller/topup_official.go](D:/workspace2026/workspace-fromGithub/new-api/controller/topup_official.go)

回调基地址来源：

- 默认使用 `ServerAddress`
- 如果配置了 `CustomCallbackAddress`，则优先使用它

相关代码：

- [service/epay.go](D:/workspace2026/workspace-fromGithub/new-api/service/epay.go)

## 11. 本次结论

当前“钱包管理”页没有展示支付宝/微信充值功能，不是因为前端没有实现，也不是因为官方扫码支付接口没写，而是因为当前运行实例没有满足官方支付的启用条件，导致：

- `/api/user/topup/info` 未返回对应启用标志
- `pay_methods` 未包含官方支付方式
- 前端因此不展示对应按钮

优先检查顺序建议如下：

1. 后台 `系统设置 -> 支付设置 -> 通用设置` 是否已填写 `ServerAddress`
2. 后台 `系统设置 -> 支付设置 -> 官方扫码支付` 是否已完整填写支付宝配置
3. 后台 `系统设置 -> 支付设置 -> 官方扫码支付` 是否已完整填写微信配置
4. 是否已成功打开 `AlipayOfficialEnabled`
5. 是否已成功打开 `WeChatPayOfficialEnabled`
6. 浏览器里检查 `/api/user/topup/info` 返回值

