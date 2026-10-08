/**
 * server.js —— 后端服务主文件（所有 API 接口都在这里）
 *
 * 技术栈：Node.js + Express
 * 启动方式：node server.js（或 npm start），默认监听 3000 端口
 *
 * 统一响应格式约定：
 *   成功：{ code: 0, data: 数据, message: 'ok' }
 *   失败：{ code: 1, message: '错误原因' }
 */

const express = require('express'); // Express 框架
const cors = require('cors');       // 跨域中间件（前后端分离时必须）
const path = require('path');       // Node.js 路径模块（拼接前端静态文件路径用）
const fs = require('fs');           // Node.js 文件系统模块（判断前端 dist 是否已构建）
const db = require('./database');   // 我们自己封装的 JSON 数据库模块

const app = express();              // 创建 Express 应用实例
// 端口优先读环境变量 PORT（和 5173 端口冲突排查时很方便），默认 3000
const PORT = process.env.PORT || 3000; // 后端服务端口

/* ========== 全局中间件 ========== */

app.use(cors());                      // 允许前端跨域请求（前端 5173 端口访问后端 3000 端口）
app.use(express.json());              // 解析请求体中的 JSON 数据，req.body 才能用

/* ========== 工具函数 ========== */

/**
 * 把一条技能记录"装饰"成完整对象：补上发布者的头像、昵称等信息
 * 这样前端拿到一条技能就能直接展示，不用再额外查用户
 * @param {object} skill 技能原始记录
 * @returns {object} 带 publisher 信息的完整技能对象
 */
function decorateSkill(skill) {
  const publisher = db.findUserById(skill.user_id) || {}; // 查找发布者（找不到给空对象兜底）
  return {
    ...skill,                                     // 展开原技能的所有字段
    nickname: publisher.nickname || '未知用户',   // 发布者昵称
    avatar: publisher.avatar || '',               // 发布者头像
    bio: publisher.bio || ''                      // 发布者简介
  };
}

/**
 * 计算两条技能之间的匹配度分数（分数范围 0 ~ 100）
 * 匹配算法思路：
 *   1. 分类完全一致：加 50 分（最大的权重）
 *   2. 标题里有相同的关键词：每个词加 15 分
 *   3. 描述里有相同的关键词：每个词加 10 分
 *   4. 分数封顶 100 分
 * @param {object} skillA 技能 A
 * @param {object} skillB 技能 B
 * @returns {number} 匹配度分数
 */
function calcMatchScore(skillA, skillB) {
  let score = 0;

  // 1. 分类一致加分最多
  if (skillA.category === skillB.category) {
    score += 50;
  }

  // 2. 标题关键词重合：把标题拆成单个汉字/英文单词的集合
  const wordsA = new Set(skillA.title.split(''));
  const wordsB = new Set(skillB.title.split(''));
  wordsA.forEach((w) => {
    // 过滤掉空格和无意义单字，只比较长度大于 1 的词（英文按空格切，中文按字符切）
    if (w.trim() && w.length > 1 && wordsB.has(w)) {
      score += 15;
    }
  });

  // 3. 描述关键词重合（同样逻辑）
  const descA = new Set(skillA.description.split(''));
  const descB = new Set(skillB.description.split(''));
  descA.forEach((w) => {
    if (w.trim() && w.length > 1 && descB.has(w)) {
      score += 10;
    }
  });

  // 4. 分数上限 100
  return Math.min(100, Math.round(score + (score >= 50 ? 10 : 5)));
}

/**
 * 统一的"AI 模拟回复"生成器
 * 如果没有配置真实的 API Key，就根据关键词拼一段通顺的模板文案
 * @param {object} opts 包含 title / keyword / type / category 等字段
 * @returns {string} 生成的技能描述文案
 */
function mockGenerateDescription(opts) {
  const { title, keyword, type, category } = opts;
  const role = type === 'provide' ? '我喜欢并擅长' : '我正在学习';
  return `你好！我是${category || '相关领域'}的爱好者。${title ? `关于「${title}」，` : ''}` +
    `${role}${keyword || '这项技能'}。${type === 'provide'
      ? '我可以提供系统的基础讲解和实战经验分享，从零开始带你上手，遇到问题可以随时找我交流探讨，保证让你少走弯路。'
      : '我想找到一位有经验的同学带带我，希望从基础开始一步步学习，我会非常认真地练习，也愿意和老师互换技能互相成长。'}` +
    `如果你也对这些内容感兴趣，欢迎联系我一起交流学习！`;
}

/* ====== 一、用户相关接口 ====== */

/**
 * POST /api/register —— 用户注册
 * 请求体：{ username, password, nickname }
 */
app.post('/api/register', (req, res) => {
  const { username, password, nickname } = req.body || {};

  // ---- 参数简单校验 ----
  if (!username || !password) {
    return res.json({ code: 1, message: '用户名和密码不能为空' });
  }
  if (String(username).length < 3 || String(username).length > 20) {
    return res.json({ code: 1, message: '用户名长度需在 3 ~ 20 位之间' });
  }
  if (String(password).length < 6) {
    return res.json({ code: 1, message: '密码长度至少 6 位' });
  }
  // ---- 检查用户名是否被占用 ----
  if (db.findUserByUsername(username)) {
    return res.json({ code: 1, message: '该用户名已被注册，换一个试试吧' });
  }

  // ---- 创建用户对象并写入数据库 ----
  const user = {
    id: db.genId('u'),                          // 生成唯一用户 id
    username,
    password,                                   // 演示项目没做加密，生产环境务必用 bcrypt 等加密
    nickname: nickname || username,             // 昵称没填就用用户名
    avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`, // dicebear 生成随机头像
    bio: '这个人很懒，还没有填写简介～',          // 默认简介
    created_at: new Date().toISOString()
  };
  const safeUser = db.addUser(user);
  res.json({ code: 0, data: safeUser, message: '注册成功' });
});

/**
 * POST /api/login —— 用户登录
 * 请求体：{ username, password }
 */
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  // 校验参数不能为空
  if (!username || !password) {
    return res.json({ code: 1, message: '用户名和密码不能为空' });
  }
  // 查找用户
  const user = db.findUserByUsername(username);
  if (!user) {
    return res.json({ code: 1, message: '用户不存在，请先注册' });
  }
  if (user.password !== password) {
    return res.json({ code: 1, message: '密码错误，请重新输入' });
  }
  // 登录成功：返回去掉密码的用户信息
  const { password: _pwd, ...safeUser } = user;
  res.json({ code: 0, data: safeUser, message: '登录成功' });
});

/**
 * GET /api/user/:id —— 获取用户基本信息
 */
app.get('/api/user/:id', (req, res) => {
  const user = db.findUserById(req.params.id);
  if (!user) {
    return res.json({ code: 1, message: '用户不存在' });
  }
  res.json({ code: 0, data: user, message: 'ok' });
});

/**
 * PUT /api/user/:id —— 更新用户资料（昵称、简介、密码）
 * 请求体：{ nickname, bio, password? }
 */
app.put('/api/user/:id', (req, res) => {
  const id = req.params.id;
  const { nickname, bio, password } = req.body || {};
  // 组装要修改的字段（只允许改这三样，防注入无关字段）
  const changes = {};
  if (nickname !== undefined) changes.nickname = nickname;
  if (bio !== undefined) changes.bio = bio;
  if (password !== undefined && password.length >= 6) changes.password = password;

  const updated = db.updateUser(id, changes);
  if (!updated) {
    return res.json({ code: 1, message: '用户不存在' });
  }
  res.json({ code: 0, data: updated, message: '资料更新成功' });
});

/* ====== 二、技能相关接口 ====== */

/**
 * GET /api/skills —— 技能列表（支持筛选 + 分页）
 * 查询参数：
 *   keyword  关键词（模糊匹配标题和描述）
 *   category 分类（不传或传"全部"表示不过滤）
 *   type     provide 可学技能 / want 想学技能（不传或传"全部"表示不过滤）
 *   page     页码，默认 1
 *   limit    每页条数，默认 8
 */
app.get('/api/skills', (req, res) => {
  const { keyword, category, type } = req.query;
  const page = parseInt(req.query.page) || 1;     // 页码，非法值默认 1
  const limit = parseInt(req.query.limit) || 8;   // 每页条数，非法值默认 8

  // 先取全部技能并转成带发布者信息的完整对象
  let list = db.getRawSkills().map(decorateSkill);

  // 按关键词过滤：匹配标题或描述（大小写不敏感）
  if (keyword) {
    const kw = keyword.trim().toLowerCase();
    list = list.filter(
      (s) => s.title.toLowerCase().includes(kw) || s.description.toLowerCase().includes(kw)
    );
  }
  // 按分类过滤
  if (category && category !== '全部') {
    list = list.filter((s) => s.category === category);
  }
  // 按类型过滤
  if (type && type !== '全部') {
    list = list.filter((s) => s.type === type);
  }

  // 按发布时间倒序排列（最新发布的排前面）
  list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // 手动分页
  const total = list.length;
  const start = (page - 1) * limit;
  const items = list.slice(start, start + limit);

  res.json({ code: 0, data: { list: items, total, page, limit }, message: 'ok' });
});

/**
 * GET /api/skills/:id —— 技能详情（附带发布者信息和其他技能数量）
 */
app.get('/api/skills/:id', (req, res) => {
  const skill = db.getSkillById(req.params.id);
  if (!skill) {
    return res.json({ code: 1, message: '技能不存在或已被删除' });
  }
  // 完整技能对象
  const fullSkill = decorateSkill(skill);
  // 顺便查出发布者的技能数量，方便展示
  const publisherSkillCount = db.getSkillsByUserId(skill.user_id).length;
  res.json({ code: 0, data: { ...fullSkill, publisherSkillCount }, message: 'ok' });
});

/**
 * POST /api/skills —— 发布新技能
 * 请求体：{ user_id, title, description, category, level, type }
 */
app.post('/api/skills', (req, res) => {
  const { user_id, title, description, category, level, type } = req.body || {};

  // ---- 必填字段校验 ----
  if (!user_id) return res.json({ code: 1, message: '请先登录后再发布' });
  if (!title) return res.json({ code: 1, message: '技能标题不能为空' });
  if (!description) return res.json({ code: 1, message: '技能描述不能为空' });
  if (!category) return res.json({ code: 1, message: '请选择技能分类' });
  if (!type) return res.json({ code: 1, message: '请选择技能类型' });

  // 校验类型只能是 provide 或 want
  if (!['provide', 'want'].includes(type)) {
    return res.json({ code: 1, message: '技能类型不合法' });
  }

  // 校验用户存在
  const user = db.findUserById(user_id);
  if (!user) {
    return res.json({ code: 1, message: '用户不存在' });
  }

  // ---- 组装技能对象并入库 ----
  const skill = {
    id: db.genId('s'),
    user_id,
    title,
    description,
    category,
    level: level || '入门',                 // 难度默认"入门"
    type,
    created_at: new Date().toISOString()
  };
  db.addSkill(skill);
  res.json({ code: 0, data: decorateSkill(skill), message: '发布成功！' });
});

/**
 * DELETE /api/skills/:id —— 删除技能（需校验是本人发布才能删）
 * 查询参数：user_id 当前登录用户 id
 */
app.delete('/api/skills/:id', (req, res) => {
  const { user_id } = req.query;
  const skill = db.getSkillById(req.params.id);
  // 先确认技能存在
  if (!skill) {
    return res.json({ code: 1, message: '技能不存在' });
  }
  // 校验删除权限：只有发布者本人能删
  if (!user_id || skill.user_id !== user_id) {
    return res.json({ code: 1, message: '只能删除自己发布的技能' });
  }
  db.deleteSkill(req.params.id);
  res.json({ code: 0, data: null, message: '删除成功' });
});

/**
 * GET /api/user/:id/skills —— 获取某个用户的技能（分"提供的"和"想学的"两组返回）
 */
app.get('/api/user/:id/skills', (req, res) => {
  const skills = db.getSkillsByUserId(req.params.id);
  res.json({
    code: 0,
    data: {
      provide: skills.filter((s) => s.type === 'provide').map(decorateSkill), // 我能教的
      want: skills.filter((s) => s.type === 'want').map(decorateSkill)        // 我想学的
    },
    message: 'ok'
  });
});

/* ====== 三、通用接口 ====== */

/**
 * GET /api/categories —— 获取平台分类列表
 */
app.get('/api/categories', (req, res) => {
  res.json({ code: 0, data: db.CATEGORIES, message: 'ok' });
});

/**
 * GET /api/stats —— 获取平台统计数据（首页统计卡片用）
 */
app.get('/api/stats', (req, res) => {
  const dbData = db.getDB();
  res.json({
    code: 0,
    data: {
      userCount: dbData.users.length,                       // 注册用户数
      skillCount: dbData.skills.length,                     // 技能总数
      provideCount: dbData.skills.filter((s) => s.type === 'provide').length, // 可学技能数
      wantCount: dbData.skills.filter((s) => s.type === 'want').length        // 想学技能数
    },
    message: 'ok'
  });
});

/* ====== 四、AI 相关接口 ====== */

/**
 * POST /api/ai/generate-description —— AI 生成技能描述
 * 请求体：{ keyword, title, type, category }
 *
 * 说明：本项目默认走"模拟回复"（不需要任何配置即可体验）。
 * 如果你想接入真实的大模型（比如 OpenAI），只需要：
 *   1. 在系统环境变量里配置 OPENAI_API_KEY
 *   2. 取消下面 fetch 调用代码的注释，填好你的模型地址和参数
 */
app.post('/api/ai/generate-description', async (req, res) => {
  const { keyword, title, type, category } = req.body || {};

  // 优先使用环境变量中的真实 API Key
  const API_KEY = process.env.OPENAI_API_KEY || '';
  const usingMock = !API_KEY; // 没配置 Key 时标记为"模拟模式"

  // ---- 情况一：没有配置 API Key，使用模拟回复 ----
  if (usingMock) {
    const description = mockGenerateDescription({ keyword, title, type, category });
    return res.json({
      code: 0,
      data: { description, usingMock: true },
      message: '当前为模拟回复，配置 OPENAI_API_KEY 后可使用真实大模型'
    });
  }

  // ---- 情况二：配置了 API Key，调用真实大模型（以 OpenAI 兼容接口为例）----
  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '你是一个校园技能交换平台的小助手，请根据用户的关键信息，帮他写一段 80~150 字的中文技能描述，语气真诚友好。'
          },
          {
            role: 'user',
            content: `技能标题：${title || '未填写'}；技能类型：${type === 'provide' ? '我能教别人' : '我想学习'}；分类：${category || '其他'}；关键词：${keyword || ''}`
          }
        ],
        max_tokens: 300
      })
    });
    const json = await resp.json();
    const description = json.choices?.[0]?.message?.content || mockGenerateDescription({ keyword, title, type, category });
    res.json({ code: 0, data: { description, usingMock: false }, message: 'ok' });
  } catch (err) {
    // 真实接口调用失败时，兜底回退到模拟回复，保证功能可用
    res.json({
      code: 0,
      data: { description: mockGenerateDescription({ keyword, title, type, category }), usingMock: true },
      message: 'AI 接口调用失败，已回退到模拟回复'
    });
  }
});

/**
 * POST /api/ai/match —— 智能匹配
 * 请求体：{ userId, matchType }
 *   matchType = 'teacher' 找老师：用"我想学的技能"去匹配"别人能教的技能"
 *   matchType = 'student' 找学生：用"我能教的技能"去匹配"别人想学的技能"
 *
 * 返回：按匹配度分数从高到低排列的候选人列表
 */
app.post('/api/ai/match', (req, res) => {
  const { userId, matchType } = req.body || {};
  if (!userId) return res.json({ code: 1, message: '请先登录' });
  if (!['teacher', 'student'].includes(matchType)) {
    return res.json({ code: 1, message: '匹配类型不合法' });
  }

  // 当前用户的技能
  const mySkills = db.getSkillsByUserId(userId);
  // 别人的技能（排除自己发布的）
  const others = db.getRawSkills().filter((s) => s.user_id !== userId);

  const results = []; // 匹配结果数组

  if (matchType === 'teacher') {
    // 找老师：我的"想学"技能(没有) × 别人的"能教"技能(provide)
    const myWants = mySkills.filter((s) => s.type === 'want');
    const canTeach = others.filter((s) => s.type === 'provide');
    myWants.forEach((wantSkill) => {
      canTeach.forEach((teachSkill) => {
        const score = calcMatchScore(wantSkill, teachSkill);
        if (score >= 40) { // 只保留匹配度 >= 40 的结果，太低的没有推荐意义
          results.push({ score, mySkill: wantSkill, matchedSkill: teachSkill });
        }
      });
    });
  } else {
    // 找学生：我的"能教"技能(provide) × 别人的"想学"技能(want)
    const myProvides = mySkills.filter((s) => s.type === 'provide');
    const wantsToLearn = others.filter((s) => s.type === 'want');
    myProvides.forEach((teachSkill) => {
      wantsToLearn.forEach((wantSkill) => {
        const score = calcMatchScore(teachSkill, wantSkill);
        if (score >= 40) {
          results.push({ score, mySkill: teachSkill, matchedSkill: wantSkill });
        }
      });
    });
  }

  // 按分数降序排列，取前 8 条
  results.sort((a, b) => b.score - a.score);
  const top = results.slice(0, 8);

  // 组装成前端需要的结构：携带对方用户信息
  const data = top.map((r) => {
    const otherUser = db.findUserById(r.matchedSkill.user_id) || {};
    return {
      score: r.score,
      matchedSkill: decorateSkill(r.matchedSkill),
      mySkill: r.mySkill,
      other: { ...otherUser, password: undefined } // 明确去掉密码字段
    };
  });

  res.json({ code: 0, data, message: 'ok' });
});

/* ====== 五、消息相关接口 ====== */

/**
 * GET /api/messages/:userId/:otherUserId —— 获取两个用户之间的聊天记录
 */
app.get('/api/messages/:userId/:otherUserId', (req, res) => {
  const { userId, otherUserId } = req.params;
  // 顺便把对方发给我的未读消息标记成已读
  db.markMessagesRead(userId, otherUserId);
  const messages = db.getMessagesBetween(userId, otherUserId);
  res.json({ code: 0, data: messages, message: 'ok' });
});

/**
 * POST /api/messages —— 发送消息
 * 请求体：{ from_user_id, to_user_id, content }
 */
app.post('/api/messages', (req, res) => {
  const { from_user_id, to_user_id, content } = req.body || {};
  // ---- 校验 ----
  if (!from_user_id || !to_user_id) return res.json({ code: 1, message: '参数不完整' });
  if (!content || !content.trim()) return res.json({ code: 1, message: '消息内容不能为空' });

  // 组装消息对象
  const message = {
    id: db.genId('m'),
    from_user_id,
    to_user_id,
    content: content.trim(),
    is_read: false,
    created_at: new Date().toISOString()
  };
  const saved = db.addMessage(message);
  res.json({ code: 0, data: saved, message: '发送成功' });
});

/**
 * GET /api/conversations/:userId —— 获取当前用户的会话列表
 */
app.get('/api/conversations/:userId', (req, res) => {
  const conversations = db.getConversations(req.params.userId);
  res.json({ code: 0, data: conversations, message: 'ok' });
});

/* ====== 生产环境静态托管（前端页面） ======
 * 部署到 Render 之后，前端会先构建成 dist 静态文件（frontend/dist），
 * 由后端 Express 直接"领着"一起跑，整个应用就只有一个服务：
 *   - 访问 https://你的网址/          → 返回前端页面
 *   - 访问 https://你的网址/api/xxx   → 返回后端接口数据
 * 这样就不用再单独托管前端，也不用处理跨域问题。
 *
 * 注意：本地开发时（没有 dist 文件夹）这段代码自动跳过，
 * 不影响原来 前端 5173 + 后端 3000 的开发模式。
 */
const DIST_DIR = path.join(__dirname, '..', 'frontend', 'dist'); // 前端构建产物目录
if (fs.existsSync(DIST_DIR)) {
  // 1. 把 dist 目录暴露为静态资源（html / js / css / 图片等）
  app.use(express.static(DIST_DIR));

  // 2. SPA 路由回退：非 /api 的请求都返回 index.html，由前端 Vue Router 自己解析页面
  //    （否则直接在地址栏访问 /skill/xxx 这种多级路径会返回 404）
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next(); // 是 API 请求就继续往下走，交给上面定义好的接口处理
    }
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

/* ====== 启动服务器 ====== */

app.listen(PORT, () => {
  console.log('============================================');
  console.log(' 校园技能交换平台 - 后端服务已启动');
  console.log(` 地址: http://localhost:${PORT}`);
  console.log(' 提示: 请先启动后端，再启动前端 (5173 端口)');
  console.log('============================================');
});