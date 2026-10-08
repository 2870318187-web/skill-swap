/**
 * auth.js —— 登录状态管理工具
 *
 * 用一个纯前端、零依赖的方式记住"当前登录的用户"：
 * 登录成功时把用户对象存进浏览器 localStorage，刷新页面也不会丢；
 * 其他页面通过 getCurrentUser() 就能随时知道"我是否已登录、我是谁"。
 */

// localStorage 里保存用户信息的固定 key
const STORAGE_KEY = 'skill_swap_user'

/**
 * 获取当前登录用户
 * @returns {object|null} 用户对象，未登录返回 null
 */
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    // 数据损坏等异常情况，按未登录处理
    return null
  }
}

/**
 * 保存登录用户（登录成功后调用）
 * @param {object} user 用户对象（包含 id、username、nickname、avatar 等）
 */
export function setCurrentUser(user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
}

/**
 * 清除登录状态（退出登录时调用）
 */
export function clearCurrentUser() {
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * 获取当前登录用户的 id（方便直接拼到请求参数里）
 * @returns {string|null} 用户 id，未登录返回 null
 */
export function getUserId() {
  const user = getCurrentUser()
  return user ? user.id : null
}