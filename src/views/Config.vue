<template>
  <div class="config">
    <h2 class="page-title">⚙️ 系统配置</h2>
    
    <!-- Supabase 配置 -->
    <div class="card">
      <div class="card-title">🔗 Supabase 连接配置</div>
      
      <div class="config-section">
        <div class="form-group">
          <label>Supabase URL</label>
          <input :value="supabaseUrl" readonly class="readonly" />
          <span class="hint">⚠️ 生产环境建议使用环境变量配置</span>
        </div>
        
        <div class="form-group">
          <label>Supabase Key</label>
          <input :value="maskedKey" readonly class="readonly" />
        </div>
        
        <div class="connection-test">
          <button class="btn btn-primary" @click="testConnection" :disabled="testing">
            {{ testing ? '测试中...' : '🔄 测试连接' }}
          </button>          
          <span v-if="connectionStatus" :class="['status', connectionStatus.type]">
            {{ connectionStatus.message }}
          </span>
        </div>
      </div>
    </div>
    
    <!-- 数据库初始化 -->
    <div class="card">
      <div class="card-title">🗄️ 数据库初始化</div>
      
      <p class="description">
        首次使用需要创建必要的数据表。点击下方按钮检查并初始化数据库结构。
      </p>
      
      <div class="table-status">
        <div v-for="table in tables" :key="table.name" class="table-item">
          <span class="table-name">{{ table.name }}</span>          
          <span :class="['table-badge', table.exists ? 'exists' : 'missing']">
            {{ table.exists ? '✅ 已创建' : '❌ 未创建' }}
          </span>
        </div>
      </div>
      
      <button class="btn btn-primary" @click="initTables" :disabled="initing">
        {{ initing ? '初始化中...' : '🚀 初始化数据库' }}
      </button>
    </div>
    
    <!-- 数据管理 -->
    <div class="card">
      <div class="card-title">📦 数据管理</div>
      
      <div class="data-actions">
        <div class="action-item">
          <div class="action-info">
            <h4>🧹 清空所有数据</h4>
            <p>删除所有孩子、规则和交易记录，不可恢复</p>
          </div>          
          <button class="btn btn-danger" @click="confirmClearData">清空数据</button>
        </div>
        
        <div class="action-item">
          <div class="action-info">
            <h4>📝 导入示例数据</h4>
            <p>插入示例孩子、规则和交易记录用于测试</p>
          </div>          
          <button class="btn btn-success" @click="importSampleData">导入示例</button>
        </div>
      </div>
    </div>
    
    <!-- 系统信息 -->
    <div class="card">
      <div class="card-title">ℹ️ 系统信息</div>
      
      <div class="info-grid">
        <div class="info-item">
          <span class="label">项目名称</span>          
          <span class="value">儿童行为激励银行系统</span>
        </div>        
        <div class="info-item">
          <span class="label">版本</span>          
          <span class="value">v3.1.1</span>
        </div>        
        <div class="info-item">
          <span class="label">技术栈</span>          
          <span class="value">Vue 3 + Vite + Supabase + ECharts</span>
        </div>        
        <div class="info-item">
          <span class="label">创建时间</span>          
          <span class="value">{{ new Date().toLocaleDateString('zh-CN') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../utils/supabase.js'

const supabaseUrl = 'https://agkemugaxrhrsnbyiluw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjEzNTIsImV4cCI6MjA4OTYzNzM1Mn0.eGg3eo7PLrgcjHfLeOW5vq7ElMQbGT2I4RPpxmPdLUo'

const maskedKey = computed(() => {
  return supabaseKey.substring(0, 20) + '...' + supabaseKey.substring(supabaseKey.length - 10)
})

const testing = ref(false)
const connectionStatus = ref(null)
const initing = ref(false)

const tables = ref([
  { name: 'children', exists: false },
  { name: 'rules', exists: false },
  { name: 'transactions', exists: false }
])

// 测试连接
async function testConnection() {
  testing.value = true
  connectionStatus.value = null
  
  try {
    const { data, error } = await supabase.from('children').select('count')
    
    if (error && error.code === '42P01') {
      connectionStatus.value = { type: 'warning', message: '⚠️ 已连接，但数据表未创建' }
    } else if (error) {
      connectionStatus.value = { type: 'error', message: '❌ 连接失败: ' + error.message }
    } else {
      connectionStatus.value = { type: 'success', message: '✅ 连接成功！' }
    }
  } catch (e) {
    connectionStatus.value = { type: 'error', message: '❌ 连接异常: ' + e.message }
  } finally {
    testing.value = false
  }
}

// 检查表状态
async function checkTables() {
  for (const table of tables.value) {
    const { error } = await supabase.from(table.name).select('count').limit(1)
    table.exists = !(error && error.code === '42P01')
  }
}

// 初始化表
async function initTables() {
  initing.value = true
  
  try {
    // 创建 children 表
    await supabase.rpc('create_children_table').catch(() => {
      // 如果 RPC 不存在，使用备用方案
      console.log('尝试通过 SQL 创建表...')
    })
    
    // 在实际环境中，应该使用 Supabase 的 SQL 编辑器或迁移脚本来创建表
    // 这里我们只是模拟检查
    await checkTables()
    
    alert('数据库初始化指令已发送。如果表未创建，请在 Supabase 控制台中手动执行 SQL 脚本。')
  } catch (e) {
    alert('初始化失败: ' + e.message)
  } finally {
    initing.value = false
  }
}

// 确认清空数据
function confirmClearData() {
  if (confirm('⚠️ 警告：这将删除所有数据！确定要继续吗？')) {
    clearAllData()
  }
}

// 清空所有数据
async function clearAllData() {
  await supabase.from('transactions').delete().neq('id', 'placeholder')
  await supabase.from('rules').delete().neq('id', 'placeholder')
  await supabase.from('children').delete().neq('id', 'placeholder')
  alert('数据已清空')
  await checkTables()
}

// 导入示例数据
async function importSampleData() {
  // 示例孩子
  const { data: children } = await supabase.from('children').insert([
    { name: '小明', avatar: '👦', total_points: 100, current_balance: 85 },
    { name: '小红', avatar: '👧', total_points: 120, current_balance: 95 }
  ]).select()
  
  // 示例规则
  const { data: rules } = await supabase.from('rules').insert([
    { name: '按时完成作业', icon: '📚', description: '每天按时完成学校作业', points: 10, type: 'good', is_active: true },
    { name: '帮忙做家务', icon: '🧹', description: '主动帮助家人做家务', points: 15, type: 'good', is_active: true },
    { name: '运动锻炼', icon: '🏃', description: '进行30分钟以上体育锻炼', points: 10, type: 'good', is_active: true },
    { name: '沉迷游戏', icon: '🎮', description: '玩游戏超过规定时间', points: 10, type: 'bad', is_active: true }
  ]).select()
  
  alert('示例数据已导入！')
  await checkTables()
}

onMounted(() => {
  checkTables()
})
</script>

<style scoped>
.page-title {
  margin-bottom: 24px;
  color: #333;
}

.config-section {
  max-width: 600px;
}

.readonly {
  background: #f8f9fa;
  color: #868e96;
}

.hint {
  display: block;
  margin-top: 5px;
  font-size: 0.85rem;
  color: #f59f00;
}

.connection-test {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-top: 20px;
}

.status {
  padding: 8px 15px;
  border-radius: 8px;
  font-size: 0.9rem;
}

.status.success {
  background: #d3f9d8;
  color: #2b8a3e;
}

.status.error {
  background: #ffe3e3;
  color: #c92a2a;
}

.status.warning {
  background: #fff3cd;
  color: #856404;
}

.description {
  color: #868e96;
  margin-bottom: 20px;
}

.table-status {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.table-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.table-name {
  font-weight: 500;
}

.table-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
}

.table-badge.exists {
  background: #d3f9d8;
  color: #2b8a3e;
}

.table-badge.missing {
  background: #ffe3e3;
  color: #c92a2a;
}

.data-actions {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.action-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
}

.action-info h4 {
  margin-bottom: 5px;
  color: #333;
}

.action-info p {
  color: #868e96;
  font-size: 0.9rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.info-item .label {
  color: #868e96;
  font-size: 0.9rem;
}

.info-item .value {
  font-weight: 500;
  color: #333;
}
</style>
