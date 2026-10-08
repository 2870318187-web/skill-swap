/**
 * router/index.js —— 前端路由配置
 *
 * 定义"哪个 URL 地址展示哪个页面组件"，并实现登录守卫：
 * 标记了 requiresAuth: true 的页面，未登录访问时会自动跳转到登录页。
 */
import { createRouter, createWebHistory } from 'vue-router'
import { getCurrentUser } from '../auth'

// 用懒加载方式引入所有页面组件（用到时才加载，首次打开更快）
const routes = [
  { path: '/', name: 'Home', component: () => import('../views/Home.vue') },                       // 首页
  { path: '/login', name: 'Login', component: () => import('../views/Login.vue') },                // 登录页
  { path: '/register', name: 'Register', component: () => import('../views/Register.vue') },       // 注册页
  { path: '/publish', name: 'Publish', component: () => import('../views/Publish.vue'), meta: { requiresAuth: true } },        // 发布技能（需登录）
  { path: '/skill/:id', name: 'SkillDetail', component: () => import('../views/SkillDetail.vue') }, // 技能详情
  { path: '/profile/:id?', name: 'Profile', component: () => import('../views/Profile.vue') },     // 个人中心（带可选参数 id，不传则是看自己）
  { path: '/match', name: 'Match', component: () => import('../views/Match.vue'), meta: { requiresAuth: true } },               // 智能匹配（需登录）
  { path: '/messages', name: 'Messages', component: () => import('../views/Messages.vue'), meta: { requiresAuth: true } }        // 消息中心（需登录）
]

// 创建路由实例（使用 HTML5 的 history 模式，URL 里没有 # 号）
const router = createRouter({
  history: createWebHistory(),
  routes
})

/**
 * 全局前置守卫：每次跳转页面之前都会执行
 * 作用：检查目标页面是否需要登录
 */
router.beforeEach((to, from, next) => {
  // 需要登录但当前没登录时，跳去登录页，并在 query 里记下"原本想去哪"，登录后跳回来
  if (to.meta.requiresAuth && !getCurrentUser()) {
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else {
    next() // 放行
  }
})

/**
 * 全局后置守卫：每次跳转完成后执行
 * 作用：修改浏览器标签页的标题
 */
router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} - 校园技能交换平台` : '校园技能交换平台'
})

export default router