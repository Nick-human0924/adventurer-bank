/**
 * 生产级重试工具 - 基于Claude Code架构
 * 8次指数退避 + splitmix64 jitter
 */

class RetryManager {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 8
    this.baseDelay = options.baseDelay || 1000
    this.maxDelay = options.maxDelay || 128000
    this.jitterEnabled = options.jitter !== false
    this.atomicCounter = 0
  }

  // splitmix64伪随机数生成器 - 比Math.random()更适合分布式环境
  splitmix64(seed) {
    let x = BigInt.asUintN(64, BigInt(seed) + BigInt(0x9E3779B97F4A7C15n))
    let z = x
    z = BigInt.asUintN(64, (z ^ (z >> BigInt(30))) * BigInt(0xBF58476D1CE4E5B9n))
    z = BigInt.asUintN(64, (z ^ (z >> BigInt(27))) * BigInt(0x94D049BB133111EBn))
    z = z ^ (z >> BigInt(31))
    return Number(z) / Number(BigInt(2) ** BigInt(64))
  }

  // 计算第n次重试的延迟时间（位移实现，高性能）
  calculateDelay(attempt) {
    // 指数退避: baseDelay * (2 ^ attempt)，但不超过maxDelay
    const base = Math.min(
      this.baseDelay * (1 << attempt),
      this.maxDelay
    )
    
    if (!this.jitterEnabled) return base

    // splitmix64 jitter: [0, base] 范围
    const seed = Date.now() * 1000000 + performance.now() + this.atomicCounter++
    const jitter = this.splitmix64(seed) * base
    return Math.floor(jitter)
  }

  // 判断错误是否可重试
  isRetryable(error) {
    if (!error) return false

    const retryableCodes = [
      // 网络错误
      'NETWORK_ERROR',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      // Supabase特定错误
      '57014', // 查询超时
      '40001', // 序列化失败
      '40P01', // 死锁
      '53300', // 连接过多
      '57030', // 锁等待超时
      // HTTP状态码
      408, // Request Timeout
      429, // Too Many Requests
      500, // Internal Server Error
      502, // Bad Gateway
      503, // Service Unavailable
      504, // Gateway Timeout
    ]

    // 检查错误代码
    if (error.code && retryableCodes.includes(error.code)) return true
    if (error.status && retryableCodes.includes(error.status)) return true
    
    // 检查错误消息
    const message = (error.message || '').toLowerCase()
    const retryablePatterns = [
      'timeout',
      'network',
      'connection',
      'temporarily',
      'rate limit',
      'too many requests',
      'service unavailable'
    ]
    return retryablePatterns.some(p => message.includes(p))
  }

  // 执行带重试的操作
  async execute(operation, options = {}) {
    const context = {
      attempt: 0,
      lastError: null,
      startTime: Date.now()
    }

    while (context.attempt <= this.maxRetries) {
      try {
        const result = await operation()
        
        // 成功时记录性能（如果开启了调试）
        if (options.onSuccess) {
          options.onSuccess({
            attempt: context.attempt,
            duration: Date.now() - context.startTime
          })
        }
        
        return { success: true, data: result, attempts: context.attempt }
      } catch (error) {
        context.lastError = error
        
        // 不可重试的错误直接抛出
        if (!this.isRetryable(error)) {
          return { 
            success: false, 
            error, 
            attempts: context.attempt,
            retryable: false 
          }
        }

        // 达到最大重试次数
        if (context.attempt >= this.maxRetries) {
          return { 
            success: false, 
            error, 
            attempts: context.attempt,
            exhausted: true 
          }
        }

        // 计算延迟
        const delay = this.calculateDelay(context.attempt)
        
        if (options.onRetry) {
          options.onRetry({
            attempt: context.attempt + 1,
            maxRetries: this.maxRetries,
            delay,
            error: error.message
          })
        }

        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, delay))
        context.attempt++
      }
    }

    return { 
      success: false, 
      error: context.lastError, 
      attempts: context.attempt 
    }
  }
}

// 单例实例
const defaultRetryManager = new RetryManager()

// 便捷函数
export async function withRetry(operation, options = {}) {
  const manager = options.manager || defaultRetryManager
  return manager.execute(operation, options)
}

// 关键操作专用配置
export const criticalOperationConfig = {
  maxRetries: 8,
  baseDelay: 1000,
  maxDelay: 128000,
  jitter: true
}

// 普通操作配置
export const normalOperationConfig = {
  maxRetries: 3,
  baseDelay: 500,
  maxDelay: 4000,
  jitter: true
}

// 创建带重试的Supabase操作
export function createRetryableOperation(operation, isCritical = false) {
  const config = isCritical ? criticalOperationConfig : normalOperationConfig
  const manager = new RetryManager(config)
  
  return async (...args) => {
    const result = await manager.execute(() => operation(...args), {
      onRetry: ({ attempt, maxRetries, delay, error }) => {
        console.log(`🔄 重试 ${attempt}/${maxRetries}，延迟 ${delay}ms: ${error}`)
      }
    })
    
    if (!result.success) {
      throw result.error
    }
    
    return result.data
  }
}

export { RetryManager }
