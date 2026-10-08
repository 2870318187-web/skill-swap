<!--
  Publish.vue —— 发布技能页
  功能：
  1. 选择技能类型（我能教别人 / 我想学习）
  2. 填写标题、分类、难度、描述
  3. 【重点】AI 帮我写：输入关键词自动生成描述
  4. 发布成功后跳转到技能详情页
-->
<template>
  <div class="publish-page page-container">
    <!-- 页面标题 -->
    <div class="page-title">
      <h2>发布技能</h2>
      <p>分享你的特长，或者告诉大家你想学什么</p>
    </div>

    <el-card class="publish-card" shadow="always">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" size="large">
        <!-- 1. 技能类型：单选按钮组 -->
        <el-form-item label="技能类型">
          <el-radio-group v-model="form.type">
            <el-radio value="provide" border>📤 我能教别人</el-radio>
            <el-radio value="want" border>📥 我想学习</el-radio>
          </el-radio-group>
          <!-- 类型不同，右侧提示不同 -->
          <div class="type-tip">
            {{ form.type === 'provide' ? '教别人可以帮你巩固知识、认识新朋友' : '说出来更容易找到愿意教你的同学' }}
          </div>
        </el-form-item>

        <!-- 2. 技能标题 -->
        <el-form-item label="技能标题" prop="title">
          <el-input v-model="form.title" maxlength="30" show-word-limit placeholder="例如：Python 入门教学 / 想学吉他弹唱" />
        </el-form-item>

        <!-- 3. 技能分类 -->
        <el-form-item label="技能分类" prop="category">
          <el-select v-model="form.category" placeholder="请选择分类" class="full-width">
            <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
          </el-select>
        </el-form-item>

        <!-- 4. 难度等级 -->
        <el-form-item label="难度等级">
          <el-radio-group v-model="form.level">
            <el-radio-button value="入门">入门</el-radio-button>
            <el-radio-button value="进阶">进阶</el-radio-button>
            <el-radio-button value="精通">精通</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <!-- 5. AI 生成描述区 -->
        <el-form-item label="AI 帮我写">
          <div class="ai-row">
            <el-input
              v-model="aiKeyword"
              placeholder="输入几个关键词，比如：Python 零基础 爬虫"
              clearable
              @keyup.enter="aiGenerate"
            >
              <template #prefix><el-icon><MagicStick /></el-icon></template>
            </el-input>
            <el-button class="ai-btn" :loading="aiLoading" @click="aiGenerate">
              <el-icon v-if="!aiLoading"><Star /></el-icon>
              生成描述
            </el-button>
          </div>
          <!-- 模拟提示语 -->
          <div class="ai-tip" v-if="aiMockUsed">
            当前为 AI 模拟回复，如需真实大模型，请在 server.js 中配置 OPENAI_API_KEY
          </div>
        </el-form-item>

        <!-- 6. 技能描述 -->
        <el-form-item label="技能描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="6"
            maxlength="500"
            show-word-limit
            placeholder="详细描述你的技能：教学计划、擅长方向、期望的交换方式..."
          />
        </el-form-item>

        <!-- 7. 发布按钮 -->
        <el-form-item>
          <el-button type="primary" size="large" class="submit-btn" :loading="submitting" @click="handlePublish">
            发布技能
          </el-button>
          <el-button size="large" @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
/**
 * 发布页逻辑：
 * 1. onMounted 时加载分类列表
 * 2. AI 生成调用 /api/ai/generate-description，成功后回填描述
 * 3. 发布调用 /api/skills，成功后跳详情页
 */
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { MagicStick, Star } from '@element-plus/icons-vue'
import request from '../request'
import { getCurrentUser } from '../auth'

const router = useRouter()
// 当前登录用户（发布页面要求已登录，路由守卫保证了这一点）
const currentUser = getCurrentUser()

// 表单数据
const form = reactive({
  type: 'provide',      // 技能类型：provide 我能教 / want 我想学
  title: '',            // 标题
  category: '',         // 分类
  level: '入门',         // 难度
  description: ''       // 描述
})

// 表单校验规则
const rules = {
  title: [{ required: true, message: '请输入技能标题', trigger: 'blur' }],
  category: [{ required: true, message: '请选择技能分类', trigger: 'change' }],
  description: [{ required: true, message: '请填写技能描述', trigger: 'blur' }]
}

const formRef = ref(null)
const categories = ref([])       // 分类下拉数据
const submitting = ref(false)    // 发布按钮加载中
const aiKeyword = ref('')        // AI 生成时的关键词输入框
const aiLoading = ref(false)     // AI 生成中
const aiMockUsed = ref(false)    // 是否处于模拟回复模式

/** 加载分类列表 */
async function fetchCategories() {
  try {
    categories.value = await request.get('/categories')
  } catch (e) {
    /* 忽略 */
  }
}

/**
 * AI 帮我写描述
 * 把当前表单的标题/类型/分类 + 关键词一并发给后端，返回描述回填到文本框
 */
async function aiGenerate() {
  // 关键词或标题至少要有一样，否则无法生成有意义的内容
  if (!aiKeyword.value.trim() && !form.title.trim()) {
    ElMessage.warning('请先输入关键词或填写技能标题')
    return
  }
  aiLoading.value = true
  try {
    const data = await request.post('/ai/generate-description', {
      keyword: aiKeyword.value.trim(),
      title: form.title,
      type: form.type,
      category: form.category
    })
    // 把生成的描述写入表单的 description 字段
    form.description = data.description
    // 记录是否是模拟回复，是的话给用户一个提示
    aiMockUsed.value = !!data.usingMock
    // 如果分类还没选，顺手从结果里推断？——不推断，保持简单
    ElMessage.success('AI 描述已生成，可以再手动修改')
  } catch (e) {
    /* 拦截器已提示 */
  } finally {
    aiLoading.value = false
  }
}

/** 点击发布按钮 */
async function handlePublish() {
  // 前端校验
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    // 调用发布接口
    const newSkill = await request.post('/skills', {
      user_id: currentUser.id,
      title: form.title,
      description: form.description,
      category: form.category,
      level: form.level,
      type: form.type
    })
    ElMessage.success('发布成功！')
    // 跳转到新技能的详情页
    router.push(`/skill/${newSkill.id}`)
  } catch (e) {
    /* 拦截器已提示 */
  } finally {
    submitting.value = false
  }
}

/** 重置表单 */
function resetForm() {
  formRef.value.resetFields()
}

// 页面加载时获取分类
onMounted(fetchCategories)
</script>

<style scoped>
/* 页面标题 */
.page-title h2 {
  font-size: 26px;
  color: #303133;
}
.page-title p {
  margin-top: 6px;
  color: #909399;
  font-size: 14px;
}
/* 发布卡片 */
.publish-card {
  margin-top: 20px;
  padding: 10px 20px;
  max-width: 760px;
}
/* 类型提示文字 */
.type-tip {
  width: 100%;
  font-size: 12px;
  color: #a0a4b0;
  margin-top: 6px;
}
.full-width {
  width: 100%;
}
/* AI 生成行：输入框 + 按钮在一行 */
.ai-row {
  display: flex;
  gap: 10px;
  width: 100%;
}
.ai-row .el-input {
  flex: 1;
}
/* AI 按钮：亮色渐变 */
.ai-btn {
  background: linear-gradient(135deg, #ff9a56, #ff5e8a);
  color: #fff;
  font-weight: 600;
  border: none;
  min-width: 130px;
}
/* AI 提示小字 */
.ai-tip {
  width: 100%;
  font-size: 12px;
  color: #ff9a2e;
  margin-top: 6px;
}
/* 发布按钮加点宽度 */
.submit-btn {
  min-width: 160px;
}
</style>