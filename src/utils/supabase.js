import { createClient } from '@supabase/supabase-js'

// Supabase 配置
const SUPABASE_URL = 'https://agkemugaxrhrsnbyiluw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjEzNTIsImV4cCI6MjA4OTYzNzM1Mn0.eGg3eo7PLrgcjHfLeOW5vq7ElMQbGT2I4RPpxmPdLUo'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// 数据库表结构说明
export const DB_SCHEMA = {
  children: {
    id: 'uuid',
    name: 'string',
    avatar: 'string',
    total_points: 'number',
    current_balance: 'number',
    created_at: 'timestamp'
  },
  rules: {
    id: 'uuid',
    name: 'string',
    description: 'text',
    points: 'number',
    type: 'good|bad',
    icon: 'string',
    is_active: 'boolean',
    created_at: 'timestamp'
  },
  transactions: {
    id: 'uuid',
    child_id: 'uuid',
    rule_id: 'uuid',
    points: 'number',
    type: 'earn|spend',
    note: 'text',
    created_at: 'timestamp'
  }
}

// 初始化数据库表
export async function initDatabase() {
  try {
    // 检查 children 表
    const { data: childrenData, error: childrenError } = await supabase
      .from('children')
      .select('*')
      .limit(1)
    
    if (childrenError && childrenError.code === '42P01') {
      console.log('需要创建 children 表')
    }

    // 检查 rules 表
    const { data: rulesData, error: rulesError } = await supabase
      .from('rules')
      .select('*')
      .limit(1)
    
    if (rulesError && rulesError.code === '42P01') {
      console.log('需要创建 rules 表')
    }

    // 检查 transactions 表
    const { data: transData, error: transError } = await supabase
      .from('transactions')
      .select('*')
      .limit(1)
    
    if (transError && transError.code === '42P01') {
      console.log('需要创建 transactions 表')
    }

    return { success: true, message: '数据库检查完成' }
  } catch (error) {
    console.error('数据库初始化错误:', error)
    return { success: false, error }
  }
}

// 获取实时数据
export function subscribeToTable(table, callback) {
  return supabase
    .channel(`${table}_changes`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
    .subscribe()
}
