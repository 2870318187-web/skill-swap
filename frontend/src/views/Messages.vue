<!--
  Messages.vue —— 消息中心页
  布局：左右两栏
  - 左侧：会话列表（头像、昵称、最后一条消息、未读红点）
  - 右侧：聊天窗口（头部对方信息、消息气泡列表、底部输入框）
  消息气泡：对方消息靠左白色，自己的消息靠右蓝色
  支持从其他页面带着 ?other=用户id 跳进来直接打开和某人的会话
-->
<template>
  <div class="messages-page page-container">
    <el-card class="chat-card" shadow="always" :body-style="{ padding: '0' }">
      <div class="chat-layout">
        <!-- ============ 左侧：会话列表 ============ -->
        <div class="conversation-list">
          <div class="list-header">
            <el-icon><ChatDotRound /></el-icon>
            <span>消息列表</span>
          </div>
          <!-- 会话项循环 -->
          <div
            v-for="conv in conversations"
            :key="conv.other.id"
            class="conversation-item"
            :class="{ active: currentOther?.id === conv.other.id }"
            @click="openConversation(conv.other.id)"
          >
            <el-avatar :size="44" :src="conv.other.avatar">{{ conv.other.nickname?.charAt(0) }}</el-avatar>
            <div class="conv-info">
              <div class="conv-name">
                {{ conv.other.nickname }}
                <!-- 未读消息红点 -->
                <span v-if="conv.unreadCount > 0" class="unread-badge">{{ conv.unreadCount }}</span>
              </div>
              <div class="conv-last text-ellipsis">{{ conv.lastMessage.content }}</div>
            </div>
          </div>
          <!-- 空状态 -->
          <el-empty v-if="!conversations.length" description="暂无会话" :image-size="70" />
        </div>

        <!-- ============ 右侧：聊天窗口 ============ -->
        <div class="chat-window">
          <!-- 没有选择会话时的占位 -->
          <div v-if="!currentOther" class="chat-empty">
            <el-icon :size="60" color="#c0c4cc"><ChatLineRound /></el-icon>
            <p>选择一个会话，开始交流吧～</p>
          </div>

          <template v-else>
            <!-- 聊天头部：对方信息 -->
            <div class="chat-header">
              <el-avatar :size="38" :src="currentOther.avatar">{{ currentOther.nickname?.charAt(0) }}</el-avatar>
              <div class="chat-header-info">
                <div class="chat-header-name">{{ currentOther.nickname }}</div>
                <div class="chat-header-bio text-ellipsis">{{ currentOther.bio }}</div>
              </div>
              <el-button size="small" plain @click="$router.push(`/profile/${currentOther.id}`)">
                查看主页
              </el-button>
            </div>

            <!-- 消息列表区：自动滚动到底部 -->
            <div ref="msgBodyRef" class="message-body">
              <div
                v-for="msg in messages"
                :key="msg.id"
                class="message-row"
                :class="msg.from_user_id === myId ? 'my' : 'other'"
              >
                <!-- 头像（对方才显示，自己的消息里头像可省略） -->
                <el-avatar v-if="msg.from_user_id !== myId" :size="34" :src="currentOther.avatar" />
                <div class="bubble-area">
                  <div class="bubble">{{ msg.content }}</div>
                  <div class="bubble-time">{{ formatTime(msg.created_at) }}</div>
                </div>
                <el-avatar v-if="msg.from_user_id === myId" :size="34" :src="myInfo.avatar" />
              </div>
            </div>

            <!-- 底部输入框 -->
            <div class="chat-input-area">
              <el-input
                v-model="draft"
                type="textarea"
                :rows="2"
                resize="none"
                placeholder="输入消息，按 Enter 发送（Shift+Enter 换行）"
                @keydown.enter.exact.prevent="sendMessage"
              />
              <el-button type="primary" class="send-btn" :disabled="!draft.trim()" @click="sendMessage">
                发送
              </el-button>
            </div>
          </template>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
/**
 * 消息中心逻辑：
 * 1. 进入页面：加载会话列表；如果 URL 里有 ?other=xx，自动打开和该用户的会话
 * 2. 点会话：加载聊天记录（同时后端会把对方发来的未读消息标记成已读）
 * 3. 发送：调 /api/messages 接口，成功后把消息追加到列表并重新刷新会话列表
 */
import { ref, nextTick, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ChatDotRound, ChatLineRound } from '@element-plus/icons-vue'
import request from '../request'
import { getCurrentUser } from '../auth'

const route = useRoute()

// 当前登录用户信息（用于渲染"自己"的头像）
const myInfo = ref(getCurrentUser())
const myId = myInfo.value?.id

const conversations = ref([])  // 会话列表
const currentOther = ref(null) // 当前正在聊天的对方用户
const messages = ref([])       // 当前会话的消息列表
const draft = ref('')          // 输入框草稿
const msgBodyRef = ref(null)   // 消息列表 DOM 引用，用于滚动到最底部

/** 时间格式化为 "x月x日 xx:xx" */
function formatTime(iso) {
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 加载会话列表 */
async function fetchConversations() {
  try {
    conversations.value = await request.get(`/conversations/${myId}`)
  } catch (e) {
    conversations.value = []
  }
}

/** 打开某个用户的会话：加载聊天记录 + 标记已读 + 刷新会话列表 */
async function openConversation(otherId) {
  try {
    // 拉取聊天记录（后端会顺手把对方发我的未读标记为已读）
    messages.value = await request.get(`/messages/${myId}/${otherId}`)
    // 查找并设置对方用户信息（从会话列表里找，找不到说明没有历史会话）
    const conv = conversations.value.find((c) => c.other.id === otherId)
    currentOther.value = conv ? conv.other : { id: otherId, nickname: '未知用户', avatar: '', bio: '' }
    // 如果没有会话记录，尝试直接拉用户信息补充
    if (!conv) {
      try {
        currentOther.value = await request.get(`/user/${otherId}`)
      } catch (e) {
        /* 忽略 */
      }
    }
    // 标记已读后重新拉会话列表（未读数会归零）
    fetchConversations()
    // 等 DOM 更新后滚动到底部
    scrollToBottom()
  } catch (e) {
    /* 拦截器已提示 */
  }
}

/** 发送消息 */
async function sendMessage() {
  const content = draft.value.trim()
  if (!content) return
  try {
    // 调用发送接口
    await request.post('/messages', {
      from_user_id: myId,
      to_user_id: currentOther.value.id,
      content
    })
    draft.value = '' // 清空输入框
    // 重新拉取聊天记录 + 刷新会话列表
    await openConversation(currentOther.value.id)
  } catch (e) {
    /* 拦截器已提示 */
  }
}

/** 滚动消息列表到底部（聊天窗口的最新消息） */
function scrollToBottom() {
  nextTick(() => {
    if (msgBodyRef.value) {
      msgBodyRef.value.scrollTop = msgBodyRef.value.scrollHeight
    }
  })
}

/**
 * 监听 URL 里的 other 参数变化（比如从详情页"联系 TA"跳过来，或匹配页"联系 TA"跳过来）
 */
watch(
  () => route.query.other,
  (val) => {
    if (val) openConversation(val)
  }
)

// 页面创建后：加载会话列表；如果没有指定会话对象，默认选中第一个
onMounted(async () => {
  await fetchConversations()
  const other = route.query.other
  if (other) {
    openConversation(other)
  } else if (conversations.value.length) {
    openConversation(conversations.value[0].other.id)
  }
})

// 定时器：每 5 秒刷新一次会话列表，模拟"新消息提醒"（真实项目可用 WebSocket 推送）
let timer = null
onMounted(() => {
  timer = setInterval(() => {
    // 有会话时才刷新（避免多余请求）
    if (conversations.value.length) fetchConversations()
  }, 5000)
})
// 组件卸载时清理定时器，避免内存泄漏

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
/* 整卡去掉内边距，让左右两栏撑满 */
.chat-card {
  height: calc(100vh - 130px);
  overflow: hidden;
}
.chat-layout {
  display: flex;
  height: 100%;
}
/* ---- 左侧会话列表：固定宽度 300px，可纵向滚动 ---- */
.conversation-list {
  width: 300px;
  border-right: 1px solid #f0f0f5;
  overflow-y: auto;
  background: #fafbff;
}
.list-header {
  padding: 16px 18px;
  font-weight: 700;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 6px;
  border-bottom: 1px solid #f0f0f5;
  position: sticky;
  top: 0;
  background: #fafbff;
  z-index: 1;
}
.conversation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid #f7f8fb;
}
.conversation-item:hover {
  background: #f0f3ff;
}
.conversation-item.active {
  background: #e8eeff;
}
.conv-info {
  flex: 1;
  min-width: 0;
}
.conv-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 6px;
}
/* 未读红点 */
.unread-badge {
  background: #f56c6c;
  color: #fff;
  font-size: 11px;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
}
.conv-last {
  font-size: 12px;
  color: #909399;
  margin-top: 3px;
}
/* ---- 右侧聊天窗口 ---- */
.chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.chat-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
  gap: 12px;
}
.chat-empty p {
  font-size: 14px;
}
.chat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid #f0f0f5;
}
.chat-header-info {
  flex: 1;
  min-width: 0;
}
.chat-header-name {
  font-weight: 600;
  font-size: 15px;
}
.chat-header-bio {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}
/* 消息列表区：弹性撑满并滚动 */
.message-body {
  flex: 1;
  overflow-y: auto;
  padding: 18px 20px;
  background: #f7f8fb;
}
/* 单条消息行：flex 排列气泡和头像 */
.message-row {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  align-items: flex-start;
}
/* 自己的消息：翻转排列，头像在右 */
.message-row.my {
  flex-direction: row-reverse;
}
.bubble-area {
  max-width: 60%;
  display: flex;
  flex-direction: column;
}
.message-row.my .bubble-area {
  align-items: flex-end; /* 自己这边气泡靠右 */
}
/* 气泡本体 */
.bubble {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}
/* 对方消息：白底 */
.message-row.other .bubble {
  background: #fff;
  color: #303133;
  border-top-left-radius: 4px;
}
/* 自己消息：蓝色渐变，白字 */
.message-row.my .bubble {
  background: linear-gradient(135deg, #4f7cff, #6a5cff);
  color: #fff;
  border-top-right-radius: 4px;
}
.bubble-time {
  font-size: 11px;
  color: #b0b4c0;
  margin-top: 4px;
}
/* 底部输入区 */
.chat-input-area {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid #f0f0f5;
  background: #fff;
}
.chat-input-area .el-input {
  flex: 1;
}
.send-btn {
  min-width: 90px;
  height: 56px;
}
</style>