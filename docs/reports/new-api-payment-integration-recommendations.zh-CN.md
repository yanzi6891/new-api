# `new-api` 国内外支付接入方案建议

> 更新日期：2026-04-20  
> 目标：结合当前仓库已有支付代码、前端设置页和充值/订阅链路，给出适合 `new-api` 的支付组合建议、上线顺序和后续优化方向。  
> 说明：本文重点回答“这个项目现在最适合怎么配、怎么上、怎么演进”，不是纯支付市场研究。

## 1. 当前仓库已经具备哪些支付能力

从当前代码和页面结构看，项目已经具备多支付通道基础能力，主要分成两类：

- `充值`：用户给账户余额充值
- `订阅`：用户购买订阅套餐

### 1.1 当前支持矩阵

| 支付方式 | 充值 | 订阅 | 回调/Webhook | 当前定位 |
| --- | --- | --- | --- | --- |
| 旧 `epay` / 聚合支付 | 支持 | 支持 | `/api/user/epay/notify`、`/api/subscription/epay/notify` | 兼容旧链路、迁移缓冲层 |
| Stripe | 支持 | 支持 | `/api/stripe/webhook` | 国际主力候选 |
| Creem | 支持 | 支持 | `/api/creem/webhook` | 国际数字产品/结账补充 |
| Waffo | 支持 | 当前未见订阅购买入口 | `/api/waffo/webhook` | 国际多支付方式补充 |
| 支付宝官方扫码 | 支持 | 当前未见订阅购买入口 | `/api/alipay/notify` | 中国大陆官方直连 |
| 微信官方扫码 | 支持 | 当前未见订阅购买入口 | `/api/wechatpay/notify` | 中国大陆官方直连 |
| 人工充值 | 支持 | 不支持 | 管理员审核补单 | 客服兜底 |

### 1.2 主要后端入口

| 功能 | 路由 |
| --- | --- |
| 获取充值配置 | `/api/user/topup/info` |
| 查询官方二维码订单状态 | `/api/user/topup/status/:tradeNo` |
| 旧 `epay` 支付 | `/api/user/pay` |
| Stripe 充值 | `/api/user/stripe/pay` |
| Creem 充值 | `/api/user/creem/pay` |
| Waffo 充值 | `/api/user/waffo/pay` |
| 支付宝官方充值 | `/api/user/alipay/pay` |
| 微信官方充值 | `/api/user/wechat/pay` |
| 人工充值 | `/api/user/manual/pay` |
| 订阅 `epay` 支付 | `/api/subscription/epay/pay` |
| 订阅 Stripe 支付 | `/api/subscription/stripe/pay` |
| 订阅 Creem 支付 | `/api/subscription/creem/pay` |

### 1.3 主要代码位置

| 模块 | 关键文件 |
| --- | --- |
| 充值配置聚合 | `controller/topup.go` |
| 支付宝/微信官方直连 | `controller/topup_official.go`、`service/payment_alipay_official.go`、`service/payment_wechat_official.go` |
| Stripe | `controller/topup_stripe.go`、`controller/subscription_payment_stripe.go`、`setting/payment_stripe.go` |
| Creem | `controller/topup_creem.go`、`controller/subscription_payment_creem.go`、`setting/payment_creem.go` |
| Waffo | `controller/topup_waffo.go`、`setting/payment_waffo.go` |
| 旧 `epay` | `controller/topup.go`、`controller/subscription_payment_epay.go`、`setting/operation_setting/payment_setting_old.go` |
| 支付后台设置页 | `web/src/components/settings/PaymentSetting.jsx` |
| 通用支付设置页 | `web/src/pages/Setting/Payment/SettingsPaymentGateway.jsx` |
| 官方扫码设置页 | `web/src/pages/Setting/Payment/SettingsPaymentGatewayOfficial.jsx` |
| Stripe 设置页 | `web/src/pages/Setting/Payment/SettingsPaymentGatewayStripe.jsx` |
| Creem 设置页 | `web/src/pages/Setting/Payment/SettingsPaymentGatewayCreem.jsx` |
| Waffo 设置页 | `web/src/pages/Setting/Payment/SettingsPaymentGatewayWaffo.jsx` |
| 前台充值页 | `web/src/components/topup/index.jsx`、`web/src/components/topup/RechargeCard.jsx` |
| 前台订阅购买页 | `web/src/components/topup/SubscriptionPlansCard.jsx` |

## 2. 先给结论：`new-api` 最适合的支付组合

### 2.1 如果你主要面向中国大陆用户

推荐主方案：

- 主链路：`支付宝官方扫码 + 微信官方扫码`
- 兜底链路：`人工充值`
- 迁移过渡：旧 `epay` 仅保留短期兼容，不建议继续作为长期主链路

原因：

- 中国大陆用户更习惯微信和支付宝官方钱包
- 当前仓库已经原生支持官方扫码创建订单、回调验签和主动查单
- 官方链路相比旧 `epay` 更可控，定位也更清晰
- 人工充值已经适合作为客服补单和极端故障兜底

### 2.2 如果你主要面向海外开发者、团队和 SaaS 用户

推荐主方案：

- 主链路：`Stripe`
- 中国大陆补充：`支付宝官方扫码 + 微信官方扫码`
- 客服兜底：`人工充值`
- 特定地区补充：在真实转化有需求时再加 `Waffo` 或 `Creem`

原因：

- 当前 Stripe 已同时打通 `充值` 和 `订阅`
- Stripe 在开发者支付、卡支付、订阅场景里更适合作为第一主 PSP
- `new-api` 本身偏 API/SaaS/开发者工具属性，Stripe 的匹配度高于纯门店型方案

### 2.3 如果你同时做中国大陆用户 + 海外用户

最推荐的实际组合不是“全开”，而是：

1. `中国大陆`：微信官方 + 支付宝官方
2. `海外`：Stripe
3. `客服/故障兜底`：人工充值
4. `补充国家/补充支付方式`：按真实数据决定是否启用 Waffo 或 Creem

这是当前仓库最平衡、最不容易把运营和对账复杂度拉爆的组合。

## 3. 不建议一开始就全部开启

项目虽然已经支持多个网关，但不代表应该同时全开。  
对 `new-api` 这类充值型项目来说，支付网关一多，问题会指数上升：

- 用户不知道该选哪个
- 对账链路变多
- 回调排查变多
- 退款和客服 SOP 变复杂
- 风控口径不一致
- 订阅与普通充值的行为不一致

建议优先保留 `一个主网关 + 一个地区补充 + 一个人工兜底`。

## 4. 分业务场景的推荐方案

### 4.1 场景 A：纯中国大陆充值站

推荐：

- `支付宝官方扫码`
- `微信官方扫码`
- `人工充值`

不建议长期保留：

- 旧 `epay` 作为唯一主链路

更适合当前仓库的原因：

- 已经有官方扫码创建订单与验签代码
- 充值成功后还能通过主动查单补齐部分“没回调但已支付”的情况
- 对钱包用户来说体验更直接

### 4.2 场景 B：全球 API 平台 / 海外开发者充值

推荐：

- `Stripe` 作为主链路
- `人工充值` 仅保留给企业客户或人工补单
- 需要中国大陆用户时，再补官方微信/支付宝

建议：

- 普通余额充值优先走 Stripe
- 周期套餐优先走 Stripe Subscription Checkout
- 支付失败页和成功页尽量都回到 `/console/topup`

### 4.3 场景 C：AI API 平台 + 中国大陆用户 + 海外用户混合

推荐：

- 中国大陆：官方支付宝/微信
- 海外：Stripe
- 客服兜底：人工充值
- 如需更多本地支付方式：优先评估 Waffo，Creem 作为数字产品补充

这里最重要的不是“方式多”，而是“用户看到的方式足够少且清晰”。

## 5. 当前仓库的关键优点

### 5.1 官方扫码链路已经比较完整

当前官方扫码链路不仅有：

- 下单
- 回调验签

还有：

- 主动查单
- 金额校验
- 订单状态查询

这对“用户已经支付但平台没及时收到回调”的场景很实用。

### 5.2 国际支付已经具备主框架

当前仓库已具备：

- Stripe 充值
- Stripe 订阅
- Creem 充值
- Creem 订阅
- Waffo 充值

说明这套系统已经不是“只能做国内二维码充值”的项目，而是有明显国际化扩展基础。

### 5.3 后台设置页已经按支付类型拆开

这点对运维很重要。当前设置页已拆成：

- 通用支付设置
- 旧支付/人工充值
- 官方扫码支付
- Stripe
- Creem
- Waffo

这很适合分阶段开启，而不是一次性上所有支付方式。

## 6. 当前仓库需要特别注意的地方

### 6.1 `ServerAddress` 是支付链路的起点配置

对当前项目来说，`ServerAddress` 非常关键，因为它影响：

- 支付回调地址拼接
- Stripe 返回地址
- 官方支付设置页的可用性

如果它填错，最常见结果是：

- 支付成功但不入账
- 后台开关看起来正常，但前台支付链路异常
- Webhook/回调地址配错

建议上线前把它当成 `P0 配置项` 检查。

### 6.2 订阅支付方式与普通充值方式不要混用概念

当前订阅前端在 `web/src/components/topup/SubscriptionPlansCard.jsx` 里，会把 `非 stripe / 非 creem` 的方法视为 `epay` 类方法。  
但后端 `SubscriptionRequestEpay` 实际只接受旧 `PayMethods` 中存在的支付方式。

这意味着如果你在普通充值里展示了：

- `alipay_official`
- `wxpay_native`
- `waffo`

而又把它们直接带入订阅购买选择器，存在“前台可选、后端不认”的风险。

建议后续把：

- `普通充值可用方法`
- `订阅可用方法`

拆成两套明确配置，而不是复用同一个前端候选列表。

### 6.3 人工充值要明确是兜底，不是主链路

人工充值适合：

- 官方支付故障时临时兜底
- 企业客户人工打款后补单
- 客服协助处理异常订单

不适合：

- 作为长期主支付链路
- 大规模自动化充值
- 高并发场景

### 6.4 不建议长期依赖旧 `epay` 作为核心战略

旧 `epay` 的价值更适合放在：

- 历史兼容
- 迁移缓冲
- 特定已有商户网关还不能立刻替换的场景

不建议继续把它当作未来主支付体系的中心。

## 7. 推荐的上线顺序

### 7.1 最稳妥的分阶段方案

#### 阶段 1：先把中国大陆主链路跑顺

- 配好 `ServerAddress`
- 开启 `支付宝官方扫码`
- 开启 `微信官方扫码`
- 保留 `人工充值` 兜底
- 暂时关闭其他国际网关

验收标准：

- 1 元真实支付成功
- 回调成功入账
- 主动查单可补入账
- 订单状态轮询正常
- 人工充值审核链路正常

#### 阶段 2：再开海外主链路

- 开启 `Stripe`
- 先测普通充值
- 再测订阅支付

验收标准：

- Stripe Checkout 可拉起
- Webhook 验签成功
- 充值订单与订阅订单都能正常完成
- 失败支付和过期支付状态能回收

#### 阶段 3：根据真实数据再加补充通道

- 若某些国家卡支付转化差，再看 `Waffo`
- 若你更偏数字产品/托管结账补充，再看 `Creem`

不要在没有真实支付转化数据之前，就把每个按钮都放给用户。

## 8. 按角色给建议

### 8.1 给产品

- 默认只展示用户真正需要的支付方式
- 中国大陆用户优先展示微信/支付宝
- 海外用户优先展示 Stripe
- 不要在一个面板里同时堆 6 个入口

### 8.2 给运营

- 每种支付方式都要有明确客服话术
- 明确“失败后换哪条链路”
- 明确什么场景走人工充值
- 维护一份网关异常切换预案

### 8.3 给财务

- 按网关分别对账
- 区分充值订单与订阅订单
- 单独核对退款、拒付、异常补单
- 记录每个网关的到账周期与冻结策略

### 8.4 给技术

- 所有回调都要记录原始 payload
- 保持订单幂等处理
- 给每条网关加统一审计日志
- 做每日对账或异常订单巡检

## 9. 推荐的后续优化项

### 9.1 把支付能力做成更明确的能力矩阵

建议把每个支付网关抽象成固定能力标签，例如：

- `supports_topup`
- `supports_subscription`
- `supports_qr`
- `supports_redirect_checkout`
- `supports_webhook`
- `supports_manual_review`

这样前端和后台都能根据能力自动筛选，而不是靠隐式约定。

### 9.2 拆分普通充值与订阅支付方式配置

这是当前最值得做的一个结构化优化。  
建议未来至少拆成：

- `TopUpPayMethods`
- `SubscriptionPayMethods`

避免 UI 展示和后端实际支持不一致。

### 9.3 增加统一的支付回调审计页

建议新增管理能力：

- 最近回调列表
- 验签结果
- 订单关联状态
- 重试情况
- 手动补单入口

这会极大降低联调和生产排障成本。

### 9.4 增加统一对账任务

建议做一个定时任务，按支付网关检查：

- 待支付超时订单
- 已支付未入账订单
- Webhook 未到但主动查单已成功的订单
- 重复回调或异常金额订单

## 10. 推荐的最终落地组合

### 10.1 大多数 `new-api` 站点的推荐答案

如果让我直接给一个最稳妥的默认答案，我会建议：

- 中国大陆：`支付宝官方扫码 + 微信官方扫码`
- 海外：`Stripe`
- 兜底：`人工充值`
- 过渡兼容：旧 `epay` 仅在迁移期保留

### 10.2 什么时候再考虑 Waffo 或 Creem

只有在下面情况之一成立时，再建议加：

- Stripe 覆盖不到你的重点国家
- 你需要更多本地支付方式
- 你更偏数字商品托管结账
- 你已经有真实用户反馈“当前支付方式不够”

否则先别把支付面板做复杂。

## 11. 相关仓库文档

如果你要继续落地当前项目支付配置，建议配合这些文档一起看：

- `docs/reports/aggregated-payment-platforms-comparison.zh-CN.md`
- `docs/支付后台字段级填写对照表.zh-CN.md`
- `docs/支付配置示例大全.zh-CN.md`
- `docs/支付联调排错手册.zh-CN.md`
- `docs/wechatpay-official-setup.zh-CN.md`
- `docs/alipay-official-setup.zh-CN.md`

