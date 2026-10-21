<!--
  Match.vue —— 智能匹配页
  - 顶部：标题 + 类型切换（找老师 / 找学生）
  - 匹配结果卡片：一行 2 个，右上角圆形匹配度徽章（前三名金/银/铜色）
  - 卡片内容：对方头像、昵称、技能标题、描述、分类
  - 操作：查看主页、联系 TA
  - 数据来源：/api/ai/match（后端根据分类和关键词重合度计算匹配分数）
-->
<template>
  <div class="match-page page-container" v-loading="loading">
    <!-- 顶部标题区 -->
    <div class="match-header">
      <h2>智能匹配</h2>
      <p>根据你的技能分类和关键词，为你推荐最合适的学习伙伴</p>
      <!-- 类型切换：找老师 / 找学生 -->
      <el-radio-group v-model="matchType" size="large" @change="fetchMatch">
        <el-radio-button value="teacher">👩‍🏫 找老师（我求学）</el-radio-button>
        <el-radio-button value="student">👨‍🎓 找学生（我教学）</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 匹配结果卡片列表 -->
    <el-row v-if="results.length" :gutter="20" class="match-list">
      <!-- span=12：一行 2 个 -->
      <el-col v-for="(item, index) in results" :key="item.matchedSkill.id" :span="12">
        <el-card class="match-card" shadow="hover">
          <!-- 匹配度徽章：圆形，前三名金/银/铜，其他蓝 -->
          <div class="score-badge" :class="badgeClass(index)">
            <div class="score-num">{{ item.score }}</div>
            <div class="score-label">匹配度</div>
          </div>

          <!-- 对方信息 -->
          <div class="match-user">
            <el-avatar :size="52" :src="item.other.avatar">{{ item.other.nickname?.charAt(0) }}</el-avatar>
            <div class="match-user-info">
              <div class="match-name">{{ item.other.nickname }}</div>
              <div class="match-credit" v-if="item.other.reviewCount > 0">
                <el-rate :model-value="item.other.creditScore" disabled size="small" allow-half />
                <span class="match-credit-text">{{ item.other.creditScore }}分 · {{ item.other.reviewCount }}评</span>
              </div>
              <div class="match-skill">
                <el-tag size="small" :type="item.matchedSkill.type === 'provide' ? 'success' : 'warning'" effect="light">
                  {{ item.matchedSkill.type === 'provide' ? '提供教学' : '想学技能' }}
                </el-tag>
                <span class="match-skill-title">「{{ item.matchedSkill.title }}」</span>
              </div>
            </div>
          </div>

          <!-- 匹配说明：我的技能和对方技能 -->
          <div class="match-reason">
            <div class="reason-item">
              <span class="reason-tag mine">我的</span>
              <span class="reason-text text-ellipsis">{{ item.mySkill.title }}</span>
            </div>
            <div class="reason-arrow"><el-icon><Right /></el-icon></div>
            <div class="reason-item">
              <span class="reason-tag theirs">TA 的</span>
              <span class="reason-text text-ellipsis">{{ item.matchedSkill.title }}</span>
            </div>
          </div>

          <!-- 对方技能描述 -->
          <p class="match-desc">{{ item.matchedSkill.description }}</p>

          <!-- 底部操作按钮 -->
          <div class="match-actions">
            <el-button size="small" @click="goProfile(item.other.id)">查看主页</el-button>
            <el-button size="small" type="primary" @click="contactTa(item.other.id)">联系 TA</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 空状态 -->
    <el-empty v-else-if="!loading" description="还没有找到合适的伙伴，先去发布几条技能吧！">
      <el-button type="primary" @click="$router.push('/publish')">去发布技能</el-button>
    </el-empty>
  </div>
</template>

<script setup>
/**
 * 智能匹配逻辑：
 * 1. 根据当前 matchType 调用 /api/ai/match
 * 2. 根据后端计算出来的 score 渲染卡片
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Right } from '@element-plus/icons-vue'
import request from '../request'
import { getCurrentUser } from '../auth'

const router = useRouter()

const matchType = ref('teacher') // 默认找老师
const results = ref([])          // 匹配结果列表
const loading = ref(false)       // 加载状态

/** 判断徽章颜色：前三名依次为金、银、铜 */
function badgeClass(index) {
  if (index === 0) return 'gold'
  if (index === 1) return 'silver'
  if (index === 2) return 'bronze'
  return 'normal' // 第 4 名及以后用默认蓝色
}

/** 请求智能匹配接口 */
async function fetchMatch() {
  loading.value = true
  try {
    results.value = await request.post('/ai/match', {
      userId: getCurrentUser().id,
      matchType: matchType.value
    })
  } catch (e) {
    results.value = []
  } finally {
    loading.value = false
  }
}

/** 查看对方主页 */
function goProfile(id) {
  router.push(`/profile/${id}`)
}

/** 联系 TA：跳消息中心并指定会话对象 */
function contactTa(id) {
  router.push({ path: '/messages', query: { other: id } })
}

// 页面加载时自动请求一次
onMounted(fetchMatch)
</script>

<style scoped>
/* 标题区 */
.match-header {
  text-align: center;
  margin-bottom: 28px;
}
.match-header h2 {
  font-size: 28px;
}
.match-header p {
  color: #909399;
  margin: 10px 0 18px;
  font-size: 14px;
}
/* 匹配卡片 */
.match-card {
  position: relative;
  margin-bottom: 20px;
  padding: 10px 14px;
}
/* 匹配度圆形徽章（右上角绝对定位） */
.score-badge {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
}
/* 第 1 名：金色 */
.score-badge.gold {
  background: linear-gradient(135deg, #ffd86b, #ffaa00);
}
/* 第 2 名：银色 */
.score-badge.silver {
  background: linear-gradient(135deg, #e8ecf1, #a8b0bb);
}
/* 第 3 名：铜色 */
.score-badge.bronze {
  background: linear-gradient(135deg, #f0b186, #c97a3d);
}
/* 其他：主题蓝 */
.score-badge.normal {
  background: linear-gradient(135deg, #5f8bff, #4f7cff);
}
.score-num {
  font-size: 18px;
  line-height: 1;
}
.score-label {
  font-size: 10px;
  margin-top: 3px;
  opacity: 0.85;
}
/* 对方用户信息区（右侧给徽章留出空间） */
.match-user {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-right: 60px;
}
.match-name {
  font-size: 17px;
  font-weight: 700;
}
/* 信用分行 */
.match-credit {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}
.match-credit-text {
  font-size: 12px;
  color: #909399;
}
.match-skill {
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.match-skill-title {
  font-size: 13px;
  color: #606266;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
/* 匹配原因区：我的技能 与 TA 的技能 */
.match-reason {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 14px 0 10px;
  background: #f8f9fc;
  border-radius: 8px;
  padding: 10px 12px;
}
.reason-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.reason-tag {
  flex-shrink: 0;
  font-size: 10px;
  padding: 1px 8px;
  border-radius: 4px;
  color: #fff;
}
.reason-tag.mine {
  background: #4f7cff;
}
.reason-tag.theirs {
  background: #ff9a56;
}
.reason-text {
  font-size: 13px;
  color: #303133;
}
.reason-arrow {
  color: #c0c4cc;
}
/* 描述 */
.match-desc {
  font-size: 13px;
  color: #909399;
  line-height: 1.7;
  height: 42px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  margin-bottom: 12px;
}
/* 操作按钮 */
.match-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>