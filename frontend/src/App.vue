<!--
  App.vue —— 根组件
  所有页面都渲染在这个组件内部，它主要负责：
  1. 顶部渐变导航栏（Logo + 菜单 + 登录状态区）
  2. 中间的 <router-view> 是"换页的插槽"，路由切换时自动替换成对应页面组件
-->
<template>
  <div class="app-wrapper">
    <!-- ============ 顶部导航栏 ============ -->
    <header class="navbar">
      <div class="nav-inner">
        <!-- 左侧 Logo，点击回到首页 -->
        <div class="logo" @click="$router.push('/')">
          <el-icon :size="26"><School /></el-icon>
          <span class="logo-text">校园技能交换</span>
        </div>

        <!-- 中部菜单：当前路由高亮 -->
        <nav class="nav-menu">
          <router-link to="/" class="nav-item" :class="{ active: $route.path === '/' }">首页</router-link>
          <router-link to="/publish" class="nav-item" :class="{ active: $route.path === '/publish' }">发布技能</router-link>
          <router-link to="/match" class="nav-item" :class="{ active: $route.path === '/match' }">智能匹配</router-link>
          <router-link to="/messages" class="nav-item" :class="{ active: $route.path === '/messages' }">消息中心</router-link>
        </nav>

        <!-- 右侧：已登录显示头像下拉，未登录显示登录/注册按钮 -->
        <div class="nav-right">
          <template v-if="user">
            <el-dropdown trigger="click" @command="handleCommand">
              <span class="user-entry">
                <el-avatar :size="32" :src="user.avatar" />
                <span class="nickname">{{ user.nickname }}</span>
                <el-icon class="arrow"><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                  <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
          <template v-else>
            <el-button size="small" text class="nav-text-btn" @click="$router.push('/login')">登录</el-button>
            <el-button size="small" class="nav-register-btn" @click="$router.push('/register')">免费注册</el-button>
          </template>
        </div>
      </div>
    </header>

    <!-- ============ 页面内容区（换页的地方） ============ -->
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
/**
 * 根组件的逻辑：
 * 用响应式变量 user 保存当前登录用户。
 * 因为 localStorage 变化不会自动通知页面，所以每次路由切换时都重新读取一次。
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getCurrentUser, clearCurrentUser } from './auth'

// 路由实例，用于编程式跳转
const router = useRouter()

// 当前登录用户（从 localStorage 读取，初始可能为 null）
const user = ref(getCurrentUser())

/**
 * 监听路由变化：每切一次页面就重新读一次登录状态，
 * 保证比如"登录成功后跳转"时，导航栏能立刻刷新成已登录的样子。
 */
router.afterEach(() => {
  user.value = getCurrentUser()
})

/**
 * 处理导航栏下拉菜单的命令
 * @param {string} command 点击的菜单项标识
 */
function handleCommand(command) {
  if (command === 'profile') {
    // 跳到自己的个人中心（不带 id 参数 = 查看自己）
    router.push('/profile')
  } else if (command === 'logout') {
    // 退出登录：清除本地用户 + 跳回首页 + 提示
    clearCurrentUser()
    user.value = null
    ElMessage.success('已退出登录')
    router.push('/')
  }
}
</script>

<style scoped>
/* ---- 导航栏整体：深蓝渐变 + 白色文字，固定在顶部 ----
   position: sticky 让导航栏在滚动时始终吸附在顶部 */
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: linear-gradient(135deg, #3d5afe 0%, #6a5cff 60%, #7c4dff 100%);
  box-shadow: 0 4px 16px rgba(61, 90, 254, 0.35);
}

/* 导航栏内部容器：限制宽度并水平排列三块内容 */
.nav-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Logo 文字 */
.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  cursor: pointer;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 1px;
}

/* 中部导航菜单 */
.nav-menu {
  display: flex;
  gap: 6px;
}

/* 每个菜单项：白色半透明文字，当前页高亮为实心白字+底部指示条 */
.nav-item {
  color: rgba(255, 255, 255, 0.75);
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 15px;
  transition: all 0.2s;
  position: relative;
}
.nav-item:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
}
.nav-item.active {
  color: #fff;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.18);
}

/* 右侧用户区 */
.nav-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 已登录：头像 + 昵称整体可点击 */
.user-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 20px;
  transition: background 0.2s;
}
.user-entry:hover {
  background: rgba(255, 255, 255, 0.15);
}
.nickname {
  font-size: 14px;
  max-width: 90px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.arrow {
  font-size: 12px;
}

/* 未登录时的文字按钮 */
.nav-text-btn {
  color: #fff !important;
}
/* 未登录时的注册按钮：白色背景 + 蓝色文字，突出醒目 */
.nav-register-btn {
  background: #fff !important;
  color: #5a4cff !important;
  font-weight: 600;
}

/* 页面内容整体留出上下间距 */
.main-content {
  min-height: calc(100vh - 60px);
}
</style>