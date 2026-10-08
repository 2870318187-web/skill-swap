/**
 * main.js —— 前端应用入口文件
 *
 * 职责：
 * 1. 创建 Vue 应用实例
 * 2. 注册 Element Plus 组件库（并设置为中文界面）
 * 3. 注册全部 Element Plus 图标
 * 4. 挂载路由（App.vue 顶部的导航栏和页面切换全靠它）
 * 5. 引入全局样式 style.css
 */
import { createApp } from 'vue'                // Vue 3 的创建应用函数
import ElementPlus from 'element-plus'          // Element Plus 组件库
import 'element-plus/dist/index.css'            // Element Plus 的样式文件
import * as ElementPlusIconsVue from '@element-plus/icons-vue' // 全部图标
import zhCn from 'element-plus/es/locale/lang/zh-cn'          // 中文语言包
import App from './App.vue'                     // 根组件
import router from './router'                   // 路由配置
import './style.css'                            // 我们自己写的全局样式

// 创建 Vue 应用
const app = createApp(App)

// 把全部图标注册为全局组件，这样模板里可以直接写 <el-icon><Search /></el-icon>
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 使用 Element Plus（并指定中文语言包，弹窗、分页等内置文字都会变成中文）
app.use(ElementPlus, { locale: zhCn })

// 使用路由
app.use(router)

// 把应用挂载到 index.html 里的 #app 元素上
app.mount('#app')