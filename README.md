# 校园技能交换平台 🎓

学生可以在上面发布「我能教什么」和「我想学什么」，系统自动匹配合适的交换伙伴，并支持私信沟通。

- 前端：Vue 3 + Element Plus + Vue Router + Axios + Vite（端口 **5173**）
- 后端：Node.js + Express（端口 **3000**）
- 数据库：JSON 文件（`backend/data.json`，首次运行自动创建并写入测试数据）

---

## 一、目录结构

```
skill-swap/
├── backend/                  # 后端
│   ├── package.json          # 后端依赖配置
│   ├── server.js             # 后端主文件（全部 API 接口）
│   ├── database.js           # JSON 文件数据库操作
│   └── data.json             # 数据文件（首次运行自动生成）
└── frontend/                 # 前端
    ├── package.json
    ├── vite.config.js        # 含 /api 代理配置（转发到后端 3000）
    ├── index.html
    └── src/
        ├── main.js           # 应用入口（注册 Element Plus、图标、路由）
        ├── App.vue           # 根组件（顶部渐变导航栏）
        ├── request.js        # Axios 封装（统一解包与报错提示）
        ├── auth.js           # 登录状态管理（localStorage）
        ├── style.css         # 全局样式
        ├── router/index.js   # 路由 + 登录守卫
        └── views/            # 8 个页面组件
            ├── Home.vue          # 首页（横幅/统计/搜索/分类/列表/分页）
            ├── Login.vue         # 登录页（测试账号一键填充）
            ├── Register.vue      # 注册页（表单验证）
            ├── Publish.vue       # 发布技能页（含 AI 生成描述）
            ├── SkillDetail.vue   # 技能详情页
            ├── Profile.vue       # 个人中心页（编辑资料/删除技能）
            ├── Match.vue         # 智能匹配页（匹配度徽章）
            └── Messages.vue      # 消息中心页（左右两栏聊天）
```

## 二、运行步骤

### 第 1 步：安装 Node.js（如果没有）

官网下载 LTS 版本：https://nodejs.org （安装时一路下一步即可）
安装完成后在终端执行 `node -v` 能看到版本号即成功。

### 第 2 步：启动后端（终端 1）

```bash
cd skill-swap/backend
npm install        # 只需执行一次，安装依赖
npm start          # 启动后端，看到 "后端服务已启动" 即成功
```

### 第 3 步：启动前端（终端 2，新开一个终端窗口）

```bash
cd skill-swap/frontend
npm install        # 只需执行一次，安装依赖
npm run dev        # 启动前端，会自动打开浏览器
```

### 第 4 步：开始体验

浏览器会自动打开 `http://localhost:5173`。
登录页点击任一测试账号即可一键登录（密码统一 `123456`）：

| 账号 | 昵称 | 特长 |
| --- | --- | --- |
| xiaoming | 小明 | Python、Web 前端；想学吉他 |
| xiaohong | 小红 | PS、UI 设计；想学编程 |
| xiaogang | 小刚 | 吉他；想学英语 |
| xiaoli | 小李 | 英语口语、四级辅导；想学摄影 |
| xiaowang | 小王 | 人像摄影、LR 后期；想学 PS |

> 💡 推荐体验路径：登录「小明」→ 智能匹配（找老师）→ 联系 TA → 到消息中心和小王/小刚聊天。

## 三、常见问题（FAQ）

### 1. 端口被占用（3000 / 5173 已被占用）
你机器上可能已经有别的服务占用端口。解决办法二选一：

- **停掉旧的**：找到占用进程并结束它，再重新启动本项目：
  ```bash
  lsof -iTCP:3000 -sTCP:LISTEN -P -n   # 查看谁占用了 3000，记下 PID
  kill <PID>                           # 结束该进程后重新 npm start
  ```
- **换端口**：后端支持环境变量换端口：
  ```bash
  PORT=3100 npm start                  # 后端改跑 3100
  ```
  同时把 `frontend/vite.config.js` 里 proxy 的 `target` 改成 `http://localhost:3100`，
  前端换端口：`npm run dev -- --port 5174`。

### 2. 数据被我删了 / 想重置数据
直接删除 `backend/data.json`，下次启动后会自动重新生成测试数据。

### 3. AI 生成描述为什么是"模拟回复"？
本项目默认使用 AI **模拟回复**（无需任何配置即可体验完整流程）。
想接入真实大模型：在系统环境变量里配置 `OPENAI_API_KEY` 后重启后端即可
（`server.js` 中 `/api/ai/generate-description` 接口已写好真实调用代码，默认走模拟分支）。

### 4. 修改头像 / 简介
登录后进入「个人中心 → 编辑资料」即可修改昵称和简介；
头像目前使用 dicebear 在线生成（按用户名），修改用户名会同步换头像。
---

## 四、部署到网上（GitHub + Render）

想让同学也能通过网址访问你的网站？我们已经把项目调整为"一个服务就能跑"的部署形态（后端会顺带托管打包后的前端页面）。

**零基础详细图文教程见 → [DEPLOY.md](DEPLOY.md)**

部署后验证要点（也可用于本地模拟线上环境）：
```bash
cd skill-swap/backend
npm run build      # 前端会打包出 dist 文件夹
npm start          # 后端启动，自动托管 dist 里的前端页面
# 浏览器打开 http://localhost:3000 看到的即是"线上同款"效果
```