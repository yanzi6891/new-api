# 无官方仓库写权限时的开发与提交方案

更新时间：2026-04-14

## 1. 当前实际状态

你现在这个本地仓库不是你自己的仓库，当前远程配置是：

```text
origin = https://github.com/QuantumNous/new-api.git
```

这意味着：

- 你可以本地开发
- 你可以本地创建分支
- 你可以本地 `commit`
- 但你大概率不能直接 `push` 到官方仓库

这是正常情况。

## 2. 先明确一个关键概念

### `commit` 不需要官方仓库权限

你在本地执行：

```powershell
git add .
git commit -m "message"
```

这只是把改动提交到你本地仓库，不需要对方授权。

### `push` 需要目标仓库写权限

如果你执行：

```powershell
git push origin feat/official-qr-pay
```

而 `origin` 指向官方仓库，那就需要你对官方仓库有写权限。

你现在没有这个权限，所以不能直接往官方仓库推。

## 3. 正确的处理方式

最推荐的方式是：

1. 在 GitHub 上 fork 官方仓库到你自己的账号
2. 把你自己的 fork 设为 `origin`
3. 把官方仓库改成 `upstream`
4. 以后所有代码都推到你自己的 fork
5. 需要时再从你的 fork 提 PR 到官方仓库

## 4. 你当前项目分支建议

你现在已经按 `v0.12.9` 做了稳定基线，当前推荐结构是：

- `stable/v0.12.9`
  - 作为你自己的稳定基线
- `feat/official-qr-pay`
  - 当前支付功能开发分支

建议以后继续遵守：

- `stable/*` 只放经过验证的稳定版本
- `feat/*` 只做具体功能开发

## 5. 推荐远程仓库结构

调整后应变成：

```text
origin   = 你自己的 fork
upstream = 官方仓库
```

例如：

```text
origin   = https://github.com/你的用户名/new-api.git
upstream = https://github.com/QuantumNous/new-api.git
```

## 6. 操作步骤

### 第一步：先在 GitHub 上 fork

去 GitHub 页面把官方仓库 fork 到你自己的账号。

官方仓库：

```text
https://github.com/QuantumNous/new-api
```

fork 之后，你会得到你自己的地址，例如：

```text
https://github.com/你的用户名/new-api
```

### 第二步：修改本地 remote

在本地仓库执行：

```powershell
git remote rename origin upstream
git remote add origin https://github.com/你的用户名/new-api.git
git remote -v
```

执行完后，你应该看到类似结果：

```text
origin   https://github.com/你的用户名/new-api.git (fetch)
origin   https://github.com/你的用户名/new-api.git (push)
upstream https://github.com/QuantumNous/new-api.git (fetch)
upstream https://github.com/QuantumNous/new-api.git (push)
```

## 7. 当前这批改动该怎么提交

你现在的支付开发改动在：

```text
feat/official-qr-pay
```

建议这样提交：

```powershell
git switch feat/official-qr-pay
git add .
git commit -m "feat(payment): add official alipay and wechat qr payment v1"
```

然后推到你自己的 fork：

```powershell
git push -u origin feat/official-qr-pay
```

如果你也想把稳定基线推上去：

```powershell
git push -u origin stable/v0.12.9
```

## 8. 以后怎么继续开发

以后增加新功能时：

```powershell
git switch stable/v0.12.9
git switch -c feat/some-new-feature
```

功能做完后：

```powershell
git switch stable/v0.12.9
git merge --no-ff feat/some-new-feature
```

然后再推到你自己的 fork：

```powershell
git push origin stable/v0.12.9
```

## 9. 以后怎么跟进官方更新

因为你现在是以 `v0.12.9` 为稳定基线，所以后续推荐按“版本升级”来做，而不是直接把 `main` 强行并进来。

例如后面要升级到新 tag：

```powershell
git fetch upstream --tags
git tag --list
```

如果要升级到新版本，比如 `v0.13.x`：

```powershell
git switch --detach v0.13.x
git switch -c stable/v0.13.x
git switch -c feat/payment-migration-v013
```

然后把旧版支付改动迁移过去，再单独做兼容测试。

这种方式对你这种“长期维护自己的定制版本”更稳。

## 10. 如果你暂时不想 fork

也可以只在本地提交，不推远程：

```powershell
git add .
git commit -m "feat(payment): add official alipay and wechat qr payment v1"
```

或者导出 patch：

```powershell
git format-patch -1 HEAD
```

或者导出 bundle：

```powershell
git bundle create official-qr-pay.bundle HEAD
```

但这只适合临时保存，不适合长期维护。

## 11. 对你当前情况的最优方案

结合你现在的目标，最推荐的方案就是：

1. fork 官方仓库到你自己的 GitHub
2. 本地把官方仓库改成 `upstream`
3. 本地把你自己的 fork 设为 `origin`
4. 在 `feat/official-qr-pay` 上提交当前支付改动
5. 推到你自己的 fork
6. 后续继续基于 `stable/v0.12.9` 做维护

## 12. 你现在最应该执行的命令

假设你已经 fork 好了仓库，并且你的 GitHub 用户名是 `YOUR_NAME`，那你现在最应该执行的是：

```powershell
git remote rename origin upstream
git remote add origin https://github.com/YOUR_NAME/new-api.git
git remote -v

git switch feat/official-qr-pay
git add .
git commit -m "feat(payment): add official alipay and wechat qr payment v1"
git push -u origin feat/official-qr-pay
git push -u origin stable/v0.12.9
```

## 13. 一句话总结

你没有官方仓库权限时，不影响你本地开发和本地提交；正确做法是 fork 到你自己的仓库，然后把代码推到你自己的 fork，而不是直接推官方仓库。

