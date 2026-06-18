#### 方式 1：裸库迁移

在本地可通过以下命令迁移 全部分支和 TAG 到本仓库，点击创建 [访问令牌](https://cnb.cool/profile/token/create?tpl=git&expired=forever)

```
mkdir empty && cd empty
git clone --bare https://your-git.com/group/name.git .
git lfs fetch origin --all
git push --mirror https://cnb.cool/yangqing/web-game-demo
```

#### 方式 2：分支迁移

在本地可通过以下命令迁移 当前分支 到本仓库，点击创建 [访问令牌](https://cnb.cool/profile/token/create?tpl=git&expired=forever)

```
git remote -v
git remote add cnb https://cnb.cool/yangqing/web-game-demo
git remote -v
git push -u cnb HEAD:main
```

#### 方式 3：空仓初始化

在本地可通过以下命令创建 全新仓库, 点击创建 [访问令牌](https://cnb.cool/profile/token/create?tpl=git&expired=forever)

```
git init .
git remote add origin https://cnb.cool/yangqing/web-game-demo
git config --local user.name yangqing
git config --local user.email "yangqing@gitc.cc"
git config credential.helper store
```