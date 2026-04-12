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
          <label>图标 <span class="hint">（已按分类筛选，共 {{ iconOptions.length }} 个）</span></label>
          <div class="icon-picker-container">
            <!-- 显示当前分类的图标 -->
            <div class="icon-picker-category" v-if="form.category !== 'all'">
              <span class="category-label">{{ form.category }}</span>
              <div class="icon-picker">
                <span 
                  v-for="icon in CATEGORY_ICONS[form.category]?.icons || []" 
                  :key="icon"
                  :class="['icon-option', { active: form.icon === icon }]"
                  @click="form.icon = icon"
                  :title="icon"
                >
                  {{ icon }}
                </span>
              </div>
            </div>
            <!-- 如果没有选择分类，显示全部图标按分类分组 -->
            <div v-else class="icon-picker-all">
              <div v-for="(catData, catName) in CATEGORY_ICONS" :key="catName" class="icon-picker-category">
                <span class="category-label">{{ catName }}</span>
                <div class="icon-picker">
                  <span 
                    v-for="icon in catData.icons" 
                    :key="icon"
                    :class="['icon-option', { active: form.icon === icon }]"
                    @click="form.icon = icon"
                    :title="icon"
                  >
                    {{ icon }}
                  </span>
                </div>
              </div>
            </div>
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
import { ref, computed, onMounted, watch } from 'vue'
import { supabase, getCachedUser } from '../utils/supabase.js'
import { CATEGORY_ICONS, suggestIcon, suggestCategory } from '../lib/categoryIcons.js'

const rules = ref([])
const showAddModal = ref(false)
const editingRule = ref(null)
const selectedCategory = ref('all')

// 7大分类定义（使用categoryIcons.js的配置）
const categories = [
  { value: 'all', label: '全部', icon: '📋' },
  { value: '运动健康', label: '运动健康', icon: CATEGORY_ICONS['运动健康'].icon },
  { value: '学习成长', label: '学习成长', icon: CATEGORY_ICONS['学习成长'].icon },
  { value: '生活自理', label: '生活自理', icon: CATEGORY_ICONS['生活自理'].icon },
  { value: '艺术创造', label: '艺术创造', icon: CATEGORY_ICONS['艺术创造'].icon },
  { value: '品德社交', label: '品德社交', icon: CATEGORY_ICONS['品德社交'].icon },
  { value: '作息规律', label: '作息规律', icon: CATEGORY_ICONS['作息规律'].icon },
  { value: '健康饮食', label: '健康饮食', icon: CATEGORY_ICONS['健康饮食'].icon },
  { value: '其他', label: '其他', icon: CATEGORY_ICONS['其他'].icon }
]

// 根据当前选择的分类获取可用图标
const iconOptions = computed(() => {
  if (form.value.category && form.value.category !== 'all') {
    return CATEGORY_ICONS[form.value.category]?.icons || CATEGORY_ICONS['其他'].icons
  }
  // 如果未选择分类，返回所有图标
  return Object.values(CATEGORY_ICONS).flatMap(cat => cat.icons)
})

const form = ref({
  type: 'good',
  category: '学习成长',
  name: '',
  icon: '📚',
  description: '',
  points: 10,
  is_active: true
})

// 监听规则名称变化，智能推荐分类和图标
watch(() => form.value.name, (newName) => {
  if (newName && !editingRule.value) {
    const suggestedCategory = suggestCategory(newName)
    const suggestedIcon = suggestIcon(newName, suggestedCategory)
    
    form.value.category = suggestedCategory
    form.value.icon = suggestedIcon
  }
})

// 监听分类变化，自动切换图标
watch(() => form.value.category, (newCategory) => {
  if (newCategory && CATEGORY_ICONS[newCategory]) {
    // 如果当前图标不在新分类的图标列表中，切换为分类默认图标
    const categoryIcons = CATEGORY_ICONS[newCategory].icons
    if (!categoryIcons.includes(form.value.icon)) {
      form.value.icon = CATEGORY_ICONS[newCategory].icon
    }
  }
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
  return cat ? `${cat.icon} ${cat.label}` : category
}

// 获取分类颜色
function getCategoryColor(category) {
  return CATEGORY_ICONS[category]?.color || '#ffd93d'
}
const goodRulesCount = computed(() => goodRules.value.length)
const badRulesCount = computed(() => badRules.value.length)

// 加载规则
async function loadRules() {
  const user = await getCachedUser()
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

  const user = await getCachedUser()
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
    category: rule.category || '学习成长',
    name: rule.name,
    icon: rule.icon || '📚',
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
    category: '学习成长',
    name: '',
    icon: '📚',
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

/* 7大分类颜色 */
.category-tag.运动健康 {
  background: #ffe3e3;
  color: #c92a2a;
}

.category-tag.学习成长 {
  background: #e7f5ff;
  color: #1864ab;
}

.category-tag.生活自理 {
  background: #d3f9d8;
  color: #2b8a3e;
}

.category-tag.艺术创造 {
  background: #fff0f6;
  color: #c2255c;
}

.category-tag.品德社交 {
  background: #f3d9fa;
  color: #862e9c;
}

.category-tag.作息规律 {
  background: #fff9db;
  color: #e67700;
}

.category-tag.健康饮食 {
  background: #e6fcf5;
  color: #087f5b;
}

.category-tag.其他 {
  background: #f8f9fa;
  color: #495057;
}

/* 旧分类兼容（如果有旧数据） */
.category-tag.sports {
  background: #ffe3e3;
  color: #c92a2a;
}

.category-tag.study {
  background: #e7f5ff;
  color: #1864ab;
}

.category-tag.attitude {
  background: #f3d9fa;
  color: #862e9c;
}

.category-tag.improvement {
  background: #fff9db;
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

/* 图标选择器容器 */
.icon-picker-container {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 16px;
  background: #f8f9fa;
}

.icon-picker-category {
  margin-bottom: 16px;
}

.icon-picker-category:last-child {
  margin-bottom: 0;
}

.category-label {
  display: inline-block;
  font-size: 0.8rem;
  font-weight: 600;
  color: #495057;
  margin-bottom: 8px;
  padding: 4px 10px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e9ecef;
}

.icon-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.icon-option {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  border: 2px solid #e9ecef;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.icon-option:hover {
  border-color: #667eea;
  transform: scale(1.1);
}

.icon-option.active {
  border-color: #667eea;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

textarea {
  resize: vertical;
  min-height: 80px;
}

.hint {
  font-size: 0.8rem;
  color: #868e96;
  font-weight: normal;
}

/* 滚动条样式 */
.icon-picker-container::-webkit-scrollbar {
  width: 6px;
}

.icon-picker-container::-webkit-scrollbar-track {
  background: #f1f3f5;
  border-radius: 3px;
}

.icon-picker-container::-webkit-scrollbar-thumb {
  background: #adb5bd;
  border-radius: 3px;
}

.icon-picker-container::-webkit-scrollbar-thumb:hover {
  background: #868e96;
}
</style>
