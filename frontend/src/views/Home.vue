<!--
  Home.vue —— 首页
  包含：渐变横幅 + 统计卡片 + 搜索/筛选 + 分类标签 + 技能卡片列表 + 分页
  数据来源：/api/stats 和 /api/skills 两个接口
-->
<template>
  <div class="home-page">
    <!-- ============ 1. 顶部渐变横幅 ============ -->
    <div class="hero">
      <h1 class="hero-title">校园技能交换平台</h1>
      <p class="hero-slogan">你有一个苹果，我有一个苹果，交换后还是一个苹果；你有一种技能，我有一种技能，交换后我们各得两种技能。</p>
      <!-- 横幅中间的搜索框：回车或点按钮触发搜索 -->
      <div class="hero-search">
        <el-input
          v-model="keyword"
          size="large"
          placeholder="搜索技能，例如：Python、吉他、摄影..."
          clearable
          @keyup.enter="onSearch"
          @clear="onSearch"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
          <template #append>
            <el-button class="search-btn" @click="onSearch">搜索</el-button>
          </template>
        </el-input>
      </div>
    </div>

    <div class="page-container">
      <!-- ============ 2. 统计卡片（4 个） ============ -->
      <div class="stats-row">
        <el-card class="stat-card">
          <div class="stat-value" style="color:#4f7cff">{{ stats.userCount }}</div>
          <div class="stat-label">注册用户数</div>
        </el-card>
        <el-card class="stat-card">
          <div class="stat-value" style="color:#6a5cff">{{ stats.skillCount }}</div>
          <div class="stat-label">技能总数</div>
        </el-card>
        <el-card class="stat-card">
          <div class="stat-value" style="color:#36c27c">{{ stats.provideCount }}</div>
          <div class="stat-label">可学技能数</div>
        </el-card>
        <el-card class="stat-card">
          <div class="stat-value" style="color:#f5a623">{{ stats.wantCount }}</div>
          <div class="stat-label">求学技能数</div>
        </el-card>
      </div>

      <!-- ============ 3. 类型筛选 ============ -->
      <div class="filter-bar">
        <el-radio-group v-model="typeFilter" @change="onSearch">
          <el-radio-button value="">全部</el-radio-button>
          <el-radio-button value="provide">可学技能</el-radio-button>
          <el-radio-button value="want">求学技能</el-radio-button>
        </el-radio-group>
      </div>

      <!-- ============ 4. 分类标签（10 个） ============ -->
      <div class="category-bar">
        <el-tag
          v-for="cat in ['全部', ...categories]"
          :key="cat"
          :class="['category-tag', { active: categoryFilter === cat }]"
          :effect="categoryFilter === cat ? 'dark' : 'light'"
          @click="selectCategory(cat)"
        >
          {{ cat }}
        </el-tag>
      </div>

      <!-- ============ 5. 技能卡片列表（一行 4 个） ============ -->
      <div v-loading="loading" class="skill-list">
        <el-row v-if="skills.length" :gutter="20">
          <!-- span=6 表示占一行 24 等分中的 6 份，正好一行显示 4 个 -->
          <el-col v-for="skill in skills" :key="skill.id" :span="6" class="skill-col">
            <el-card class="skill-card" shadow="hover" @click="goDetail(skill.id)">
              <!-- 卡片顶部：头像 + 昵称 + 类型标签 -->
              <div class="card-top">
                <el-avatar :size="36" :src="skill.avatar">{{ skill.nickname?.charAt(0) }}</el-avatar>
                <span class="card-nickname text-ellipsis">{{ skill.nickname }}</span>
                <el-tag
                  size="small"
                  :type="skill.type === 'provide' ? 'success' : 'warning'"
                  effect="light"
                >
                  {{ skill.type === 'provide' ? '我能教' : '我想学' }}
                </el-tag>
              </div>
              <!-- 技能标题 -->
              <div class="card-title text-ellipsis">{{ skill.title }}</div>
              <!-- 描述：最多显示两行，超出省略 -->
              <div class="card-desc">{{ skill.description }}</div>
              <!-- 卡片底部：分类 + 难度 -->
              <div class="card-bottom">
                <el-tag size="small" type="primary" effect="plain">{{ skill.category }}</el-tag>
                <span class="card-level">{{ levelText(skill.level) }}</span>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <!-- 空状态：没有数据时展示 -->
        <el-empty v-else-if="!loading" description="没有找到相关技能，换个关键词试试吧" />

        <!-- ============ 6. 分页 ============ -->
        <div class="pagination-wrap" v-if="total > pageSize">
          <el-pagination
            background
            layout="prev, pager, next, total"
            :total="total"
            :page-size="pageSize"
            :current-page="currentPage"
            @current-change="onPageChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 首页逻辑说明：
 * 1. onMounted 时并行请求统计数据和技能列表
 * 2. 搜索、筛选、切分类、翻页都会重新请求技能列表
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import request from '../request'

// 路由实例，用于跳转到技能详情
const router = useRouter()

// ---- 响应式数据 ----
const stats = ref({ userCount: 0, skillCount: 0, provideCount: 0, wantCount: 0 }) // 统计
const categories = ref([])                    // 分类列表
const keyword = ref('')                       // 搜索关键词
const typeFilter = ref('')                    // 类型筛选：空=全部 / provide=可学 / want=求学
const categoryFilter = ref('全部')             // 当前选中的分类
const skills = ref([])                        // 当前页的技能列表
const total = ref(0)                          // 总条数（用于分页）
const currentPage = ref(1)                    // 当前页码
const pageSize = 8                            // 每页条数（8 条正好两行）
const loading = ref(false)                    // 加载中状态

/**
 * 难度等级映射为中文描述
 * @param {string} level 后端存的难度标识（入门/进阶/精通）
 */
function levelText(level) {
  const map = { 入门: '入门', 进阶: '进阶', 精通: '精通' }
  return map[level] || level || '入门'
}

/** 获取平台统计数据（注册用户数、技能总数等） */
async function fetchStats() {
  try {
    stats.value = await request.get('/stats')
  } catch (e) {
    // 失败时保持默认值 0，拦截器里已经弹过错误提示
  }
}

/** 获取分类列表 */
async function fetchCategories() {
  try {
    categories.value = await request.get('/categories')
  } catch (e) {
    /* 忽略错误 */
  }
}

/**
 * 获取技能列表（携带所有筛选条件和分页参数）
 */
async function fetchSkills() {
  loading.value = true
  try {
    // 用 URLSearchParams 组装查询参数，自动跳过空值
    const params = new URLSearchParams()
    if (keyword.value.trim()) params.set('keyword', keyword.value.trim())
    if (typeFilter.value) params.set('type', typeFilter.value)
    if (categoryFilter.value && categoryFilter.value !== '全部') params.set('category', categoryFilter.value)
    params.set('page', currentPage.value)
    params.set('limit', pageSize)

    const data = await request.get(`/skills?${params.toString()}`)
    skills.value = data.list        // 当前页数据
    total.value = data.total        // 总条数
  } catch (e) {
    skills.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

/** 点击搜索：回到第一页再查询 */
function onSearch() {
  currentPage.value = 1
  fetchSkills()
}

/** 点击分类标签：切换分类并回到第一页 */
function selectCategory(cat) {
  categoryFilter.value = cat
  currentPage.value = 1
  fetchSkills()
}

/** 翻页 */
function onPageChange(page) {
  currentPage.value = page
  fetchSkills()
  // 翻页后滚动回列表顶部，提升体验
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

/** 点击卡片跳转到技能详情页 */
function goDetail(id) {
  router.push(`/skill/${id}`)
}

// ---- 页面创建后立即加载数据 ----
onMounted(() => {
  fetchStats()
  fetchCategories()
  fetchSkills()
})
</script>

<style scoped>
/* ---- 渐变横幅 ---- */
.hero {
  background: linear-gradient(135deg, #3d5afe 0%, #6a5cff 55%, #9c4dff 100%);
  padding: 70px 20px 60px;
  text-align: center;
  color: #fff;
}
.hero-title {
  font-size: 40px;
  font-weight: 800;
  letter-spacing: 4px;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}
.hero-slogan {
  max-width: 720px;
  margin: 16px auto 0;
  font-size: 15px;
  line-height: 1.8;
  opacity: 0.9;
}
/* 搜索框 */
.hero-search {
  max-width: 640px;
  margin: 30px auto 0;
}
.hero-search :deep(.el-input__wrapper) {
  border-radius: 24px 0 0 24px;
  padding: 4px 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}
.hero-search :deep(.el-input-group__append) {
  border-radius: 0 24px 24px 0;
  border: none;
  box-shadow: none;
}
.search-btn {
  background: linear-gradient(135deg, #ff9a5a, #ff6a88);
  color: #fff;
  font-weight: 600;
  border: none;
  min-width: 80px;
}
/* ---- 统计卡片区 ---- */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-top: -35px; /* 让卡片"骑"在横幅上，更有层次感 */
  margin-bottom: 20px;
}
.stat-card {
  text-align: center;
  padding: 6px 0;
}
.stat-value {
  font-size: 34px;
  font-weight: 800;
}
.stat-label {
  margin-top: 4px;
  color: #909399;
  font-size: 14px;
}
/* ---- 筛选栏 ---- */
.filter-bar {
  margin: 8px 0 14px;
}
/* ---- 分类标签 ---- */
.category-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 24px;
}
.category-tag {
  cursor: pointer;
  font-size: 13px;
  padding: 0 16px;
  height: 32px;
  line-height: 32px;
}
/* ---- 技能卡片列表 ---- */
.skill-list {
  min-height: 300px;
}
.skill-col {
  margin-bottom: 20px;
}
.card-top {
  display: flex;
  align-items: center;
  gap: 8px;
}
.card-nickname {
  flex: 1;
  font-size: 14px;
  color: #606266;
}
.card-title {
  font-size: 17px;
  font-weight: 700;
  margin: 12px 0 6px;
}
.card-desc {
  font-size: 13px;
  color: #909399;
  line-height: 1.6;
  height: 42px; /* 固定两行高度，让卡片整齐 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 12px;
}
.card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.card-level {
  font-size: 12px;
  color: #a0a4b0;
}
/* ---- 分页 ---- */
.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}
/* ---- 窄屏适配：一行变成 2 个 ---- */
@media (max-width: 900px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .skill-col {
    flex: 0 0 50%;
    max-width: 50%;
  }
}
</style>