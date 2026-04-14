# Go 环境安装完成后的下一步操作

更新时间：2026-04-14

## 1. 当前状态

已经确认：

- Go 已安装在 `D:\Program Files\Go\bin\go.exe`
- Go 版本为 `go1.26.2 windows/amd64`
- 项目后端已能通过编译检查：

```powershell
& 'D:\Program Files\Go\bin\go.exe' build ./...
```

这说明现在可以进入“启动项目 + 配支付参数 + 联调支付”的阶段。

## 2. 先处理 PATH

当前终端里直接输入 `go` 还不能识别，原因是 `PATH` 还没有生效。

### 临时生效

在当前 PowerShell 里执行：

```powershell
$env:Path += ';D:\Program Files\Go\bin'
go version
```

### 永久生效

把下面这个目录加入系统或用户环境变量 `Path`：

```text
D:\Program Files\Go\bin
```

然后关闭当前终端，重新打开 PowerShell。

## 3. 启动项目

在项目根目录执行：

```powershell
go run .
```

如果当前终端还没识别 `go`，也可以直接这样执行：

```powershell
& 'D:\Program Files\Go\bin\go.exe' run .
```

## 4. 前端本地调试

如果你要本地查看前端页面：

```powershell
cd web
bun run dev
```

如果只是确认前端能构建：

```powershell
cd web
bun run build
```

## 5. 配置官方支付参数

进入后台支付设置页，填写以下配置。

### 支付宝官方

- `AlipayOfficialEnabled`
- `AlipayOfficialAppId`
- `AlipayOfficialPrivateKey`
- `AlipayOfficialPublicKey`
- `AlipayOfficialGateway`

### 微信支付官方

- `WeChatPayOfficialEnabled`
- `WeChatPayOfficialAppId`
- `WeChatPayOfficialMchId`
- `WeChatPayOfficialSerialNo`
- `WeChatPayOfficialPrivateKey`
- `WeChatPayOfficialAPIv3Key`
- `WeChatPayOfficialPlatformCert`

## 6. 配置回调地址

支付回调必须能够被公网访问。

当前第一版使用的回调地址为：

### 支付宝

```text
/api/alipay/notify
```

### 微信支付

```text
/api/wechatpay/notify
```

所以你需要保证后台配置中的服务地址是可公网访问的 HTTPS 域名。

如果现在只是本地开发环境，通常需要：

- 公网域名 + HTTPS
- 或使用内网穿透，例如 `ngrok`、`frp`、`Cloudflare Tunnel`

## 7. 建议联调顺序

推荐按下面顺序联调。

1. 先只开启支付宝官方支付
2. 发起一笔小额充值
3. 确认前端成功弹出二维码
4. 手机扫码支付
5. 检查订单是否从 `pending` 变成 `success`
6. 检查用户额度是否到账
7. 再按同样流程联调微信支付

## 8. 联调时重点检查的内容

### 下单阶段

- 是否成功创建本地订单
- 是否成功返回二维码内容
- 前端二维码弹窗是否正常展示

### 支付阶段

- 用户扫码后是否实际扣款
- 支付平台是否成功回调项目
- 回调验签是否通过
- 回调金额是否与本地订单金额一致

### 入账阶段

- 订单状态是否更新为 `success`
- 用户额度是否正确增加
- 支付历史记录是否显示正确

## 9. 当前第一版范围

这次落地的第一版只覆盖：

- PC 端
- 支付宝二维码支付
- 微信二维码支付
- 普通充值

暂不包含：

- 订阅支付
- 移动端 H5
- 微信 JSAPI
- App SDK 支付

## 10. 下一步建议

从现在开始，最合理的顺序就是：

1. 让 `go` 在终端里直接可用
2. 启动 `new-api`
3. 打开后台，填写支付宝和微信官方参数
4. 配置可公网访问的回调地址
5. 先测支付宝，再测微信

