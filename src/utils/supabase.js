import { createClient } from '@supabase/supabase-js'

// Supabase 配置 - 从环境变量或默认值
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://agkemugaxrhrsnbyiluw.supabase.co'
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjEzNTIsImV4cCI6MjA4OTYzNzM1Mn0.eGg3eo7PLrgcjHfLeOW5vq7ElMQbGT2I4RPpxmPdLUo'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// 数据库连接状态
export let dbStatus = {
  connected: false,
  tablesExist: {
    children: false,
    rules: false,
    transactions: false
  },
  error: null
}

// 检查表是否存在
async function checkTable(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
    
    if (error) {
      // 42P01 = 表不存在
      if (error.code === '42P01') {
        console.error(`❌ 表 '${tableName}' 不存在`)
        return { exists: false, error: 'TABLE_NOT_FOUND' }
      }
      // 其他错误（可能是权限或网络）
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
  
  try {
    // 检查各个表
    const childrenCheck = await checkTable('children')
    const rulesCheck = await checkTable('rules')
    const transactionsCheck = await checkTable('transactions')
    
    dbStatus.tablesExist.children = childrenCheck.exists
    dbStatus.tablesExist.rules = rulesCheck.exists
    dbStatus.tablesExist.transactions = transactionsCheck.exists
    
    // 所有表都存在才算连接成功
    const allTablesExist = childrenCheck.exists && rulesCheck.exists && transactionsCheck.exists
    
    if (allTablesExist) {
      dbStatus.connected = true
      dbStatus.error = null
      console.log('✅ 数据库连接成功，所有表都存在')
    } else {
      dbStatus.connected = false
      dbStatus.error = 'MISSING_TABLES'
      console.error('❌ 数据库连接失败：部分表不存在')
      console.log('💡 请运行 init_database.sql 脚本创建数据表')
    }
    
    return {
      success: allTablesExist,
      status: dbStatus
    }
  } catch (error) {
    dbStatus.connected = false
    dbStatus.error = error.message || 'UNKNOWN_ERROR'
    console.error('❌ 数据库初始化错误:', error)
    return { success: false, error: error.message, status: dbStatus }
  }
}

// 获取数据库状态
export function getDbStatus() {
  return dbStatus
}

// 获取实时数据
export function subscribeToTable(table, callback) {
  return supabase
    .channel(`${table}_changes`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
    .subscribe()
}
