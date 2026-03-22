<template>
  <div class="rules">
    <h2 class="page-title">📝 规则管理</h2>
    
    <!-- 规则统计 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon green">✅</div>
        <div class="stat-content">
          <h3>奖励规则</h3>
          <div class="number">{{ goodRulesCount }}</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon orange">⚠️</div>
        <div class="stat-content">
          <h3>惩罚规则</h3>
          <div class="number">{{ badRulesCount }}</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon blue">📊</div>
        <div class="stat-content">
          <h3>总规则数</h3>
          <div class="number">{{ rules.length }}</div>
        </div>
      </div>
    </div>
    
    <!-- 分类筛选 -->
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div class="category-filters">
          <span class="filter-label">分类筛选：</span>
          <button
            v-for="cat in categories"
            :key="cat.value"
            :class="['filter-btn', { active: selectedCategory === cat.value }]"
            @click="selectedCategory = cat.value"
          >
            {{ cat.icon }} {{ cat.label }}
          </button>
        </div>
        <button class="btn btn-primary" @click="showAddModal = true">
          ➕ 新建规则
        </button>
      </div>
    </div>
    
    <!-- 奖励规则 -->
    <div class="card">
      <div class="card-title">✅ 奖励规则（好习惯）</div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>图标</th>
              <th>规则名称</th>
              <th>分类</th>
              <th>描述</th>
              <th>金币</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rule in filteredGoodRules" :key="rule.id">
              <td class="icon-cell">{{ rule.icon }}</td>
              <td>{{ rule.name }}</td>
              <td><span class="category-tag" :class="rule.category">{{ getCategoryLabel(rule.category) }}</span></td>
              <td>{{ rule.description || '-' }}</td>
              <td><span class="points-badge good">+{{ rule.points }}</span></td>
              <td>
                <span :class="['badge', rule.is_active ? 'badge-success' : 'badge-gray']">
                  {{ rule.is_active ? '启用' : '禁用' }}
                </span>
              </td>
              <td>
                <button class="btn-icon" @click="editRule(rule)" title="编辑">✏️</button>
                <button class="btn-icon" @click="toggleRule(rule)" :title="rule.is_active ? '禁用' : '启用'">
                  {{ rule.is_active ? '🚫' : '✅' }}
                </button>
                <button class="btn-icon delete" @click="deleteRule(rule.id)" title="删除">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- 惩罚规则 -->
    <div class="card">
      <div class="card-title">⚠️ 惩罚规则（需改进）</div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>图标</th>
              <th>规则名称</th>
              <th>分类</th>
              <th>描述</th>
              <th>金币</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rule in filteredBadRules" :key="rule.id">
              <td class="icon-cell">{{ rule.icon }}</td>
              <td>{{ rule.name }}</td>
              <td><span class="category-tag" :class="rule.category">{{ getCategoryLabel(rule.category) }}</span></td>
              <td>{{ rule.description || '-' }}</td>
              <td><span class="points-badge bad">-{{ rule.points }}</span></td>
              <td>
                <span :class="['badge', rule.is_active ? 'badge-success' : 'badge-gray']">
                  {{ rule.is_active ? '启用' : '禁用' }}
                </span>
              </td>
              <td>
                <button class="btn-icon" @click="editRule(rule)" title="编辑">✏️</button>
                <button class="btn-icon" @click="toggleRule(rule)" :title="rule.is_active ? '禁用' : '启用'">
                  {{ rule.is_active ? '🚫' : '✅' }}
                </button>
                <button class="btn-icon delete" @click="deleteRule(rule.id)" title="删除">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- 添加/编辑规则弹窗 -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">{{ editingRule ? '✏️ 编辑规则' : '➕ 新建规则' }}</span>
          <button class="close-btn" @click="closeModal">&times;</button>
        </div>
        
        <div class="form-group">
          <label>规则类型</label>
          <select v-model="form.type">
            <option value="good">✅ 奖励规则（获得金币）</option>
            <option value="bad">⚠️ 惩罚规则（扣除金币）</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>分类</label>
          <select v-model="form.category">
            <option v-for="cat in categories.filter(c => c.value !== 'all')" :key="cat.value" :value="cat.value">
              {{ cat.icon }} {{ cat.label }}
            </option>
          </select>
        </div>
        
        <div class="form-group">
          <label>规则名称 *</label>
          <input v-model="form.name" placeholder="例如：按时完成作业" />
        </div>
        
        <div class="form-group">
          <label>图标</label>
          <div class="icon-picker">
            <span 
              v-for="icon in iconOptions" 
              :key="icon"
              :class="['icon-option', { active: form.icon === icon }]"
              @click="form.icon = icon"
            >
              {{ icon }}
            </span>
          </div>
        </div>
        
        <div class="form-group">
          <label>描述</label>
          <textarea v-model="form.description" rows="3" placeholder="规则详细描述..."></textarea>
        </div>
        
        <div class="form-group">
          <label>金币值 *</label>
          <input type="number" v-model.number="form.points" min="1" placeholder="输入金币数值" />
        </div>
        
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-primary" @click="saveRule">
            {{ editingRule ? '保存修改' : '创建规则' }}
          </button>          
          <button class="btn" @click="closeModal" style="background: #e9ecef;">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../utils/supabase.js'

const rules = ref([])
const showAddModal = ref(false)
const editingRule = ref(null)
const selectedCategory = ref('all')

// 分类定义
const categories = [
  { value: 'all', label: '全部', icon: '📋' },
  { value: 'sports', label: '运动类', icon: '🏃' },
  { value: 'study', label: '学习类', icon: '📚' },
  { value: 'attitude', label: '态度和品德', icon: '❤️' },
  { value: 'improvement', label: '控制和改正', icon: '🔧' }
]

const iconOptions = ['⭐', '📚', '🏃', '🧹', '🎨', '🎵', '🤝', '💤', '🍎', '🎯', '🏆', '💪', '🧠', '❤️', '🌟', '⚽', '🎹', '📖', '✏️', '🧩', '🎮', '🚫', '⚠️', '🔔']

const form = ref({
  type: 'good',
  category: 'study',
  name: '',
  icon: '⭐',
  description: '',
  points: 10,
  is_active: true
})

const goodRules = computed(() => rules.value.filter(r => r.type === 'good'))
const badRules = computed(() => rules.value.filter(r => r.type === 'bad'))

// 筛选后的规则
const filteredGoodRules = computed(() => {
  if (selectedCategory.value === 'all') return goodRules.value
  return goodRules.value.filter(r => r.category === selectedCategory.value)
})

const filteredBadRules = computed(() => {
  if (selectedCategory.value === 'all') return badRules.value
  return badRules.value.filter(r => r.category === selectedCategory.value)
})

// 获取分类标签
function getCategoryLabel(category) {
  const cat = categories.find(c => c.value === category)
  return cat ? cat.label : category
}
const goodRulesCount = computed(() => goodRules.value.length)
const badRulesCount = computed(() => badRules.value.length)

// 加载规则
async function loadRules() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  
  const { data } = await supabase
    .from('rules')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  rules.value = data || []
}

// 保存规则
async function saveRule() {
  if (!form.value.name || !form.value.points) {
    alert('请填写完整信息')
    return
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    alert('请先登录')
    return
  }

  if (editingRule.value) {
    // 编辑时只更新部分字段（不包括user_id）
    const { error } = await supabase.from('rules').update({
      type: form.value.type,
      category: form.value.category,
      name: form.value.name,
      icon: form.value.icon,
      description: form.value.description,
      points: form.value.points,
      is_active: form.value.is_active
    }).eq('id', editingRule.value.id)
    
    if (error) {
      console.error('更新规则失败:', error)
      alert('更新失败: ' + error.message)
      return
    }
  } else {
    // 新增时包含user_id
    const { error } = await supabase.from('rules').insert({
      type: form.value.type,
      category: form.value.category,
      name: form.value.name,
      icon: form.value.icon,
      description: form.value.description,
      points: form.value.points,
      is_active: form.value.is_active,
      user_id: user.id
    })
    
    if (error) {
      console.error('新增规则失败:', error)
      alert('新增失败: ' + error.message)
      return
    }
  }

  closeModal()
  await loadRules()
}

// 编辑规则
function editRule(rule) {
  editingRule.value = rule
  form.value = {
    type: rule.type,
    category: rule.category || 'study',
    name: rule.name,
    icon: rule.icon,
    description: rule.description,
    points: rule.points,
    is_active: rule.is_active
  }
  showAddModal.value = true
}

// 切换规则状态
async function toggleRule(rule) {
  await supabase
    .from('rules')
    .update({ is_active: !rule.is_active })
    .eq('id', rule.id)
  await loadRules()
}

// 删除规则
async function deleteRule(id) {
  if (!confirm('确定要删除这条规则吗？')) return
  await supabase.from('rules').delete().eq('id', id)
  await loadRules()
}

// 关闭弹窗
function closeModal() {
  showAddModal.value = false
  editingRule.value = null
  form.value = {
    type: 'good',
    category: 'study',
    name: '',
    icon: '⭐',
    description: '',
    points: 10,
    is_active: true
  }
}

onMounted(() => {
  loadRules()
})
</script>

<style scoped>
.page-title {
  margin-bottom: 24px;
  color: #333;
}

/* 分类筛选 */
.category-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-label {
  font-size: 0.9rem;
  color: #666;
  font-weight: 500;
}

.filter-btn {
  padding: 8px 14px;
  border: 2px solid #e9ecef;
  background: white;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.3s;
}

.filter-btn:hover {
  border-color: #667eea;
}

.filter-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

/* 分类标签 */
.category-tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.category-tag.sports {
  background: #d3f9d8;
  color: #2b8a3e;
}

.category-tag.study {
  background: #dbe4ff;
  color: #364fc7;
}

.category-tag.attitude {
  background: #ffe3e3;
  color: #c92a2a;
}

.category-tag.improvement {
  background: #fff3bf;
  color: #e67700;
}

.icon-cell {
  font-size: 1.5rem;
}

.points-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9rem;
}

.points-badge.good {
  background: #d3f9d8;
  color: #2b8a3e;
}

.points-badge.bad {
  background: #ffe3e3;
  color: #c92a2a;
}

.badge-gray {
  background: #e9ecef;
  color: #868e96;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 5px;
  margin: 0 3px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.btn-icon:hover {
  opacity: 1;
}

.btn-icon.delete:hover {
  color: #ff416c;
}

.icon-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.icon-option {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-option:hover {
  border-color: #667eea;
}

.icon-option.active {
  border-color: #667eea;
  background: #f0f1ff;
}

textarea {
  resize: vertical;
  min-height: 80px;
}
</style>
