/**
 * request.js —— Axios 请求封装
 *
 * 所有页面都通过这个文件发请求，好处：
 * 1. 统一 baseURL 为 '/api'（配合 vite.config.js 的代理转发到后端 3000 端口）
 * 2. 统一设置超时时间和自动携带必要信息
 * 3. 响应拦截器统一解包：后端返回 { code, data, message }，这里直接返回 data 给你用
 * 4. 出错时统一弹出 Element Plus 的报错提示，页面代码更简洁
 */
import axios from 'axios'
import { ElMessage } from 'element-plus'

/**
 * 创建 axios 实例
 * baseURL 设为 '/api'，配合 Vite 代理，实际请求会到 http://localhost:3000/api/...
 */
const request = axios.create({
  baseURL: '/api',
  timeout: 10000 // 10 秒超时
})

/**
 * 响应拦截器：在页面拿到数据之前先统一处理
 * 成功（code === 0）：直接返回 data，页面里 request.get(...) 拿到的就是数据本体
 * 失败（code !== 0）：弹出错误提示，并返回一个 rejected 的 Promise
 */
request.interceptors.response.use(
  (response) => {
    // response.data 就是后端返回的 { code, data, message }
    if (response.data && response.data.code === 0) {
      return response.data.data // 只需要把业务数据返回给页面
    }
    // 业务错误：弹出后端给的中文提示
    ElMessage.error(response.data?.message || '请求失败')
    return Promise.reject(new Error(response.data?.message || '请求失败'))
  },
  (error) => {
    // HTTP 层面的错误（网络不通、超时、404 等）
    const msg = error.response?.data?.message || error.message || '网络错误，请检查后端服务是否已启动'
    ElMessage.error(msg)
    return Promise.reject(error)
  }
)

export default request