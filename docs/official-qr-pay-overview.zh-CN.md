# new-api 官方二维码支付接入总览

更新时间：2026-04-14

## 1. 当前结论

你的场景已经比较明确：

- 用户主要在国内
- 只需要 PC 端展示二维码
- 支持支付宝扫码、微信扫码
- 先做普通充值，不做订阅

在这个范围下，最合适的第一版方案不是继续依赖 `epay` 类聚合协议，而是直接接入：

- 支付宝官方扫码支付
- 微信支付官方 Native 支付

这样做的优点是：

- 支付链路更直接
- 长期维护更可控
- 不依赖第三方聚合平台是否稳定
- 后续和开源上游同步时，业务边界也更清晰

## 2. 你之前问题的统一总结

### 2.1 `epay` 是什么

`new-api` 文档中的“易支付 / epay”不是某一家固定公司的统一官网产品，而是一类常见的聚合支付接口协议兼容方式。

它的含义更接近：

- 某些第三方支付平台提供了一套“兼容 epay 协议”的接口
- `new-api` 现有的支付能力可以直接对接这类平台

所以：

- `epay` 不等于支付宝官方
- `epay` 不等于微信支付官方
- `epay` 也没有唯一的“总官网”

### 2.2 用什么第三方支付平台

你这个项目如果只追求“尽快上线、尽量不改代码”，适合选兼容 `epay` 的聚合平台。

但你后面已经明确：

- 用户主要在国内
- 只需要 PC 二维码收款
- 希望后期持续维护并跟上游同步

在这个前提下，更推荐官方直连，而不是继续依赖聚合平台。

### 2.3 `Merchant of Record / global payments / compliance` 是什么

- `Merchant of Record`
  - 名义商户 / 交易责任主体
  - 谁负责收款、退款、税务、风控、争议处理，谁就是 MoR
- `global payments`
  - 全球收款能力
  - 常见于多国家、多币种、多支付方式场景
- `compliance`
  - 合规
  - 包括实名认证、风控、税务、隐私、支付监管等

对你当前这个国内扫码充值项目来说，这些概念需要知道，但不是第一阶段重点。

### 2.4 支持国内支付宝/微信的平台有哪些

大致分两类：

- 官方直连
  - 支付宝官方
  - 微信支付官方
- 聚合平台
  - 兼容 `epay` 的各类平台
  - 其他聚合收款平台，如部分 SaaS 聚合商、服务商方案

如果目标是长期稳定，优先选官方直连。

### 2.5 官方直连对源码改动大吗

如果做“全场景支付体系”，改动会比较大。

但你这里只做：

- PC 端二维码
- 支付宝扫码
- 微信扫码
- 普通充值

那么改动量属于中等，主要集中在：

- 新增支付配置项
- 新增支付宝下单与回调
- 新增微信 Native 下单与回调
- 新增订单状态轮询接口
- 前端新增二维码弹窗和支付状态确认

不需要重构整套充值模型，也不需要推翻现有 `epay` 能力。

### 2.6 手续费是官方便宜还是聚合平台便宜

一般规律是：

- 官方直连费率通常更透明
- 聚合平台通常会在官方成本上再叠加服务费或通道费

所以长期看，官方直连通常不会比聚合平台更贵，很多时候反而更划算。

但实际费率取决于：

- 你的商户主体类型
- 签约产品
- 月交易规模
- 是否服务商模式

如果要做正式上线预算，必须以你实际签约的支付宝和微信合同费率为准。

## 3. 分支与维护策略

你后面提出的要求是正确的：不要直接基于 `main` 做长期业务改动。

当前已经按稳定基线处理为：

- `stable/v0.12.9`
  - 以 `v0.12.9` 标签为稳定基线
- `feat/official-qr-pay`
  - 从 `stable/v0.12.9` 拉出的支付开发分支

当前工作分支是：

- `feat/official-qr-pay`

这意味着：

- 不是在 `main` 上直接开发
- 后续上游升级时，可以先比较 `stable/v0.12.9` 与新的上游版本，再决定迁移策略

推荐长期模型：

- `upstream/main` 或本地只读同步分支
- `stable/vX.Y.Z`
- `feat/*`

## 4. 官方仓库不是你的，应该怎么处理

如果当前远程仓库是别人的仓库，你通常：

- 可以本地修改
- 可以本地提交 `commit`
- 但没有权限直接 `push`

正确做法是：

1. 在 GitHub 上 fork 官方仓库到你自己的账号
2. 把你自己的 fork 设为 `origin`
3. 把官方仓库改名为 `upstream`
4. 以后把自己的代码推到自己的 fork
5. 需要时再从你的 fork 提 PR 到官方仓库

## 5. 当前第一版实现已经落地的范围

这一版是“官方扫码支付 v1”，范围刻意收窄，只解决你当前最需要的能力。

### 5.1 后端新增能力

- 新增支付宝官方支付配置
- 新增微信支付官方配置
- 新增支付宝下单接口
- 新增微信 Native 下单接口
- 新增支付宝回调接口
- 新增微信支付回调接口
- 新增订单状态查询接口

已新增的主要接口：

- `POST /api/user/alipay/pay`
- `POST /api/user/wechat/pay`
- `POST /api/alipay/notify`
- `POST /api/wechatpay/notify`
- `GET /api/user/topup/status/:tradeNo`

### 5.2 前端新增能力

- 管理后台新增“官方支付配置”页面
- 充值流程新增支付确认弹窗
- 新增二维码支付弹窗
- 弹窗内轮询订单状态
- 支付成功后自动刷新充值状态

### 5.3 保留了什么

以下现有能力没有被推翻：

- 原有 `epay` 支付逻辑
- 原有其他支付方式配置
- 原有充值主流程

所以当前实现属于“增量扩展”，不是“重写支付系统”。

## 6. 已新增或修改的核心文件

后端：

- `setting/payment_official.go`
- `service/payment_official_common.go`
- `service/payment_alipay_official.go`
- `service/payment_wechat_official.go`
- `controller/topup_official.go`
- `controller/topup.go`
- `controller/option.go`
- `model/option.go`
- `model/topup.go`
- `router/api-router.go`

前端：

- `web/src/pages/Setting/Payment/SettingsPaymentGatewayOfficial.jsx`
- `web/src/components/settings/PaymentSetting.jsx`
- `web/src/components/topup/index.jsx`
- `web/src/components/topup/RechargeCard.jsx`
- `web/src/components/topup/modals/QRCodePaymentModal.jsx`
- `web/src/components/topup/modals/PaymentConfirmModal.jsx`
- `web/src/components/topup/modals/TopupHistoryModal.jsx`

## 7. 当前验证结果

当前分支上的代码已完成基础编译验证：

- 后端已通过 `go build ./...`
- 前端已通过 `bun run build`

说明第一版结构已经可以继续进入联调阶段。

## 8. 现在还差什么才能真正上线

代码落地只是第一步，正式支付还需要真实商户参数和公网回调环境。

你接下来要完成：

1. 申请并配置支付宝官方商户参数
2. 申请并配置微信支付官方商户参数
3. 准备可公网访问的 HTTPS 回调地址
4. 在后台填入参数
5. 用真实商户做扫码联调
6. 验证支付成功、重复回调、异常订单、超时订单等场景

## 9. 已保存的相关文档

当前 `docs/` 下已经有这些专题文档：

- `docs/payment-integration-guide.zh-CN.md`
- `docs/upstream-maintenance-workflow.zh-CN.md`
- `docs/go-next-steps.zh-CN.md`
- `docs/fork-and-remote-workflow.zh-CN.md`

本文件的作用是：

- 把前面所有问题和答案做一次集中总览
- 便于后面交接、回顾、继续实施

## 10. 下一步建议

最合理的下一步顺序是：

1. 先 fork 官方仓库到你自己的 GitHub
2. 调整本地 `origin/upstream`
3. 把当前 `stable/v0.12.9` 和 `feat/official-qr-pay` 保存到你自己的 fork
4. 填写支付宝、微信官方商户参数
5. 做第一轮真实扫码联调

如果你继续往下做，下一阶段最有价值的文档通常是：

- 支付宝官方参数申请与填写说明
- 微信支付 APIv3 证书与参数准备说明
- 公网回调与 Nginx / HTTPS 配置说明
