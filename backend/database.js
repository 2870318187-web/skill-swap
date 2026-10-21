/**
 * database.js —— JSON 文件数据库操作模块
 *
 * 这个文件负责所有"数据存取"逻辑：
 * 1. 数据统一保存在 backend/data.json 这一个文件里
 * 2. 首次运行时如果 data.json 不存在，会自动创建并写入一批测试数据
 * 3. 提供读取 / 保存数据库的底层函数，以及针对 users / skills / messages 表的查询函数
 * 4. 导出固定的 10 个技能分类 CATEGORIES 供接口使用
 *
 * 说明：JSON 文件数据库足够简单直观，非常适合零基础学习。
 * 每次写操作都会把整个数据写回文件，虽然效率不高，但数据量小，完全够用。
 */

const fs = require('fs');   // Node.js 内置的文件系统模块，用来读写文件
const path = require('path'); // Node.js 内置的路径模块，用来拼接文件路径

/** data.json 文件路径（与 database.js 位于同一个目录） */
const DB_FILE = path.join(__dirname, 'data.json');

/** 平台固定的 10 个技能分类 */
const CATEGORIES = [
  '编程开发', '设计创意', '音乐艺术', '语言学习',
  '摄影摄像', '运动健身', '美食烹饪', '学习辅导', '生活技能', '其他'
];

/**
 * 生成一条唯一记录的 id
 * @param {string} prefix id 前缀，如 'u' 用户、's' 技能、'm' 消息
 * @returns {string} 唯一 id，格式如：u_xxxx_yyyy
 */
function genId(prefix) {
  // 时间戳转成 36 进制字符串 + 随机数，组合起来几乎不可能重复
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

/**
 * 生成测试数据（5 个用户 + 15 条技能 + 2 条示例消息）
 * 头像统一使用 dicebear 在线生成的卡通头像（按用户名作为随机种子）
 * @returns {object} 一个包含 users / skills / messages / reviews 四张表的数据库对象
 */
function createTestData() {
  // 工具函数：返回"几天前"的时间字符串，方便模拟"几天前发布"的效果
  const date = (daysAgo) => new Date(Date.now() - daysAgo * 86400000).toISOString();

  return {
    // ---- 用户表：小明、小红、小刚、小李、小王，密码统一 123456 ----
    users: [
      {
        id: 'u_1001', username: 'xiaoming', password: '123456', nickname: '小明',
        avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=xiaoming',
        bio: '热爱编程的计算机系学生，愿意分享 Python 和 Web 开发经验，也想学点音乐陶冶情操。',
        gender: '男', region: '北京', created_at: date(30)
      },
      {
        id: 'u_1002', username: 'xiaohong', password: '123456', nickname: '小红',
        avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=xiaohong',
        bio: '设计系小姐姐，PS 和 UI 设计都很擅长，最近想转行搞前端，求编程大佬带带我。',
        gender: '女', region: '上海', created_at: date(28)
      },
      {
        id: 'u_1003', username: 'xiaogang', password: '123456', nickname: '小刚',
        avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=xiaogang',
        bio: '音乐系吉他高手，吉他弹唱是我的强项，想找个语伴一起练英语口语。',
        gender: '男', region: '广州', created_at: date(25)
      },
      {
        id: 'u_1004', username: 'xiaoli', password: '123456', nickname: '小李',
        avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=xiaoli',
        bio: '外语学院学霸，雅思口语 7 分，四级辅导小有名气，最近迷上了摄影想入坑。',
        gender: '女', region: '成都', created_at: date(20)
      },
      {
        id: 'u_1005', username: 'xiaowang', password: '123456', nickname: '小王',
        avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=xiaowang',
        bio: '摄影协会会长，人像摄影和 Lightroom 后期都拿得出手，想学 PS 精修图片。',
        gender: '男', region: '杭州', created_at: date(15)
      }
    ],

    // ---- 技能表：type 字段，provide = 我能教别人，want = 我想学习 ----
    skills: [
      // 小明的 3 条
      { id: 's_2001', user_id: 'u_1001', title: 'Python 入门到进阶', description: '从零开始带你玩转 Python，涵盖基础语法、函数、文件操作、爬虫入门等，适合零基础的同学，包教包会。', category: '编程开发', level: '进阶', type: 'provide', created_at: date(20) },
      { id: 's_2002', user_id: 'u_1001', title: 'Web 前端开发基础', description: 'HTML、CSS、JavaScript 三大件系统讲解，还会带大家做一个完整的小项目，学会后自己写网页不成问题。', category: '编程开发', level: '入门', type: 'provide', created_at: date(18) },
      { id: 's_2003', user_id: 'u_1001', title: '想学吉他弹唱', description: '一直很喜欢民谣，想学吉他从和弦开始，能弹唱几首歌就满足了，周末可以一起练琴。', category: '音乐艺术', level: '入门', type: 'want', created_at: date(12) },
      // 小红的 3 条
      { id: 's_2004', user_id: 'u_1002', title: 'Photoshop 修图技巧', description: '精通 PS 人像精修、抠图换背景、调色，分享实用技巧和快捷键，带你看懂各种大神级修图作品。', category: '设计创意', level: '进阶', type: 'provide', created_at: date(16) },
      { id: 's_2005', user_id: 'u_1002', title: 'UI 设计入门', description: '从设计规范讲起，教你用 Figma 画界面，掌握配色、排版、图标设计的基础方法论，做出好看的页面。', category: '设计创意', level: '入门', type: 'provide', created_at: date(10) },
      { id: 's_2006', user_id: 'u_1002', title: '想学 Python 编程', description: '设计做久了想学点编程，希望有同学能带我入门 Python 自动化办公，提高工作效率，互相学习！', category: '编程开发', level: '入门', type: 'want', created_at: date(8) },
      // 小刚的 2 条
      { id: 's_2007', user_id: 'u_1003', title: '吉他弹唱系统教学', description: '从调弦、爬格子到和弦转换、扫弦节奏，系统化教你弹唱，保证三个月能上台演出，学生时代先搞乐队！', category: '音乐艺术', level: '进阶', type: 'provide', created_at: date(22) },
      { id: 's_2008', user_id: 'u_1003', title: '想练英语口语', description: '六级过了但口语还是哑巴英语，想找一个英语好的同学每周固定时间对练口语，互相纠音进步快。', category: '语言学习', level: '入门', type: 'want', created_at: date(6) },
      // 小李的 3 条
      { id: 's_2009', user_id: 'u_1004', title: '英语口语陪练', description: '可以提供一对一英语口语陪练，纠正发音和语调，分享地道表达，想找想要提升口语的同学互相进步。', category: '语言学习', level: '精通', type: 'provide', created_at: date(14) },
      { id: 's_2010', user_id: 'u_1004', title: '大学英语四级辅导', description: '有丰富的四级备考经验，听力、阅读、翻译、写作四部分逐个击破，带你高效通过四级。', category: '语言学习', level: '进阶', type: 'provide', created_at: date(9) },
      { id: 's_2011', user_id: 'u_1004', title: '想学人像摄影', description: '希望找个摄影大佬带我入门人像摄影，学习构图、用光和相机参数设置，周末可以约着一起外拍。', category: '摄影摄像', level: '入门', type: 'want', created_at: date(5) },
      // 小王的 3 条
      { id: 's_2012', user_id: 'u_1005', title: '人像摄影实战', description: '带你了解人像摄影的全流程：前期沟通、机位选择、摆姿引导、灯光运用，AE 现场手把手教你拍出大片。', category: '摄影摄像', level: '精通', type: 'provide', created_at: date(7) },
      { id: 's_2013', user_id: 'u_1005', title: 'Lightroom 后期调色', description: '分享我的一套 LR 调色工作流，从白平衡校准到风格化调色，让你手机里的废片也能起死回生。', category: '摄影摄像', level: '进阶', type: 'provide', created_at: date(3) },
      { id: 's_2014', user_id: 'u_1005', title: '想学 Photoshop 修图', description: '拍了很多照片但不会精修，想学 PS 人像精修流程，肤色、磨皮、液化，有设计方向的同学来勾兑。', category: '设计创意', level: '入门', type: 'want', created_at: date(2) },
      // 第 15 条：小红想学摄影构图
      { id: 's_2015', user_id: 'u_1002', title: '想学摄影构图', description: '做设计对画面挺敏感，想系统学习摄影构图，日常随手拍也能拍出高级感，摄影大神请联系我！', category: '摄影摄像', level: '入门', type: 'want', created_at: date(1) }
    ],

    // ---- 消息表：仅放 2 条示例消息，模拟小李和小王互相交换 ----
    messages: [
      { id: 'm_3001', from_user_id: 'u_1004', to_user_id: 'u_1005', content: '你好呀，我听说你想学 PS？我英语口语还不错，想学摄影，我们可以互相交换技能吗？', is_read: false, created_at: date(2) },
      { id: 'm_3002', from_user_id: 'u_1005', to_user_id: 'u_1004', content: '当然可以！我教你人像摄影和 LR 后期，你教我英语口语，就这么说定了！', is_read: false, created_at: date(1) }
    ],

    // ---- 评价表：技能交流结束后互相打分，公开可见 ----
    // rating 为 1~5 的整数，content 为评价文字
    reviews: [
      { id: 'r_4001', skill_id: 's_2012', from_user_id: 'u_1004', to_user_id: 'u_1005', rating: 5, content: '小王教摄影超耐心，带我外拍两次，构图和用光讲得很透彻，强烈推荐！', created_at: date(4) },
      { id: 'r_4002', skill_id: 's_2013', from_user_id: 'u_1001', to_user_id: 'u_1005', rating: 4, content: 'LR 后期调色很实用，就是节奏有点快，整体收获很大。', created_at: date(3) },
      { id: 'r_4003', skill_id: 's_2009', from_user_id: 'u_1003', to_user_id: 'u_1004', rating: 5, content: '小李英语口语陪练太棒了，一个月下来口语自信很多，发音也标准了！', created_at: date(2) },
      { id: 'r_4004', skill_id: 's_2001', from_user_id: 'u_1002', to_user_id: 'u_1001', rating: 5, content: '小明讲 Python 很细致，零基础也能跟上，会主动跟进学习进度，推荐！', created_at: date(1) }
    ]
  };
}

/**
 * 初始化数据库
 * 如果 data.json 文件不存在，则创建它并写入测试数据；
 * 如果文件已存在，则什么都不做（避免覆盖用户已有的数据）。
 */
function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    // 把测试数据对象转成带缩进的 JSON 字符串后写入文件
    fs.writeFileSync(DB_FILE, JSON.stringify(createTestData(), null, 2), 'utf-8');
    console.log('[database] 首次运行，已自动创建 data.json 并写入测试数据');
  }
}

/**
 * 读取整个数据库内容
 * @returns {object} 形如 { users: [], skills: [], messages: [], reviews: [] } 的对象
 */
function getDB() {
  initDB(); // 读取前先确保文件存在
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

/**
 * 保存整个数据库内容到文件（每次写操作后调用）
 * @param {object} db 数据库对象
 */
function saveDB(db) {
  // JSON.stringify 的第二个参数传 null 表示不做键替换，第三个参数 2 表示缩进 2 个空格，方便阅读
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

/* ========== 用户表操作 ========== */

/**
 * 根据用户名查找用户
 * @param {string} username 用户名
 * @returns {object|null} 找到的用户对象，找不到返回 null
 */
function findUserByUsername(username) {
  return getDB().users.find((u) => u.username === username) || null;
}

/**
 * 根据用户 id 查找用户（注意：返回前会去掉密码字段，避免密码泄露）
 * @param {string} id 用户 id
 * @returns {object|null} 去掉密码的用户对象，找不到返回 null
 */
function findUserById(id) {
  const user = getDB().users.find((u) => u.id === id);
  if (!user) return null;
  // 通过解构赋值把 password 单独拿出来，剩下的字段都返回
  const { password, ...safeUser } = user;
  return safeUser;
}

/**
 * 新增一个用户
 * @param {object} user 用户对象，需要包含 id/username/password/nickname/avatar/bio/created_at 等字段
 * @returns {object} 去掉密码后的新用户对象
 */
function addUser(user) {
  const db = getDB();
  db.users.push(user);          // 放进用户数组
  saveDB(db);                   // 立刻保存到文件
  const { password, ...safeUser } = user;
  return safeUser;
}

/**
 * 更新用户资料（可修改昵称、简介、密码等）
 * @param {string} id 用户 id
 * @param {object} changes 要修改的字段对象，如 { nickname: '新昵称', bio: '新简介' }
 * @returns {object|null} 更新后的用户对象（去密码），找不到用户返回 null
 */
function updateUser(id, changes) {
  const db = getDB();
  const user = db.users.find((u) => u.id === id);
  if (!user) return null;
  // 把 changes 里的所有字段合并进原用户对象
  Object.assign(user, changes);
  saveDB(db);
  const { password, ...safeUser } = user;
  return safeUser;
}

/* ========== 技能表操作 ========== */

/**
 * 获取原始技能列表（不附带发布者信息，供 server.js 组装完整数据用）
 * @returns {array} 技能数组
 */
function getRawSkills() {
  return getDB().skills;
}

/**
 * 根据技能 id 获取技能详情
 * @param {string} id 技能 id
 * @returns {object|undefined} 技能对象，找不到返回 undefined
 */
function getSkillById(id) {
  return getDB().skills.find((s) => s.id === id);
}

/**
 * 获取某个用户发布的所有技能
 * @param {string} userId 用户 id
 * @returns {array} 该用户的技能数组
 */
function getSkillsByUserId(userId) {
  return getDB().skills.filter((s) => s.user_id === userId);
}

/**
 * 新增一条技能
 * @param {object} skill 技能对象（id、user_id、title、description、category、level、type、created_at）
 * @returns {object} 新增的技能对象
 */
function addSkill(skill) {
  const db = getDB();
  db.skills.push(skill);
  saveDB(db);
  return skill;
}

/**
 * 删除一条技能
 * @param {string} id 技能 id
 * @returns {boolean} 删除成功返回 true，没找到返回 false
 */
function deleteSkill(id) {
  const db = getDB();
  // 找到要删除的技能在数组中的下标
  const index = db.skills.findIndex((s) => s.id === id);
  if (index === -1) return false;   // 没找到
  db.skills.splice(index, 1);       // 用 splice 从数组中移除该条
  saveDB(db);
  return true;
}

/* ========== 消息表操作 ========== */

/**
 * 获取两个用户之间的全部消息记录（按时间升序排列）
 * @param {string} userId  当前用户 id
 * @param {string} otherUserId 聊天对象 id
 * @returns {array} 消息数组
 */
function getMessagesBetween(userId, otherUserId) {
  return getDB().messages
    .filter((m) =>
      (m.from_user_id === userId && m.to_user_id === otherUserId) ||
      (m.from_user_id === otherUserId && m.to_user_id === userId)
    )
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

/**
 * 新增一条消息
 * @param {object} message 消息对象（id、from_user_id、to_user_id、content、is_read、created_at）
 * @returns {object} 新增的消息对象
 */
function addMessage(message) {
  const db = getDB();
  db.messages.push(message);
  saveDB(db);
  return message;
}

/**
 * 把"某用户发给当前用户"的所有未读消息标记为已读
 * @param {string} userId 当前用户 id
 * @param {string} otherUserId 对方用户 id
 */
function markMessagesRead(userId, otherUserId) {
  const db = getDB();
  db.messages.forEach((m) => {
    // 只有对方发给我、且未读的消息才被标记
    if (m.from_user_id === otherUserId && m.to_user_id === userId && !m.is_read) {
      m.is_read = true;
    }
  });
  saveDB(db);
}

/**
 * 获取某个用户的会话列表（和每个人的对话合并成一项，取最新一条消息）
 * @param {string} userId 当前用户 id
 * @returns {array} 会话列表，每一项包含 other 对方用户信息和 lastMessage 最后一条消息
 */
function getConversations(userId) {
  const db = getDB();
  // 先过滤出所有和当前用户相关的消息，再按对方 id 分组
  const related = db.messages.filter(
    (m) => m.from_user_id === userId || m.to_user_id === userId
  );
  // 用 Map 以"对方用户 id"为 key，保留每组的最后一条消息
  const groups = new Map();
  related.forEach((m) => {
    const otherId = m.from_user_id === userId ? m.to_user_id : m.from_user_id;
    // 消息不管什么顺序，直接覆盖即可，最后保留下来的就是最新一条
    groups.set(otherId, m);
  });
  // 组装成 [{ other: 对方用户信息, lastMessage: 最后一条消息 }] 的格式
  const result = [];
  groups.forEach((lastMessage, otherId) => {
    result.push({
      other: findUserById(otherId),              // 对方用户信息（去密码）
      lastMessage: lastMessage,
      unreadCount: db.messages.filter((m) => m.from_user_id === otherId && m.to_user_id === userId && !m.is_read).length
    });
  });
  // 按最后一条消息的时间倒序排列，最新的会话排最上面
  result.sort((a, b) => new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at));
  return result;
}

/* ========== 评价表操作 ========== */

/**
 * 获取某个技能的所有评价（按时间倒序，最新的排前面）
 * @param {string} skillId 技能 id
 * @returns {array} 评价数组
 */
function getReviewsBySkillId(skillId) {
  return getDB().reviews
    .filter((r) => r.skill_id === skillId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

/**
 * 获取某个用户"收到的"所有评价（按时间倒序）
 * @param {string} userId 被评价的用户 id
 * @returns {array} 评价数组
 */
function getReviewsByUserId(userId) {
  return getDB().reviews
    .filter((r) => r.to_user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

/**
 * 计算某用户的信用分（收到的所有评价的平均分）
 * @param {string} userId 用户 id
 * @returns {object} { score: 平均分(保留一位小数), count: 评价总数 }
 */
function getCreditScore(userId) {
  const reviews = getDB().reviews.filter((r) => r.to_user_id === userId);
  if (reviews.length === 0) return { score: 0, count: 0 };
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return { score: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
}

/**
 * 检查某用户是否已经对某条技能评价过（防止重复评价）
 * @param {string} skillId 技能 id
 * @param {string} fromUserId 评价人 id
 * @returns {boolean} 已评价返回 true
 */
function hasReviewed(skillId, fromUserId) {
  return getDB().reviews.some((r) => r.skill_id === skillId && r.from_user_id === fromUserId);
}

/**
 * 新增一条评价
 * @param {object} review 评价对象（id, skill_id, from_user_id, to_user_id, rating, content, created_at）
 * @returns {object} 新增的评价对象
 */
function addReview(review) {
  const db = getDB();
  db.reviews.push(review);
  saveDB(db);
  return review;
}

/* ========== 导出模块 ========== */
module.exports = {
  initDB,          // 初始化数据库
  getDB,           // 读取数据库
  saveDB,          // 保存数据库
  genId,           // 生成唯一 id
  CATEGORIES,      // 10 个分类列表
  createTestData,  // 生成测试数据
  // 用户相关
  findUserByUsername,
  findUserById,
  addUser,
  updateUser,
  // 技能相关
  getRawSkills,
  getSkillById,
  getSkillsByUserId,
  addSkill,
  deleteSkill,
  // 消息相关
  getMessagesBetween,
  addMessage,
  markMessagesRead,
  getConversations,
  // 评价相关
  getReviewsBySkillId,
  getReviewsByUserId,
  getCreditScore,
  hasReviewed,
  addReview
};