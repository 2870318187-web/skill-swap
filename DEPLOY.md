# 🚀 零基础部署教程：把项目发布到网上（GitHub + Render）

本教程完全面向零基础，跟着做就能把你的校园技能交换平台发布成一个**公开网址**，手机、电脑、任何人打开都能访问。

> 花 30 分钟，全程免费。看不懂的术语全部写在括号里解释了。

---

## 📖 部署后是什么样子

- 你会得到一个网址，例如：`https://skill-swap.onrender.com`
- 别人把网址粘贴到浏览器就能打开你的网站
- **以后改代码 → 上传到 GitHub → 网站自动更新**（不用再手动操作）

---

## 🛠️ 准备工作（先注册两个账号）

| 平台 | 网址 | 用途 | 需要什么 |
| --- | --- | --- | --- |
| GitHub | https://github.com | 存放代码的"云端网盘"（免费） | 邮箱注册 |
| Render | https://render.com | 真正运行你的网站的"云电脑"（免费） | 可以用 GitHub 账号直接登录 |

> 💡 两个都是英文网站，看不懂的地方用浏览器右键（或谷歌浏览器地址栏旁边）**翻译成中文**即可。

---

## 第 1 步：注册 GitHub 并创建一个仓库

1. 打开 https://github.com ，点 **Sign up**（注册），按提示填邮箱、设密码（注意：GitHub 的验证码邮件可能被丢进垃圾箱，找一找）
2. 注册完成后登录，点右上角 **+ → New repository**（新建仓库）
3. 填写：
   - **Repository name**（仓库名）：填 `skill-swap`
   - 下面选 **Public**（公开，Render 需要读取它；学习项目公开没关系）
   - **其他全部不要勾选**（不要勾 README、.gitignore、License）
4. 点绿色的 **Create repository** 按钮，完成！**先不要关这个页面**，等一下要用。

---

## 第 2 步：把本地代码上传到 GitHub

### 2.1 检查 git（macOS 自带 git，不用安装）

打开"终端"（访达 → 应用程序 → 实用工具 → 终端），输入：

```bash
git --version
```

能显示 `git version 2.x.x` 就说明 OK，继续往下。

### 2.2 初始化并上传

在终端里**一条一条**执行以下命令（每条命令 = 一行，输完按回车）：

```bash
cd /Users/a1/Downloads/huaweicode/skill-swap
```

```bash
git init
```

> 📌 `git init`：把当前文件夹变成一个"仓库"（开始被 git 管理）

```bash
git add .
```

> 📌 `git add .`：把当前所有文件"放进购物车"（准备提交）。注意 `backend/data.json` 和 `node_modules` 已被 .gitignore 自动排除，不会上传。

```bash
git commit -m "校园技能交换平台 第一版"
```

> 📌 `git commit`：正式"打包保存"一个版本，-m 后面是给这版的备注。

```bash
git branch -M main
```

> 📌 把默认分支命名为 main（和 GitHub 保持一致，避免后面报错）。

**接下来连到你在第 1 步创建的 GitHub 仓库。** 回到 GitHub 那个"创建完成"的页面，找到叫你上传代码的区块，会看到两行类似这样的地址：

- HTTPS 方式：`https://github.com/你的用户名/skill-swap.git`

把下面命令中的**地址**替换成你自己的，然后执行：

```bash
git remote add origin https://github.com/你的用户名/skill-swap.git
```

> 📌 `git remote add`：告诉本地仓库"我的云端网盘在哪个地址"。

```bash
git push -u origin main
```

> 📌 真正把代码"上传"到 GitHub。**第一次会弹出窗口让你登录 GitHub 授权**，跟着点就行。

完成后刷新 GitHub 仓库页面，能看到你的代码文件就成功了！🎉

---

## 第 3 步：在 Render 部署

1. 打开 https://render.com → 点 **Get Started** → 建议用 **GitHub 账号直接登录**（Sign up with GitHub），一路允许授权
2. 登录后点 **New +** 按钮 → 选择 **Web Service**
3. 页面会列出你的 GitHub 仓库，找到 **skill-swap** 仓库，点后面的 **Connect**（连接）
4. 进入配置页面，**关键配置如下**（其他保持默认）：

   | 配置项 | 填什么 | 说明 |
   | --- | --- | --- |
   | **Name** | 随便填，如 `skill-swap` | 显示名字 |
   | **Region** | Singapore 或 near （亚洲，离我们近） | 服务器区域 |
   | **Branch** | `main` | 部署哪个分支 |
   | **Root Directory** | **`backend`** | ⚠️ 关键！告诉 Render 后端代码在 backend 文件夹 |
   | **Build Command** | **`npm run build`** | 构建命令：会自动装前端依赖并打包页面 |
   | **Start Command** | **`npm start`** | 启动命令：启动后端（会顺带托管前端页面） |
   | **Instance Type** | **Free**（免费） | ⚠️ 记得选 Free，才有免费额度 |

5. 拉到最底点 **Create Web Service**（创建服务）
6. 接下来是**构建过程**（蓝绿色进度条），大约需要 2~5 分钟。第一次部署时页面上会有日志在滚动，看到最后出现 **"Your service is live"** 就成功了
7. 页面顶部会显示你的网址，类似：`https://skill-swap.onrender.com` —— 点开它！🎉

> ⚠️ **如果构建时报错**（红色日志），不要慌，往下看「常见问题」。或者直接把红色报错截图发给你的 AI 助手。

---

## 第 4 步：验证网站

打开你的网址后，检查：

1. ✅ 首页能看到渐变横幅、统计卡片、技能列表
2. ✅ 点「登录」，用测试账号 `xiaoming / 123456` 能登录
3. ✅ 转发给你的同学，用手机打开也能访问

---

## 🔁 以后怎么更新你的网站

以后你想改网站，流程就三句话：

```bash
cd /Users/a1/Downloads/huaweicode/skill-swap
```

```bash
git add .
```

```bash
git commit -m "这次改了什么"
```

```bash
git push
```

**上传完不用管 Render**，它检测到 GitHub 有更新会自动重新部署（几分钟后刷新网址就是新版了）。

---

## ❓ 常见问题（FAQ）

### Q1：构建时报错怎么办？
把 Render 页面上的**红色日志**完整复制出来发给 AI 助手让它帮你分析。常见的有：
- `Root Directory does not exist` → 第 3 步 Root Directory 没填 `backend`
- `npm ERR!` 依赖装不上 → 网络问题，在 Render 里点 **Manual Deploy → Deploy latest commit** 重试

### Q2：为什么部署后数据经常被重置？
免费计划的服务器磁盘是**临时的**，实例重启/休眠后 `data.json` 会被清空，网站自动恢复成测试数据。**这是免费方案已知的取舍**，当演示/学习用完全没问题。以后想保存用户数据，可以给你的 AI 助手说"把数据换成 MongoDB/数据库"，或升级云服务器。

### Q3：Render 免费额度会不会被扣钱？
不会。免费层有 750 小时/月（一小时不差可用 31 天），不会自动扣费。缺点是**连续 15 分钟没人访问会休眠**，下次访问要等十几秒唤醒，很正常。

### Q4：国内打开很慢 / 打不开？
Render 是国外服务器，国内访问偶尔慢或不通属正常现象。临时方案：让同学**多刷新几次 / 挂个加速器**。
如果以后经常使用，建议做准备：把你的 AI 助手帮你把项目部署到**国内云服务器**（华为云/腾讯云）上，速度会快很多。

### Q5：本地开发还会受影响吗？
完全不受影响。本地还是「前端 5173 + 后端 3000」的开发模式；部署多出来的只是"后端顺便托管已打包的前端页面"这一招，两边互不干扰。

---

## 📚 动手练习建议

部署成功后，试着做一次"改代码 → 更新网站"的完整闭环：
1. 把 `frontend/src/App.vue` 里的 Logo 文字 `校园技能交换` 改成 `我的技能交换平台`
2. 按「第 4 步」的三条命令上传
3. 等几分钟，刷新你的 Render 网址，看到新文字 = 你学会了整个开发流程！🏆