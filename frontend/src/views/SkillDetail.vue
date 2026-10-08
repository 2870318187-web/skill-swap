<!--
  SkillDetail.vue —— 技能详情页
  布局：左侧技能详情，右侧发布者信息卡片 + TA 的其他技能
  数据来源：/api/skills/:id、/api/user/:id/skills
-->
<template>
  <div class="detail-page page-container" v-loading="loading">
    <template v-if="skill">
      <el-row :gutter="20">
        <!-- ============ 左侧：技能详情 ============ -->
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
  </div>
</template>

<script setup>
/**
 * 详情页逻辑：
 * 1. 根据路由参数 id 获取技能详情
 * 2. 顺带获取发布者的其他技能列表（排除当前这条）
 * 3. "联系 TA" 跳到消息中心，并通过 query 指定聊天对象
 */
import { ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ChatDotRound, ArrowRight } from '@element-plus/icons-vue'
import request from '../request'
import { getCurrentUser } from '../auth'

const route = useRoute()
const router = useRouter()

const skill = ref(null)        // 当前技能详情
const otherSkills = ref([])    // 发布者的其他技能
const loading = ref(false)     // 加载状态

/**
 * 时间戳格式化为 "xxxx年x月x日"
 */
function formatTime(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

/** 加载技能详情 + 其他技能 */
async function fetchDetail() {
  loading.value = true
  try {
    // 获取技能详情（返回对象里带发布者信息和无密码的发布者字段）
    skill.value = await request.get(`/skills/${route.params.id}`)
    // 获取发布者所有技能，去掉当前这条
    const data = await request.get(`/user/${skill.value.user_id}/skills`)
    otherSkills.value = [...data.provide, ...data.want].filter((s) => s.id !== skill.value.id)
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
/* 发布者卡片 */
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