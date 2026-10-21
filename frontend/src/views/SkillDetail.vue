<!--
  SkillDetail.vue —— 技能详情页
  布局：左侧技能详情 + 评价区，右侧发布者信息卡片（含信用分） + TA 的其他技能
  数据来源：/api/skills/:id、/api/user/:id/skills、/api/skills/:id/reviews
-->
<template>
  <div class="detail-page page-container" v-loading="loading">
    <template v-if="skill">
      <el-row :gutter="20">
        <!-- ============ 左侧：技能详情 + 评价 ============ -->
        <el-col :span="16">
          <el-card class="detail-card" shadow="always">
            <!-- 顶部：类型标签 + 标题 -->
            <div class="detail-top">
              <el-tag :type="skill.type === 'provide' ? 'success' : 'warning'" effect="dark" size="large">
                {{ skill.type === 'provide' ? '我能教别人' : '我想学习' }}
              </el-tag>
              <h2 class="detail-title">{{ skill.title }}</h2>
            </div>

            <!-- 信息行：分类 / 难度 / 发布时间 -->
            <div class="detail-meta">
              <el-tag type="primary" effect="plain">{{ skill.category }}</el-tag>
              <el-tag type="info" effect="plain">{{ '难度：' + (skill.level || '入门') }}</el-tag>
              <el-tag type="info" effect="plain">{{ '发布于：' + formatTime(skill.created_at) }}</el-tag>
            </div>

            <!-- 分割线 -->
            <el-divider content-position="left">技能介绍</el-divider>

            <!-- 技能介绍正文：保留换行 -->
            <div class="detail-desc">{{ skill.description }}</div>

            <!-- 联系 TA 按钮 -->
            <div class="detail-action">
              <el-button type="primary" size="large" class="contact-btn" @click="contactTa">
                <el-icon><ChatDotRound /></el-icon>
                联系 TA
              </el-button>
            </div>

            <!-- ============ 评价区 ============ -->
            <el-divider content-position="left">技能评价（{{ reviews.length }}）</el-divider>

            <!-- 评价 TA 按钮：仅登录且非发布者可见 -->
            <div class="review-action" v-if="canReview">
              <el-button type="warning" plain @click="openReviewDialog">
                <el-icon><Star /></el-icon>评价 TA
              </el-button>
            </div>
            <div class="review-hint" v-else-if="!currentUser">
              <el-text type="info" size="small">登录后可以给 TA 评价</el-text>
            </div>

            <!-- 评价列表 -->
            <div v-if="reviews.length" class="review-list">
              <div v-for="r in reviews" :key="r.id" class="review-item">
                <el-avatar :size="38" :src="r.fromAvatar">{{ r.fromNickname?.charAt(0) }}</el-avatar>
                <div class="review-content">
                  <div class="review-top">
                    <span class="review-name">{{ r.fromNickname }}</span>
                    <el-rate :model-value="r.rating" disabled size="small" />
                    <span class="review-time">{{ formatTime(r.created_at) }}</span>
                  </div>
                  <div class="review-text">{{ r.content || '该用户未填写评价内容' }}</div>
                </div>
              </div>
            </div>
            <el-empty v-else description="还没有人评价，快来抢沙发" :image-size="60" />
          </el-card>
        </el-col>

        <!-- ============ 右侧：发布者信息 + 其他技能 ============ -->
        <el-col :span="8">
          <!-- 发布者信息卡 -->
          <el-card class="publisher-card" shadow="always">
            <div class="publisher-header">
              <el-avatar :size="64" :src="skill.avatar">{{ skill.nickname?.charAt(0) }}</el-avatar>
              <div class="publisher-info">
                <div class="publisher-name">{{ skill.nickname }}</div>
                <div class="publisher-stats">{{ skill.publisherSkillCount }} 条技能发布</div>
              </div>
            </div>
            <!-- 信用分展示：有评价显示星级，没评价显示"暂无评价" -->
            <div class="credit-row" v-if="skill.reviewCount > 0">
              <el-rate :model-value="skill.creditScore" disabled size="small" allow-half />
              <span class="credit-text">{{ skill.creditScore }} 分 · {{ skill.reviewCount }} 条评价</span>
            </div>
            <div class="credit-row" v-else>
              <span class="credit-text no-credit">暂无信用评价</span>
            </div>
            <!-- 发布者简介 -->
            <p class="publisher-bio text-ellipsis">{{ skill.bio || '这个人很懒，还没有填写简介～' }}</p>
            <!-- 按钮组 -->
            <div class="publisher-actions">
              <el-button size="small" @click="goProfile">查看主页</el-button>
              <el-button size="small" type="primary" plain @click="contactTa">发送消息</el-button>
            </div>
          </el-card>

          <!-- TA 的其他技能 -->
          <el-card class="other-card" shadow="always" v-if="otherSkills.length">
            <template #header>TA 的其他技能</template>
            <div
              v-for="item in otherSkills"
              :key="item.id"
              class="other-item"
              @click="goSkill(item.id)"
            >
              <el-tag size="small" :type="item.type === 'provide' ? 'success' : 'warning'" effect="light">
                {{ item.type === 'provide' ? '教' : '学' }}
              </el-tag>
              <span class="other-title text-ellipsis">{{ item.title }}</span>
              <el-icon class="other-arrow"><ArrowRight /></el-icon>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </template>

    <!-- ============ 评价弹窗 ============ -->
    <el-dialog v-model="reviewDialogVisible" title="评价 TA" width="480px" :close-on-click-modal="false">
      <el-form label-width="70px">
        <el-form-item label="评分">
          <el-rate
            v-model="reviewForm.rating"
            :texts="['很差', '较差', '一般', '满意', '很满意']"
            show-text
          />
        </el-form-item>
        <el-form-item label="评价">
          <el-input
            v-model="reviewForm.content"
            type="textarea"
            :rows="4"
            placeholder="说说这次技能交流的体验..."
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitReview">提交评价</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * 详情页逻辑：
 * 1. 根据路由参数 id 获取技能详情（含发布者信用分）
 * 2. 获取发布者的其他技能列表（排除当前这条）
 * 3. 获取该技能的所有评价（公开可见）
 * 4. 登录用户（非发布者）可以提交评价
 */
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ChatDotRound, ArrowRight, Star } from '@element-plus/icons-vue'
import request from '../request'
import { getCurrentUser } from '../auth'

const route = useRoute()
const router = useRouter()

// 当前登录用户（用于判断是否能评价；详情页不强制登录，所以可能为 null）
const currentUser = getCurrentUser()

const skill = ref(null)        // 当前技能详情（含 creditScore / reviewCount）
const otherSkills = ref([])    // 发布者的其他技能
const reviews = ref([])        // 该技能的评价列表
const loading = ref(false)     // 加载状态

// ---- 评价弹窗相关 ----
const reviewDialogVisible = ref(false)
const reviewForm = reactive({ rating: 5, content: '' }) // 评分默认 5 星
const submitting = ref(false)

// 是否可以评价：已登录 且 不是发布者本人
const canReview = computed(() => {
  return !!currentUser && !!skill.value && currentUser.id !== skill.value.user_id
})

/**
 * 时间戳格式化为 "xxxx年x月x日"
 */
function formatTime(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

/** 加载技能详情 + 其他技能 + 评价列表 */
async function fetchDetail() {
  loading.value = true
  try {
    // 获取技能详情（返回对象里带发布者信息 + 信用分）
    skill.value = await request.get(`/skills/${route.params.id}`)
    // 并行获取：发布者其他技能 + 该技能的评价
    const [data, reviewList] = await Promise.all([
      request.get(`/user/${skill.value.user_id}/skills`),
      request.get(`/skills/${route.params.id}/reviews`)
    ])
    otherSkills.value = [...data.provide, ...data.want].filter((s) => s.id !== skill.value.id)
    reviews.value = reviewList
  } catch (e) {
    skill.value = null
  } finally {
    loading.value = false
  }
}

/** 查看发布者主页 */
function goProfile() {
  router.push(`/profile/${skill.value.user_id}`)
}

/** 联系 TA：跳到消息中心并指定聊天对象 */
function contactTa() {
  const user = getCurrentUser()
  if (!user) {
    ElMessage.warning('请先登录再联系对方')
    return router.push({ path: '/login', query: { redirect: `/skill/${skill.value.id}` } })
  }
  router.push({ path: '/messages', query: { other: skill.value.user_id } })
}

/** 点击其他技能跳转到对应详情 */
function goSkill(id) {
  router.push(`/skill/${id}`)
}

/** 打开评价弹窗（重置表单） */
function openReviewDialog() {
  reviewForm.rating = 5
  reviewForm.content = ''
  reviewDialogVisible.value = true
}

/** 提交评价 */
async function submitReview() {
  if (!reviewForm.rating) {
    return ElMessage.warning('请选择评分')
  }
  submitting.value = true
  try {
    await request.post('/reviews', {
      skill_id: skill.value.id,
      from_user_id: currentUser.id,
      to_user_id: skill.value.user_id,
      rating: reviewForm.rating,
      content: reviewForm.content
    })
    ElMessage.success('评价成功，感谢你的反馈！')
    reviewDialogVisible.value = false
    // 重新加载技能详情（更新信用分）和评价列表
    skill.value = await request.get(`/skills/${route.params.id}`)
    reviews.value = await request.get(`/skills/${route.params.id}/reviews`)
  } catch (e) {
    /* 拦截器已提示 */
  } finally {
    submitting.value = false
  }
}

// 路由变化（比如从"其他技能"点进来 id 变了）时重新加载
watch(() => route.params.id, fetchDetail)
onMounted(fetchDetail)
</script>

<style scoped>
/* 技能详情主卡片 */
.detail-card {
  padding: 8px 16px;
}
.detail-top {
  display: flex;
  align-items: center;
  gap: 12px;
}
.detail-title {
  font-size: 24px;
  color: #303133;
  margin: 0;
}
/* 信息行：分类/难度/时间 */
.detail-meta {
  margin: 14px 0 0;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
/* 描述正文 */
.detail-desc {
  font-size: 15px;
  line-height: 1.9;
  color: #4a4a55;
  white-space: pre-wrap; /* 保留换行符 */
}
/* 联系按钮区域 */
.detail-action {
  margin-top: 30px;
  display: flex;
  justify-content: flex-end;
}
.contact-btn {
  background: linear-gradient(135deg, #ff9a56, #ff5e8a);
  border: none;
  font-weight: 600;
}
/* ---- 评价区 ---- */
.review-action {
  margin-bottom: 16px;
}
.review-hint {
  margin-bottom: 16px;
}
.review-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.review-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #f8f9fc;
  border-radius: 10px;
}
.review-content {
  flex: 1;
  min-width: 0;
}
.review-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.review-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}
.review-time {
  font-size: 12px;
  color: #c0c4cc;
  margin-left: auto;
}
.review-text {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}
/* ---- 发布者卡片 ---- */
.publisher-header {
  display: flex;
  align-items: center;
  gap: 14px;
}
.publisher-name {
  font-size: 17px;
  font-weight: 700;
}
.publisher-stats {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
/* 信用分行 */
.credit-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}
.credit-text {
  font-size: 12px;
  color: #909399;
}
.credit-text.no-credit {
  color: #c0c4cc;
}
.publisher-bio {
  margin-top: 14px;
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}
.publisher-actions {
  margin-top: 14px;
  display: flex;
  gap: 8px;
}
/* 其他技能卡片 */
.other-card {
  margin-top: 20px;
}
.other-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 4px;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s;
}
.other-item:hover {
  background: #f5f7ff;
}
.other-title {
  flex: 1;
  font-size: 14px;
  color: #303133;
}
.other-arrow {
  color: #c0c4cc;
  font-size: 13px;
}
</style>