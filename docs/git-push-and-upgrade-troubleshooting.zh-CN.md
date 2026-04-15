# Git 推送报错与后续升级维护说明

更新时间：2026-04-15

## 1. 当前这次报错的根因

你执行的是：

```powershell
git remote rename origin upstream
git remote add origin https://yanzi6891/new-api.git
git push -u origin stable/v0.12.9
git push -u origin feat/official-qr-pay
```

报错是：

```text
fatal: unable to access 'https://yanzi6891/new-api.git/': schannel: failed to receive handshake, SSL/TLS connection failed
```

这次的核心问题不是 GitHub 宕机，也不是支付代码有问题，而是 `origin` 地址写错了。

你配置成了：

```text
https://yanzi6891/new-api.git
```

这个地址少了 `github.com`，它不是正确的 GitHub 仓库 URL。

正确地址应该是：

```text
https://github.com/yanzi6891/new-api.git
```

## 2. 正确的远程仓库结构

你现在应该保持这样的结构：

```text
origin   = 你自己的 fork
upstream = 官方仓库
```

对应到当前项目：

```text
origin   = https://github.com/yanzi6891/new-api.git
upstream = https://github.com/QuantumNous/new-api.git
```

说明：

- `origin` 用来保存你自己的开发成果
- `upstream` 用来同步官方更新

## 3. 修正 `origin` 的命令

如果你继续使用 HTTPS，直接执行：

```powershell
git remote set-url origin https://github.com/yanzi6891/new-api.git
git remote -v
git ls-remote origin
```

解释：

- `git remote set-url` 用于修正错误地址
- `git remote -v` 用于检查当前 remote
- `git ls-remote origin` 用于快速验证这个仓库地址是否能访问

如果 `git ls-remote origin` 正常返回内容，说明地址已经正确并且网络可达。

## 4. 当前应该推送哪些分支

当前建议推送两个分支：

- `stable/v0.12.9`
- `feat/official-qr-pay`

命令如下：

```powershell
git push -u origin stable/v0.12.9
git push -u origin feat/official-qr-pay
```

当前本地支付第一版实现已经提交到：

```text
feat/official-qr-pay
commit: aa6c517c
message: feat: add official alipay and wechat qr topup flow
```

## 5. 如果修正后仍然推不上去，怎么判断问题

### 5.1 提示 `Repository not found`

这通常表示：

- 你还没有在 GitHub 上真正 fork 仓库
- 或者 fork 的仓库名不是 `yanzi6891/new-api`

你应该先确认 GitHub 页面上确实存在：

```text
https://github.com/yanzi6891/new-api
```

### 5.2 提示认证失败

这通常表示：

- 仓库地址是对的
- 但本机 GitHub 认证没有配置好

Windows 下 HTTPS 方式建议启用 Git Credential Manager：

```powershell
git config --global credential.helper manager-core
```

然后重新执行：

```powershell
git push -u origin stable/v0.12.9
```

届时通常会弹出 GitHub 登录或凭证获取流程。

### 5.3 仍然报 TLS/SSL 相关错误

如果你已经确认 URL 正确，仓库存在，但 HTTPS 仍异常，那么优先切到 SSH。

因为 SSH 往往比 HTTPS 更稳定，尤其是在某些网络环境下。

## 6. SSH 方式的完整处理方案

### 6.1 把 `origin` 改成 SSH 地址

```powershell
git remote set-url origin git@github.com:yanzi6891/new-api.git
git remote -v
```

### 6.2 测试 SSH 连通性

```powershell
ssh -T git@github.com
```

如果是首次连接，可能会提示是否信任主机，输入 `yes` 即可。

### 6.3 如果还没有 SSH key

生成 SSH key：

```powershell
ssh-keygen -t ed25519 -C "your_email@example.com"
```

查看公钥内容：

```powershell
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
```

然后把输出内容复制到 GitHub 的 SSH keys 页面。

### 6.4 配置完成后推送

```powershell
git push -u origin stable/v0.12.9
git push -u origin feat/official-qr-pay
```

## 7. 以后怎么保存你的稳定版本

当前推荐的分支职责是：

- `stable/v0.12.9`
  - 你的稳定基线
- `feat/official-qr-pay`
  - 官方二维码支付开发分支

推荐工作方式：

1. 从 `stable/v0.12.9` 拉出功能分支
2. 在 `feat/*` 完成功能开发和验证
3. 再把功能合并回 `stable/v0.12.9`
4. 把 `stable/v0.12.9` 推到你自己的 `origin`

如果后续支付功能继续演进，也建议继续采用：

- `feat/payment-refactor`
- `feat/alipay-refund`
- `feat/wechat-cert-rotation`

这样的功能分支命名方式。

## 8. 后续怎么从官方仓库同步更新

建议永远保留：

- `upstream` 指向官方仓库
- `origin` 指向你自己的 fork

同步时先拉取官方更新：

```powershell
git fetch upstream --tags
```

查看官方有哪些新标签：

```powershell
git tag --list
```

如果你只是想看看某个新版本，例如 `v0.13.0`：

```powershell
git show v0.13.0 --no-patch
```

## 9. 如果官方发布了新稳定版本，正确升级方式是什么

不要直接在老稳定分支上硬切版本。

更稳妥的做法是：

1. 从新的官方 tag 新建一个新的稳定基线
2. 再从这个新的稳定基线拉出迁移分支
3. 把你自己的功能逐步迁移过去

例如未来官方发布 `v0.13.0`，推荐这样做：

```powershell
git fetch upstream --tags
git checkout -b stable/v0.13.0 v0.13.0
git checkout -b feat/migrate-v0.13.0
```

然后你可以把你已经验证过的功能逐步迁入这个新分支。

这样做的优点是：

- 老稳定分支仍然可回退
- 新版本升级风险更可控
- 出问题时更容易定位是上游变化还是你的定制逻辑造成的

## 10. 支付功能在升级时的推荐迁移顺序

你当前最重要的定制是“支付宝官方二维码 + 微信官方二维码”。

以后迁移到新版本时，建议按这个顺序处理：

1. 先让新版本原生后端编译通过
2. 再让新版本前端构建通过
3. 迁移支付配置项
4. 迁移支付下单接口
5. 迁移支付回调处理
6. 迁移前端二维码弹窗和轮询逻辑
7. 用真实商户做扫码联调

不要一上来就把所有支付改动整包复制过去。

分层迁移更容易排错。

## 11. 当前推荐的实际命令顺序

如果你现在准备继续处理推送，建议直接按下面顺序执行：

### 方案 A：继续用 HTTPS

```powershell
git remote set-url origin https://github.com/yanzi6891/new-api.git
git remote -v
git ls-remote origin
git config --global credential.helper manager-core
git push -u origin stable/v0.12.9
git push -u origin feat/official-qr-pay
```

### 方案 B：改用 SSH

```powershell
git remote set-url origin git@github.com:yanzi6891/new-api.git
git remote -v
ssh -T git@github.com
git push -u origin stable/v0.12.9
git push -u origin feat/official-qr-pay
```

## 12. 与已有文档的关系

当前 `docs/` 下已有文档主要覆盖：

- 支付接入方案
- 稳定分支维护思路
- fork 与远程仓库基本处理
- Go 安装后的下一步

本文件补充的是之前还没有单独集中记录的内容：

- 这次 `git push` 报错的具体根因
- HTTPS 与 SSH 的两套可执行推送方案
- 新版本升级时如何基于新 tag 建新的稳定基线
- 支付功能后续迁移的推荐顺序
