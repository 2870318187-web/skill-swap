/**
 * vite.config.js —— Vite 构建工具的配置文件
 *
 * 这里最关键的是 proxy（代理）配置：
 * 前端跑在 5173 端口，后端跑在 3000 端口。
 * 前端发请求时写 /api/xxx，Vite 会自动把请求转发到 http://localhost:3000/api/xxx，
 * 这样前端代码里就永远不需要写后端地址，也天然避开了跨域问题。
 */
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // 使用 Vue 插件，让 Vite 能编译 .vue 单文件组件
  plugins: [vue()],
  server: {
    port: 5173, // 前端开发服务器端口
    open: true, // 启动后自动在浏览器打开页面
    proxy: {
      // 所有以 /api 开头的请求都转发到后端 3000 端口
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true // 修改请求头里的 Host 字段，避免后端拒绝
      }
    }
  }
})