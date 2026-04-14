# new-api 上游同步维护建议

更新时间：2026-04-13

## 1. 结论

不要直接在跟踪官方仓库的主分支上长期开发。

更稳妥的方式是：

- 保留一个尽量干净的上游同步分支
- 再单独开自己的稳定分支
- 所有业务改动都从稳定分支或功能分支发出

这样后期跟进开源项目更新会轻松很多。

## 2. 推荐分支模型

建议至少保留这几类分支：

### `upstream-main`

用途：

- 同步官方开源项目最新代码
- 尽量不放你的业务改动

特点：

- 只做上游同步
- 作为对比基线

### `stable`

用途：

- 你的长期可部署稳定版本
- 对接支付、业务配置、运维适配都落在这里

特点：

- 可以部署到生产
- 只合并经过验证的变更

### `feat/*`

用途：

- 开发单个功能
- 比如 `feat/official-qr-pay`

特点：

- 功能做完再合并回 `stable`
- 避免把半成品直接堆在稳定分支

## 3. 推荐远程仓库模型

建议配置两个 remote：

- `upstream`
  - 官方开源仓库
- `origin`
  - 你自己的仓库

典型结构：

```bash
git remote add upstream <官方仓库地址>
git remote add origin <你自己的仓库地址>
```

说明：

- `upstream` 只负责拉官方更新
- `origin` 负责保存你自己的代码和分支

## 4. 推荐工作流

### 4.1 初始化

```bash
git checkout -b upstream-main
git branch --set-upstream-to=upstream/main upstream-main

git checkout -b stable
git push -u origin stable
```

### 4.2 开发新功能

```bash
git checkout stable
git checkout -b feat/official-qr-pay
```

功能完成后：

```bash
git checkout stable
git merge --no-ff feat/official-qr-pay
git push origin stable
```

### 4.3 同步官方更新

先更新基线分支：

```bash
git checkout upstream-main
git fetch upstream
git reset --hard upstream/main
```

然后把官方更新并入你的稳定分支：

```bash
git checkout stable
git merge upstream-main
```

如果你不喜欢 merge，也可以改用 rebase，但前提是你能稳定处理冲突。

对大多数长期维护项目，我更建议：

- 官方基线分支用 `reset --hard upstream/main`
- 业务稳定分支用 `merge upstream-main`

原因是：

- 历史更清楚
- 冲突点更容易看
- 不容易把自己分支历史改乱

## 5. 为什么不建议直接在官方主分支开发

如果你直接在跟踪官方的主分支上开发，会遇到这些问题：

- 以后每次同步上游都容易冲突
- 很难分辨哪些是你改的，哪些是官方改的
- 回滚单个功能会很痛苦
- 多环境部署版本不好管理

尤其你现在已经开始接支付，这类改动是“持续维护型改动”，更应该和上游基线分开。

## 6. 你当前最适合的做法

结合你现在的情况，我建议：

1. 新建 `stable` 分支作为你的长期维护主线
2. 当前支付开发继续在功能分支上推进
3. 功能验证后合并回 `stable`
4. 以后同步官方更新时，先同步到 `upstream-main`
5. 再从 `upstream-main` 合并到 `stable`

也就是说：

- 需要新建稳定分支
- 不建议直接把所有改动长期堆在官方跟踪分支上

## 7. 发布建议

每次稳定可上线版本，建议打 tag：

```bash
git checkout stable
git tag v1.0.0-custom.1
git push origin v1.0.0-custom.1
```

好处：

- 可以快速回滚
- 便于区分你自己的发布版本
- 方便记录“这一版对应哪个上游版本”

## 8. 冲突处理建议

以后你这类支付改动，最容易和上游冲突的地方通常是：

- `router/api-router.go`
- `controller/topup*.go`
- `model/option.go`
- `controller/option.go`
- `web/src/components/topup/*`
- `web/src/components/settings/*`

建议你自己新增的改动尽量集中：

- 官方支付后端逻辑单独放新文件
- 前端弹窗和管理页单独放新组件
- 只在路由、配置入口做最小接线

这会明显降低未来合并冲突。

## 9. 实操建议

你当前可以直接按这个方向继续：

- 长期分支：`stable`
- 当前功能分支：`feat/official-qr-pay`

后续流程：

```bash
git checkout stable
git pull origin stable
git checkout -b feat/official-qr-pay
```

开发完成后：

```bash
git checkout stable
git merge --no-ff feat/official-qr-pay
git push origin stable
```

同步上游时：

```bash
git checkout upstream-main
git fetch upstream
git reset --hard upstream/main

git checkout stable
git merge upstream-main
```

## 10. 最终建议

一句话总结：

你应该新建一个长期稳定分支来承载你自己的支付和业务改动，不要长期直接在跟踪官方更新的分支上开发。
