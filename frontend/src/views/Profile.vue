<!--
  Profile.vue —— 个人中心页
  - 通过路由参数 /profile/:id 判断查看的是自己还是别人
  - 左侧：头像、昵称、简介、统计（提供技能数 / 想学技能数）
  - 右侧：Tab 切换「提供的技能 / 想学的技能」，点击卡片跳详情
  - 自己 → "编辑资料"按钮（弹窗改昵称/简介）；别人 → "发送消息"按钮
-->

<template>
  <div class="profile-page page-container" v-loading="loading">
    <template v-if="profile">
      <el-row :gutter="20">
        <!-- ============ 左侧：用户信息 ============ -->
        <el-col :span="7">
          <el-card class="info-card" shadow="always">
            <!-- 头像 + 昵称 -->
            <div class="profile-header">
              <el-avatar :size="84" :src="profile.avatar">{{ profile.nickname?.charAt(0) }}</el-avatar>
              <div class="profile-name">{{ profile.nickname }}</div>
              <div class="profile-username">@{{ profile.username }}</div>
            </div>
            <!-- 简介 -->
            <p class="profile-bio">{{ profile.bio }}</p>
            <!-- 统计：提供/求学的技能数量 -->
            <div class="profile-stats">
              <div class="stat-item">
                <div class="stat-num" style="color:#4f7cff">{{ stats.provide.length }}</div>
                <div class="stat-label">提供技能</div>
              </div>
              <div class="stat-item">
                <div class="stat-num" style="color:#f5a623">{{ stats.want.length }}</div>
                <div class="stat-label">求学技能</div>
              </div>
            </div>
            <!-- 操作按钮：自己=编辑资料，别人=发送消息 -->
            <div class="profile-actions">
              <template v-if="isSelf">
                <el-button type="primary" class="action-btn" @click="openEditDialog">
                  <el-icon><EditPen /></el-icon>编辑资料
                </el-button>
              </template>
              <template v-else>
                <el-button type="primary" class="action-btn" @click="sendMessage">
                  <el-icon><ChatDotRound /></el-icon>发送消息
                </el-button>
              </template>
            </div>
          </el-card>
        </el-col>

        <!-- ============ 右侧：技能列表 ============ -->
        <el-col :span="17">
          <el-card class="skills-card" shadow="always">
            <el-tabs v-model="activeTab">
              <!-- Tab 1：提供的技能 -->
              <el-tab-pane :label="`提供的技能 (${stats.provide.length})`" name="provide">
                <div v-if="stats.provide.length" class="skill-list">
                  <div
                    v-for="item in stats.provide"
                    :key="item.id"
                    class="skill-item"
                    @click="goDetail(item.id)"
                  >
                    <div class="skill-item-main">
                      <div class="skill-item-title">{{ item.title }}</div>
                      <div class="skill-item-desc text-ellipsis">{{ item.description }}</div>
                    </div>
                    <el-tag type="info" effect="plain" size="small">{{ item.category }}</el-tag>
                    <!-- 是自己的页面才显示删除按钮 -->
                    <el-button
                      v-if="isSelf"
                      type="danger"
                      text
                      size="small"
                      class="delete-btn"
                      @click.stop="deleteSkill(item.id)"
                    >
                      删除
                    </el-button>
                  </div>
                </div>
                <el-empty v-else description="还没有发布过技能，快去发布吧！">
                  <el-button v-if="isSelf" type="primary" @click="$router.push('/publish')">去发布</el-button>
                </el-empty>
              </el-tab-pane>

              <!-- Tab 2：想学的技能 -->
              <el-tab-pane :label="`想学的技能 (${stats.want.length})`" name="want">
                <div v-if="stats.want.length" class="skill-list">
                  <div
                    v-for="item in stats.want"
                    :key="item.id"
                    class="skill-item"
                    @click="goDetail(item.id)"
                  >
                    <div class="skill-item-main">
                      <div class="skill-item-title">{{ item.title }}</div>
                      <div class="skill-item-desc text-ellipsis">{{ item.description }}</div>
                    </div>
                    <el-tag type="info" effect="plain" size="small">{{ item.category }}</el-tag>
                    <el-button
                      v-if="isSelf"
                      type="danger"
                      text
                      size="small"
                      class="delete-btn"
                      @click.stop="deleteSkill(item.id)"
                    >
                      删除
                    </el-button>
                  </div>
                </div>
                <el-empty v-else description="还没有填写想学的技能">
                  <el-button v-if="isSelf" type="primary" @click="$router.push('/publish')">去发布</el-button>
                </el-empty>
              </el-tab-pane>
            </el-tabs>
          </el-card>
        </el-col>
      </el-row>
    </template>

    <!-- ============ 编辑资料弹窗 ============ -->
    <el-dialog v-model="editDialogVisible" title="编辑资料" width="480px" :close-on-click-modal="false">
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="70px">
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="editForm.nickname" placeholder="请输入昵称" maxlength="20" show-word-limit />
        </el-form-item>
        <el-form-item label="简介" prop="bio">
          <el-input v-model="editForm.bio" type="textarea" :rows="4" placeholder="介绍一下你自己吧" maxlength="200" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveProfile">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * 个人中心逻辑：
 * 1. 根据路由参数决定查看谁（无参数 = 查看自己）
 * 2. 并行请求用户信息 + 他的技能列表
 * 3. isSelf 计算属性判断是否本人，控制按钮显示
 */
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { EditPen, ChatDotRound } from '@element-plus/icons-vue'
import request from '../request'
import { getCurrentUser, setCurrentUser } from '../auth'

const route = useRoute()
const router = useRouter()

// ---- 数据 ----
const profile = ref(null)          // 当前展示的用户信息
const stats = ref({ provide: [], want: [] }) // 该用户的技能（已分组）
const loading = ref(false)          // 加载状态
const activeTab = ref('provide')    // Tab 默认显示"提供的技能"
const isSelf = computed(() => {     // 是否查看自己的主页
  return !!getCurrentUser() && getCurrentUser().id === profile.value?.id
})

// ---- 编辑资料弹窗 ----
const editDialogVisible = ref(false)
const editForm = reactive({ nickname: '', bio: '' })
const editRules = {
  nickname: [{ required: true, message: '昵称不能为空', trigger: 'blur' }]
}
const editFormRef = ref(null)
const saving = ref(false)

/** 加载用户资料和他的技能 */
async function fetchProfile(userId) {
  loading.value = true
  try {
    // 两个请求并行发出
    const [user, skillData] = await Promise.all([
      request.get(`/user/${userId}`),
      request.get(`/user/${userId}/skills`)
    ])
    profile.value = user
    stats.value = skillData
  } catch (e) {
    profile.value = null
  } finally {
    loading.value = false
  }
}

/** 打开编辑资料弹窗（先填充当前值） */
function openEditDialog() {
  editForm.nickname = profile.value.nickname
  editForm.bio = profile.value.bio || ''
  editDialogVisible.value = true
}

/** 保存修改后的资料 */
async function saveProfile() {
  const valid = await editFormRef.value.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    const updated = await request.put(`/user/${profile.value.id}`, {
      nickname: editForm.nickname,
      bio: editForm.bio
    })
    // 更新本地展示
    profile.value = updated
    // 如果是自己，顺手更新 localStorage 里的用户信息（导航栏昵称会跟着变）
    if (isSelf.value) setCurrentUser(updated)
    editDialogVisible.value = false
    ElMessage.success('资料更新成功')
  } catch (e) {
    /* 拦截器已提示 */
  } finally {
    saving.value = false
  }
}

/** 点击技能卡片跳详情 */
function goDetail(id) {
  router.push(`/skill/${id}`)
}

/** 删除自己的技能（有二次确认） */
async function deleteSkill(id) {
  try {
    await ElMessageBox.confirm('确定要删除这条技能吗？删除后不可恢复。', '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
  } catch (e) {
    return // 用户点了取消
  }
  try {
    await request.delete(`/skills/${id}`, { params: { user_id: getCurrentUser().id } })
    ElMessage.success('删除成功')
    fetchProfile(profile.value.id) // 重新加载列表
  } catch (e) {
    /* 拦截器已提示 */
  }
}

/** 查看别人主页时：跳转到消息中心并发起对话 */
function sendMessage() {
  const user = getCurrentUser()
  if (!user) {
    ElMessage.warning('请先登录')
    return router.push({ path: '/login', query: { redirect: `/profile/${profile.value.id}` } })
  }
  router.push({ path: '/messages', query: { other: profile.value.id } })
}

// 路由 id 变化时重新加载（比如从"消息中心"切到别人的主页）
watch(() => route.params.id, (newId) => {
  // 无参或路由变化就重新拉取
  fetchProfile(newId || getCurrentUser()?.id)
})
onMounted(() => {
  // 路由参数没 id 就表示查看自己的主页；如果没有登录，路由守卫会拦到登录页
  fetchProfile(route.params.id || getCurrentUser()?.id)
})
</script>

<style scoped>
/* 左侧用户信息卡 */
.info-card {
  text-align: center;
  padding: 16px 8px;
}
.profile-header {
  margin-bottom: 10px;
}
.profile-name {
  font-size: 20px;
  font-weight: 700;
  margin-top: 12px;
}
.profile-username {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
.profile-bio {
  font-size: 13px;
  color: #606266;
  line-height: 1.7;
  padding: 10px 6px;
  background: #f8f9fc;
  border-radius: 8px;
  min-height: 60px;
  margin: 10px 0;
}
/* 统计区：两个数字并列 */
.profile-stats {
  display: flex;
  border-top: 1px solid #f0f0f5;
  padding-top: 14px;
  margin-bottom: 14px;
}
.stat-item {
  flex: 1;
}
.stat-num {
  font-size: 24px;
  font-weight: 800;
}
.stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
/* 操作按钮 */
.profile-actions .action-btn {
  width: 100%;
}
/* 右侧技能列表 */
.skills-card {
  min-height: 400px;
  padding: 4px 12px;
}
.skill-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid #f5f6fa;
}
.skill-item:hover {
  background: #f5f7ff;
}
.skill-item-main {
  flex: 1;
  min-width: 0;
}
.skill-item-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}
.skill-item-desc {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
.delete-btn {
  color: #f56c6c;
}
</style>