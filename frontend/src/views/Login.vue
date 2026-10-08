<!--
  Login.vue —— 登录页
  居中白色卡片表单，支持点击测试账号自动填充
  登录成功后：有 redirect 就先跳去哪，没有就回首页
-->
<template>
  <div class="login-page">
    <el-card class="login-card" shadow="always">
      <!-- 卡片头部 -->
      <div class="card-header">
        <div class="card-icon"><el-icon :size="30"><User /></el-icon></div>
        <h2>欢迎回来</h2>
        <p>登录后即可发布技能、寻找学习伙伴</p>
      </div>

      <!-- 登录表单 -->
      <el-form ref="formRef" :model="form" :rules="rules" size="large" @keyup.enter="handleLogin">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="用户名" :prefix-icon="User" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            show-password
            :prefix-icon="Lock"
          />
        </el-form-item>
        <el-form-item>
          <el-button class="submit-btn" :loading="loading" @click="handleLogin">登 录</el-button>
        </el-form-item>
      </el-form>

      <!-- 跳转注册 -->
      <div class="to-register">
        还没有账号？
        <router-link to="/register" class="link">立即注册</router-link>
      </div>

      <!-- 测试账号提示：点击自动填充 -->
      <el-alert
        class="test-tip"
        type="success"
        :closable="false"
        title="测试账号：点击下方即可自动填充"
      >
        <div class="test-accounts">
          <span
            v-for="acc in testAccounts"
            :key="acc.username"
            class="test-account"
            @click="fillAccount(acc)"
          >
            {{ acc.label }}：{{ acc.username }} / 123456
          </span>
        </div>
      </el-alert>
    </el-card>
  </div>
</template>

<script setup>
/**
 * 登录逻辑：
 * 1. 表单校验通过后调用 /login 接口
 * 2. 成功后把用户对象存进 localStorage，然后回跳
 */
import { ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import request from '../request'
import { setCurrentUser } from '../auth'

const route = useRoute() // 拿到 URL，里面可能有 redirect 参数
const router = useRouter()

// 表单数据
const form = reactive({ username: '', password: '' })
// 表单校验规则
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}
const formRef = ref(null) // 表单组件引用，用于触发校验
const loading = ref(false) // 登录按钮加载中状态

// 测试账号列表（点击自动填充）
const testAccounts = [
  { label: '小明', username: 'xiaoming' },
  { label: '小红', username: 'xiaohong' },
  { label: '小刚', username: 'xiaogang' },
  { label: '小李', username: 'xiaoli' },
  { label: '小王', username: 'xiaowang' }
]

/** 点击测试账号：把用户名和密码填进表单（密码统一 123456） */
function fillAccount(acc) {
  form.username = acc.username
  form.password = '123456'
}

/** 点击登录按钮 */
async function handleLogin() {
  // 先做前端表单校验，不通过就结束
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    // 调用后端登录接口
    const user = await request.post('/login', { ...form })
    // 保存登录状态到 localStorage
    setCurrentUser(user)
    ElMessage.success('登录成功，欢迎回来！')
    // 登录成功后有 redirect 参数就跳转过去（比如本来想发布技能被拦到登录页），否则回首页
    router.push(route.query.redirect || '/')
  } catch (e) {
    /* 错误提示已在拦截器统一处理 */
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* 页面居中 + 浅色渐变背景 */
.login-page {
  min-height: calc(100vh - 60px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  background: linear-gradient(135deg, #eef2ff 0%, #f6f0ff 100%);
}
/* 登录卡片：白底 + 大圆角 + 柔和阴影 */
.login-card {
  width: 440px;
  padding: 18px 26px 26px;
  border-radius: 20px;
  box-shadow: 0 16px 40px rgba(84, 110, 255, 0.18);
}
/* 头部：图标圆 + 标题 */
.card-header {
  text-align: center;
  margin-bottom: 24px;
}
.card-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 12px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(135deg, #4f7cff, #7c4dff);
  box-shadow: 0 8px 20px rgba(106, 92, 255, 0.4);
}
.card-header h2 {
  font-size: 22px;
  color: #303133;
}
.card-header p {
  margin-top: 6px;
  font-size: 13px;
  color: #909399;
}
/* 登录按钮：通栏渐变 */
.submit-btn {
  width: 100%;
  background: linear-gradient(135deg, #4f7cff, #6a5cff);
  color: #fff;
  font-weight: 600;
  letter-spacing: 4px;
}
/* 注册链接 */
.to-register {
  text-align: center;
  font-size: 14px;
  color: #909399;
  margin-top: 2px;
}
.link {
  color: #4f7cff;
  text-decoration: none;
  font-weight: 600;
}
/* 测试账号提示区 */
.test-tip {
  margin-top: 18px;
  border-radius: 10px;
}
.test-accounts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.test-account {
  background: #f0f9eb;
  border: 1px solid #d9f1c5;
  color: #529b2e;
  padding: 2px 10px;
  border-radius: 14px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.test-account:hover {
  background: #67c23a;
  color: #fff;
  border-color: #67c23a;
}
</style>