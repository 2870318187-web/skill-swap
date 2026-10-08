<!--
  Register.vue —— 注册页
  四个输入框（用户名/昵称/密码/确认密码）+ 前端表单验证
  注册成功后自动跳回登录页
-->
<template>
  <div class="register-page">
    <el-card class="register-card" shadow="always">
      <!-- 卡片头部 -->
      <div class="card-header">
        <div class="card-icon"><el-icon :size="30"><EditPen /></el-icon></div>
        <h2>创建账号</h2>
        <p>加入校园技能交换平台，开始你的技能之旅</p>
      </div>

      <!-- 注册表单 -->
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" size="large">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="3~20 位字母或数字" :prefix-icon="User" />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="form.nickname" placeholder="给自己起个响亮的昵称（可选）" :prefix-icon="Postcard" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="至少 6 位" show-password :prefix-icon="Lock" />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="form.confirmPassword" type="password" placeholder="请再次输入密码" show-password :prefix-icon="Lock" />
        </el-form-item>
        <el-form-item>
          <el-button class="submit-btn" :loading="loading" @click="handleRegister">注 册</el-button>
        </el-form-item>
      </el-form>

      <!-- 跳转登录 -->
      <div class="to-login">
        已有账号？
        <router-link to="/login" class="link">直接登录</router-link>
      </div>
    </el-card>
  </div>
</template>

<script setup>
/**
 * 注册逻辑：
 * 1. 自定义校验规则：用户名 3~20 位、密码至少 6 位、两次密码一致
 * 2. 校验通过后调用 /register 接口
 * 3. 成功后提示并跳到登录页（回填用户名方便登录）
 */
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, Postcard, EditPen } from '@element-plus/icons-vue'
import request from '../request'

const router = useRouter()

// 表单数据
const form = reactive({
  username: '',
  nickname: '',
  password: '',
  confirmPassword: ''
})

// 自定义校验：确认密码必须和密码一致
const validateConfirm = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请再次输入密码'))
  } else if (value !== form.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback() // 校验通过
  }
}

// 表单校验规则
const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度需在 3~20 位之间', trigger: 'blur' },
    // 正则：只允许字母、数字、下划线
    { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线', trigger: 'blur' }
  ],
  nickname: [{ max: 20, message: '昵称最长 20 个字符', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少 6 位', trigger: 'blur' }
  ],
  confirmPassword: [{ validator: validateConfirm, trigger: 'blur' }]
}

const formRef = ref(null)
const loading = ref(false) // 注册按钮加载状态

/** 点击注册按钮 */
async function handleRegister() {
  // 先做前端校验
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    // 调用后端注册接口（确认密码字段不需要传给后端）
    const { confirmPassword, ...payload } = form
    const user = await request.post('/register', payload)
    ElMessage.success('注册成功，请登录！')
    // 跳到登录页，并把刚注册的用户名带过去，方便直接登录
    router.push({ path: '/login', query: { username: user.username } })
  } catch (e) {
    /* 错误提示已在拦截器统一处理 */
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* 页面居中 + 渐变背景 */
.register-page {
  min-height: calc(100vh - 60px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  background: linear-gradient(135deg, #eef2ff 0%, #f6f0ff 100%);
}
/* 注册卡片：比登录卡略宽，因为字段更多 */
.register-card {
  width: 480px;
  padding: 18px 26px 26px;
  border-radius: 20px;
  box-shadow: 0 16px 40px rgba(84, 110, 255, 0.18);
}
.card-header {
  text-align: center;
  margin-bottom: 20px;
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
  background: linear-gradient(135deg, #36c27c, #2aa6e8);
  box-shadow: 0 8px 20px rgba(54, 194, 124, 0.35);
}
.card-header h2 {
  font-size: 22px;
}
.card-header p {
  margin-top: 6px;
  font-size: 13px;
  color: #909399;
}
.submit-btn {
  width: 100%;
  background: linear-gradient(135deg, #4f7cff, #6a5cff);
  color: #fff;
  font-weight: 600;
  letter-spacing: 4px;
}
.to-login {
  text-align: center;
  font-size: 14px;
  color: #909399;
}
.link {
  color: #4f7cff;
  text-decoration: none;
  font-weight: 600;
}
</style>