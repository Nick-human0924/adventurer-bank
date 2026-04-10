import { createClient } from '@supabase/supabase-js'
import { ref } from 'vue'
import { withRetry, criticalOperationConfig } from './retry-utils.js'
import { offlineQueue } from './offline-queue.js'

// Supabase 配置
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://agkemugaxrhrsnbyiluw.supabase.co'
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjEzNTIsImV4cCI6MjA5OTYzNzM1Mn0.eGg3eo7PLrgcjHfLeOW5vq7ElMQbGT2I4RPpxmPdLUo'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// 当前用户状态
export const currentUser = ref(null)

// 数据库连接状态
export const dbStatus = ref({
  connected: false,
  checking: true,
  tablesExist: {
    children: false,
    rules: false,
    transactions: false
  },
  error: null,
  offlineMode: false
})

// 获取当前用户（带重试）
export async function getCurrentUser() {
  const result = await withRetry(
    async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      return user
    },
    {
      ...criticalOperationConfig,
      onRetry: ({ attempt, delay, error }) => {
        console.log(`🔄 获取用户重试 ${attempt}/8，延迟 ${delay}ms`)
      }
    }
  )
  
  if (result.success) {
    currentUser.value = result.data
    return result.data
  }
  throw result.error
}

// 检查表是否存在（带重试）
async function checkTable(tableName) {
  return withRetry(
    async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)
      
      if (error) {
        if (error.code === '42P01') {
          return { exists: false, error: 'TABLE_NOT_FOUND' }
        }
        throw error
      }
      
      return { exists: true, error: null }
    },
    {
      maxRetries: 3,
      baseDelay: 500,
      onRetry: ({ attempt }) => {
        console.log(`🔄 检查表 ${tableName} 重试 ${attempt}/3`)
      }
    }
  )
}

// 初始化数据库检查（带重试）
export async function initDatabase() {
  console.log('🔍 正在检查数据库连接...')
  dbStatus.value.checking = true

  try {
    // 获取当前用户（带重试）
    await getCurrentUser()

    // 并行检查各个表（提速3倍）
    const [childrenCheck, rulesCheck, transactionsCheck] = await Promise.all([
      checkTable('children'),
      checkTable('rules'),
      checkTable('transactions')
    ])

    dbStatus.value.tablesExist.children = childrenCheck.success && childrenCheck.data.exists
    dbStatus.value.tablesExist.rules = rulesCheck.success && rulesCheck.data.exists
    dbStatus.value.tablesExist.transactions = transactionsCheck.success && transactionsCheck.data.exists

    const allTablesExist = dbStatus.value.tablesExist.children && 
                          dbStatus.value.tablesExist.rules && 
                          dbStatus.value.tablesExist.transactions

    if (allTablesExist) {
      dbStatus.value.connected = true
      dbStatus.value.error = null
      dbStatus.value.offlineMode = false
      console.log('✅ 数据库连接成功')
      
      // 连接成功后，同步离线队列
      await offlineQueue.syncPendingOperations()
    } else {
      dbStatus.value.connected = false
      dbStatus.value.error = 'MISSING_TABLES'
      console.error('❌ 数据库连接失败：部分表不存在')
    }

    dbStatus.value.checking = false
    return { success: allTablesExist, status: dbStatus.value }
  } catch (error) {
    dbStatus.value.connected = false
    dbStatus.value.error = error.message || 'UNKNOWN_ERROR'
    dbStatus.value.checking = false
    console.error('❌ 数据库初始化错误:', error)
    return { success: false, error: error.message, status: dbStatus.value }
  }
}

// 带重试的查询封装
export async function queryWithRetry(table, queryBuilder, isCritical = false) {
  const config = isCritical ? criticalOperationConfig : { maxRetries: 3, baseDelay: 500 }
  
  const result = await withRetry(
    async () => {
      const query = queryBuilder(supabase.from(table))
      const { data, error } = await query
      if (error) throw error
      return data
    },
    {
      ...config,
      onRetry: ({ attempt, delay, error }) => {
        console.log(`🔄 查询 ${table} 重试 ${attempt}/${config.maxRetries}: ${error}`)
      }
    }
  )
  
  if (result.success) {
    return result.data
  }
  throw result.error
}

// 带重试的插入封装（关键操作）
export async function insertWithRetry(table, data, isCritical = true) {
  const user = currentUser.value
  if (!user) throw new Error('未登录')
  
  const record = { ...data, user_id: user.id }
  
  const result = await withRetry(
    async () => {
      const { data: result, error } = await supabase
        .from(table)
        .insert(record)
        .select()
      if (error) throw error
      return result
    },
    {
      ...(isCritical ? criticalOperationConfig : { maxRetries: 3, baseDelay: 500 }),
      onRetry: ({ attempt, delay, error }) => {
        console.log(`🔄 插入 ${table} 重试 ${attempt}/8: ${error}`)
      }
    }
  )
  
  if (result.success) {
    return result.data
  }
  
  // 关键操作失败时，加入离线队列
  if (isCritical && !navigator.onLine) {
    console.log('📴 网络断开，操作已加入离线队列')
    await offlineQueue.enqueue({
      type: `insert_${table}`,
      payload: record
    })
    // 返回一个标记，表示已进入离线队列
    return { offlineQueued: true, willSync: true }
  }
  
  throw result.error
}

// 带重试的更新封装
export async function updateWithRetry(table, match, data, isCritical = false) {
  const config = isCritical ? criticalOperationConfig : { maxRetries: 3, baseDelay: 500 }
  
  const result = await withRetry(
    async () => {
      const { data: result, error } = await supabase
        .from(table)
        .update(data)
        .match(match)
        .select()
      if (error) throw error
      return result
    },
    {
      ...config,
      onRetry: ({ attempt, delay, error }) => {
        console.log(`🔄 更新 ${table} 重试 ${attempt}/${config.maxRetries}: ${error}`)
      }
    }
  )
  
  if (result.success) {
    return result.data
  }
  throw result.error
}

// 带用户过滤的查询封装（兼容旧代码）
export function createUserQuery(table) {
  const user = currentUser.value
  if (!user) {
    console.warn('⚠️ 未登录用户尝试查询')
    return null
  }
  return supabase.from(table).select('*').eq('user_id', user.id)
}

// 带用户过滤的插入封装（兼容旧代码，已带重试）
export async function createUserInsert(table, data) {
  return insertWithRetry(table, data, true)
}

// 订阅用户数据变更
export function subscribeToUserTable(table, callback) {
  const user = currentUser.value
  if (!user) return null
  
  return supabase
    .channel(`${table}_user_${user.id}`)
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table,
      filter: `user_id=eq.${user.id}`
    }, callback)
    .subscribe()
}

// 获取数据库状态
export function getDbStatus() {
  return dbStatus.value
}

// 兼容旧代码的订阅函数
export function subscribeToTable(table, callback) {
  return subscribeToUserTable(table, callback)
}

// 监听认证状态变化
supabase.auth.onAuthStateChange((event, session) => {
  currentUser.value = session?.user || null
  console.log('🔐 认证状态变化:', event, session?.user?.email)
})

// 初始化离线队列处理器
offlineQueue.registerHandler('insert_transactions', async (payload) => {
  const { data, error } = await supabase.from('transactions').insert(payload).select()
  if (error) throw error
  return data
})

offlineQueue.registerHandler('insert_orders', async (payload) => {
  const { data, error } = await supabase.from('orders').insert(payload).select()
  if (error) throw error
  return data
})
