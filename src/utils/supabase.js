import { createClient } from '@supabase/supabase-js'
import { ref } from 'vue'

// Supabase 配置
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://agkemugaxrhrsnbyiluw.supabase.co'
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjEzNTIsImV4cCI6MjA4OTYzNzM1Mn0.eGg3eo7PLrgcjHfLeOW5vq7ElMQbGT2I4RPpxmPdLUo'

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
  error: null
})

// 获取当前用户
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  currentUser.value = user
  return user
}

// 检查表是否存在
async function checkTable(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
    
    if (error) {
      if (error.code === '42P01') {
        console.error(`❌ 表 '${tableName}' 不存在`)
        return { exists: false, error: 'TABLE_NOT_FOUND' }
      }
      console.error(`❌ 检查表 '${tableName}' 出错:`, error.message)
      return { exists: false, error: error.code }
    }
    
    console.log(`✅ 表 '${tableName}' 存在`)
    return { exists: true, error: null }
  } catch (err) {
    console.error(`❌ 检查表 '${tableName}' 异常:`, err)
    return { exists: false, error: 'EXCEPTION' }
  }
}

// 初始化数据库检查
export async function initDatabase() {
  console.log('🔍 正在检查数据库连接...')
  dbStatus.value.checking = true
  
  try {
    // 获取当前用户
    await getCurrentUser()
    
    // 检查各个表
    const childrenCheck = await checkTable('children')
    const rulesCheck = await checkTable('rules')
    const transactionsCheck = await checkTable('transactions')
    
    dbStatus.value.tablesExist.children = childrenCheck.exists
    dbStatus.value.tablesExist.rules = rulesCheck.exists
    dbStatus.value.tablesExist.transactions = transactionsCheck.exists
    
    const allTablesExist = childrenCheck.exists && rulesCheck.exists && transactionsCheck.exists
    
    if (allTablesExist) {
      dbStatus.value.connected = true
      dbStatus.value.error = null
      console.log('✅ 数据库连接成功')
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

// 带用户过滤的查询封装
export function createUserQuery(table) {
  const user = currentUser.value
  if (!user) {
    console.warn('⚠️ 未登录用户尝试查询')
    return null
  }
  return supabase.from(table).select('*').eq('user_id', user.id)
}

// 带用户过滤的插入封装
export function createUserInsert(table, data) {
  const user = currentUser.value
  if (!user) {
    console.warn('⚠️ 未登录用户尝试插入')
    return null
  }
  return supabase.from(table).insert({ ...data, user_id: user.id })
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
