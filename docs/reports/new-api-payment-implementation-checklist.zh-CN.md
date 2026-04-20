# `new-api` 支付接入实施清单

> 更新日期：2026-04-20  
> 目标：把 `new-api` 当前已经具备的支付能力，变成一份可执行的实施清单，适合按阶段推进配置、联调、灰度、上线。  
> 适用对象：产品、运营、后端、前端、测试、运维。

## 1. 建议的默认实施策略

对大多数 `new-api` 站点，我建议按这个顺序落地：

1. `中国大陆主链路`：微信支付官方 + 支付宝官方
2. `海外主链路`：Stripe
3. `人工兜底`：人工充值
4. `过渡兼容`：旧 `epay` 只在迁移期保留
5. `扩展补充`：Waffo / Creem 按真实业务需求追加

原因很简单：

- 这是当前仓库现成支持最好的一组组合
- 对账复杂度可控
- 用户端认知最清晰
- 订阅和普通充值也更容易拆开维护

## 2. 实施前置条件

### 2.1 基础资源

- 一个稳定的正式域名
- 全站 HTTPS
- 可公网访问的回调地址
- 可持续写入的应用日志
- 一套可用于真实支付的小额测试账号

### 2.2 必须先确认的业务问题

- 你的主体是什么：大陆公司、香港公司、海外公司
- 你的主要用户在哪里：中国大陆、海外、混合
- 你的支付类型是什么：一次性充值、订阅、企业打款、人工补单
- 你的业务是否属于 `余额充值`、`credits`、`API 点数`
- 各支付平台是否允许你的业务类目

### 2.3 上线前必须知道的代码位置

| 关注点 | 文件 |
| --- | --- |
| 充值配置聚合 | `controller/topup.go` |
| 官方扫码链路 | `controller/topup_official.go` |
| Stripe 充值/订阅 | `controller/topup_stripe.go`、`controller/subscription_payment_stripe.go` |
| Creem | `controller/topup_creem.go`、`controller/subscription_payment_creem.go` |
| Waffo | `controller/topup_waffo.go` |
| 后台设置页 | `web/src/components/settings/PaymentSetting.jsx` |
| 官方支付设置页 | `web/src/pages/Setting/Payment/SettingsPaymentGatewayOfficial.jsx` |
| 旧支付/人工充值设置页 | `web/src/pages/Setting/Payment/SettingsPaymentGateway.jsx` |
| Stripe 设置页 | `web/src/pages/Setting/Payment/SettingsPaymentGatewayStripe.jsx` |
| 前台充值页 | `web/src/components/topup/index.jsx` |
| 前台订阅购买页 | `web/src/components/topup/SubscriptionPlansCard.jsx` |

## 3. 阶段 0：先做支付策略冻结

在开始填后台前，先写死本次上线到底启哪些通道。

### 3.1 推荐冻结模板

```md
## 当前上线支付方案

- 中国大陆充值：
- 海外充值：
- 订阅支付：
- 人工兜底：
- 迁移保留：
- 暂不上线：
```

### 3.2 强烈不建议的做法

- 一开始同时开启 `epay + 官方扫码 + Stripe + Creem + Waffo + 人工充值`
- 普通充值和订阅都复用同一套支付方式展示
- 没有正式域名和 HTTPS 就直接测正式回调

## 4. 阶段 1：通用配置检查

### 4.1 `ServerAddress`

这是当前项目的 `P0 配置项`。

必须确认：

- 值是正式可访问域名
- 末尾不多余带 `/`
- 外网能访问
- 与支付平台后台里配置的回调域名一致

它会影响：

- 支付宝回调：`/api/alipay/notify`
- 微信回调：`/api/wechatpay/notify`
- Stripe 返回页与 Webhook 文案
- 后台支付设置页的校验逻辑

### 4.2 充值金额与显示逻辑

在上线前确认：

- 最低充值金额
- 充值档位
- 折扣策略
- 用户组倍率
- 货币显示类型

重点看：

- `controller/topup.go`
- `setting/operation_setting/payment_setting.go`
- `setting/operation_setting/payment_setting_old.go`

### 4.3 先清理“旧按钮误导”

如果你的目标是官方扫码或人工充值，不要还保留旧 `alipay` / `wxpay` 的 `epay` 按钮配置。  
否则前台可能还会把用户引到旧 `submit.php` 风格链路。

## 5. 阶段 2：中国大陆官方扫码接入

### 5.1 支付宝官方

需要准备：

- `AlipayOfficialEnabled`
- `AlipayOfficialAppId`
- `AlipayOfficialGateway`
- `AlipayOfficialPrivateKey`
- `AlipayOfficialPublicKey`

代码落点：

- 设置：`setting/payment_official.go`
- 下单/回调：`controller/topup_official.go`
- 服务层：`service/payment_alipay_official.go`

验收点：

- 能生成二维码
- 手机能扫码支付
- 支付成功后回调入账
- 金额校验通过
- 轮询查单可补入账

### 5.2 微信支付官方

需要准备：

- `WeChatPayOfficialEnabled`
- `WeChatPayOfficialAppId`
- `WeChatPayOfficialMchId`
- `WeChatPayOfficialSerialNo`
- `WeChatPayOfficialPrivateKey`
- `WeChatPayOfficialAPIv3Key`
- `WeChatPayOfficialPlatformCert`

代码落点：

- 设置：`setting/payment_official.go`
- 下单/回调：`controller/topup_official.go`
- 服务层：`service/payment_wechat_official.go`

验收点：

- Native 下单返回 `code_url`
- 回调能验签
- 解密通知成功
- 金额一致时入账
- 已关闭订单会更新为 `expired`

### 5.3 官方扫码联调顺序

推荐按这个顺序：

1. 先支付宝 1 元
2. 再微信 1 元
3. 再测最小充值值
4. 再测支付后立即回调
5. 再测“只查单不依赖回调”的补偿场景

## 6. 阶段 3：Stripe 接入

### 6.1 适用范围

Stripe 更适合：

- 海外开发者用户
- 海外团队
- 出海 SaaS
- 国际信用卡支付
- 周期订阅

### 6.2 配置项

需要准备：

- `StripeApiSecret`
- `StripeWebhookSecret`
- `StripePriceId`
- `StripeUnitPrice`
- `StripeMinTopUp`
- `StripePromotionCodesEnabled`

代码落点：

- 设置：`setting/payment_stripe.go`
- 充值：`controller/topup_stripe.go`
- 订阅：`controller/subscription_payment_stripe.go`
- Webhook：`/api/stripe/webhook`

### 6.3 验收点

- 能拉起 Checkout
- 支付成功能回到站内页面
- Webhook 验签成功
- 普通充值订单能完成
- 订阅订单能完成
- 过期会话能正确标记为 `expired`

### 6.4 上线前额外确认

- 你的主体能否开 Stripe
- 你的业务是否允许做余额充值 / API credits
- 退款、拒付、促销码策略是否已经明确

## 7. 阶段 4：人工充值兜底

人工充值适合做：

- 客服兜底
- 企业打款补单
- 支付网关异常时的备用通道

不建议做：

- 默认主链路
- 全自动充值
- 高频用户的首选方式

### 7.1 配置项

- `ManualTopUpEnabled`
- `ManualTopUpAlipayQRCode`
- `ManualTopUpWeChatQRCode`
- `ManualTopUpAlipayAmountQRCodes`
- `ManualTopUpWeChatAmountQRCodes`
- `ManualTopUpInstructions`

### 7.2 验收点

- 用户能提交人工充值申请
- 待审核订单能进入后台
- 管理员可审核补单
- 前台文案足够清晰

## 8. 阶段 5：是否追加 Waffo / Creem

### 8.1 什么时候考虑 Waffo

只有在这些情况成立时再考虑：

- Stripe 覆盖不够
- 你需要更多本地支付方式
- 海外某些地区转化确实不足

当前仓库里 Waffo 更像：

- 海外多支付方式补充
- 普通充值补充

而不是当前默认主方案。

### 8.2 什么时候考虑 Creem

更适合：

- 数字产品
- 托管结账需求
- 订阅补充

但如果你的国际主链路已经被 Stripe 跑顺，不建议在没数据支撑前就把 Creem 放到用户首屏。

## 9. 阶段 6：订阅支付专项检查

这一段非常关键。

### 9.1 当前仓库的一个现实约束

前端订阅购买组件 `web/src/components/topup/SubscriptionPlansCard.jsx` 里：

- `stripe` 单独走 Stripe 订阅
- `creem` 单独走 Creem 订阅
- 其他大多数方法会被当成 `epay` 类方法处理

但后端 `controller/subscription_payment_epay.go` 只接受旧 `PayMethods` 里的支付方式。

这意味着：

- 普通充值里能展示的方法
- 不一定都能直接用于订阅购买

### 9.2 现阶段建议

订阅先只开：

- `Stripe`
- `Creem`
- 若历史链路仍在，可短期保留 `epay`

不要直接把：

- `alipay_official`
- `wxpay_native`
- `waffo`

暴露成订阅购买方式，除非你已经补齐后端对应能力。

### 9.3 推荐后续优化

后续最好把：

- 普通充值支付方式
- 订阅支付方式

拆成两套明确配置，而不是共享同一套候选项。

## 10. 灰度与上线清单

### 10.1 灰度前

- [ ] 已确认正式域名与 HTTPS
- [ ] 已确认回调地址在支付平台后台配置正确
- [ ] 已完成 1 元真实支付测试
- [ ] 已验证订单入账
- [ ] 已验证失败订单处理
- [ ] 已验证前台状态刷新与轮询
- [ ] 已准备客服 FAQ
- [ ] 已准备人工补单流程

### 10.2 正式上线日

- [ ] 先开中国大陆或海外其中一个主链路，不要一次全开
- [ ] 观察前 10~20 笔真实订单
- [ ] 记录支付成功率、回调到达率、人工补单率
- [ ] 检查日志里是否有验签失败、金额不一致、订单未找到
- [ ] 确认财务对账可跑通

### 10.3 上线后一周内

- [ ] 每天巡检未完成订单
- [ ] 每天巡检支付成功但未入账订单
- [ ] 每天复核人工充值审核记录
- [ ] 对比各支付方式转化率
- [ ] 再决定是否追加 Waffo / Creem / 保留旧 epay

## 11. 回滚预案

如果支付主链路出现大面积异常，建议按这个顺序回滚：

1. 先隐藏异常支付方式入口
2. 保留人工充值兜底
3. 如果中国大陆官方异常，可临时启用旧兼容通道
4. 如果国际网关异常，可暂时只保留可用网关
5. 明确公告影响范围和恢复时间

## 12. 推荐的最终状态

如果让我给一个“上线后比较健康”的长期状态，我会建议：

### 12.1 中国大陆用户主站

- 主链路：`微信支付 + 支付宝`
- 兜底：`人工充值`
- 迁移期后逐步下线旧 `epay`

### 12.2 海外用户主站

- 主链路：`Stripe`
- 兜底：`人工充值` 或企业线下打款
- 有真实地区需求时再加 `Waffo` / `Creem`

### 12.3 混合型站点

- 中国大陆：官方扫码
- 海外：Stripe
- 订阅：Stripe 优先
- 复杂平台账务需求出现后，再考虑引入更强的平台型支付方案

## 13. 相关参考文档

- `docs/reports/aggregated-payment-platforms-comparison.zh-CN.md`
- `docs/reports/payment-vendor-evaluation-template.zh-CN.md`
- `docs/reports/new-api-payment-integration-recommendations.zh-CN.md`
- `docs/支付后台字段级填写对照表.zh-CN.md`
- `docs/支付配置示例大全.zh-CN.md`
- `docs/支付联调排错手册.zh-CN.md`

