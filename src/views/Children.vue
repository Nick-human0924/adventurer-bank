<template>
  <div class="children-page">
    <div class="page-header">
      <h2>👶 孩子管理</h2>
      <button class="btn btn-primary" @click="showAddModal = true">
        <span>+</span> 添加孩子
      </button>
    </div>

    <!-- 孩子列表 -->
    <div class="children-grid">
      <div v-for="child in children" :key="child.id" class="child-card">
        <div class="child-avatar">{{ child.avatar || '👶' }}</div>
        <div class="child-info">
          <h3>{{ child.name }}</h3>
          <div class="child-stats">
            <div class="stat">
              <span class="label">当前积分</span>
              <span class="value points">{{ child.current_balance }}</span>
            </div>
            <div class="stat">
              <span class="label">累计积分</span>
              <span class="value total">{{ child.total_points }}</span>
            </div>
          </div>
        </div>
        <div class="child-actions">
          <button class="btn-icon" @click="editChild(child)" title="编辑">✏️</button>
          <button class="btn-icon" @click="deleteChild(child.id)" title="删除">🗑️</button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="children.length === 0" class="empty-state">
        <div class="empty-icon">👶</div>
        <p>还没有添加孩子</p>
        <button class="btn btn-primary" @click="showAddModal = true">
          添加第一个孩子
        </button>
      </div>
    </div>

    <!-- 添加/编辑孩子弹窗 -->
    <div v-if="showAddModal || showEditModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ isEditing ? '编辑孩子' : '添加孩子' }}</h3>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>姓名</label>
            <input v-model="form.name" type="text" placeholder="请输入孩子姓名" />
          </div>
          <div class="form-group">
            <label>头像</label>
            <div class="avatar-selector">
              <span 
                v-for="avatar in avatars" 
                :key="avatar"
                class="avatar-option"
                :class="{ active: form.avatar === avatar }"
                @click="form.avatar = avatar"
              >
                {{ avatar }}
              </span>
            </div>
          </div>
          <div class="form-group">
            <label>初始积分</label>
            <input v-model.number="form.current_balance" type="number" min="0" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="closeModal">取消</button>
          <button class="btn btn-primary" @click="saveChild" :disabled="!form.name">
            {{ isEditing ? '保存' : '添加' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../utils/supabase.js'

const children = ref([])
const showAddModal = ref(false)
const showEditModal = ref(false)
const isEditing = ref(false)
const editingId = ref(null)

const avatars = ['👶', '👧', '👦', '🧒', '👧🏻', '👦🏻', '🧒🏻', '👧🏽', '👦🏽']

const form = ref({
  name: '',
  avatar: '👶',
  current_balance: 0,
  total_points: 0
})

// 加载孩子列表
async function loadChildren() {
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('加载孩子失败:', error)
    return
  }
  
  children.value = data || []
}

// 保存孩子
async function saveChild() {
  if (!form.value.name) return
  
  const user = await supabase.auth.getUser()
  const user_id = user.data.user?.id
  
  if (isEditing.value) {
    const { error } = await supabase
      .from('children')
      .update({
        name: form.value.name,
        avatar: form.value.avatar,
        current_balance: form.value.current_balance
      })
      .eq('id', editingId.value)
    
    if (error) {
      alert('保存失败: ' + error.message)
      return
    }
  } else {
    const { error } = await supabase
      .from('children')
      .insert([{
        name: form.value.name,
        avatar: form.value.avatar,
        current_balance: form.value.current_balance,
        total_points: form.value.current_balance,
        user_id: user_id
      }])
    
    if (error) {
      alert('添加失败: ' + error.message)
      return
    }
  }
  
  closeModal()
  loadChildren()
}

// 编辑孩子
function editChild(child) {
  isEditing.value = true
  editingId.value = child.id
  form.value = {
    name: child.name,
    avatar: child.avatar || '👶',
    current_balance: child.current_balance
  }
  showEditModal.value = true
}

// 删除孩子
async function deleteChild(id) {
  if (!confirm('确定要删除这个孩子吗？')) return
  
  const { error } = await supabase
    .from('children')
    .delete()
    .eq('id', id)
  
  if (error) {
    alert('删除失败: ' + error.message)
    return
  }
  
  loadChildren()
}

// 关闭弹窗
function closeModal() {
  showAddModal.value = false
  showEditModal.value = false
  isEditing.value = false
  editingId.value = null
  form.value = {
    name: '',
    avatar: '👶',
    current_balance: 0,
    total_points: 0
  }
}

onMounted(() => {
  loadChildren()
})
</script>

<style scoped>
.children-page {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.page-header h2 {
  font-size: 1.5rem;
  color: #333;
}

.children-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.child-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  display: flex;
  align-items: center;
  gap: 16px;
  transition: transform 0.3s;
}

.child-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
}

.child-avatar {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
}

.child-info {
  flex: 1;
}

.child-info h3 {
  font-size: 1.2rem;
  margin-bottom: 12px;
  color: #333;
}

.child-stats {
  display: flex;
  gap: 20px;
}

.stat {
  display: flex;
  flex-direction: column;
}

.stat .label {
  font-size: 0.8rem;
  color: #868e96;
  margin-bottom: 4px;
}

.stat .value {
  font-size: 1.3rem;
  font-weight: 700;
}

.stat .value.points {
  color: #51cf66;
}

.stat .value.total {
  color: #667eea;
}

.child-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: #f8f9fa;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.3s;
}

.btn-icon:hover {
  background: #e9ecef;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 16px;
}

.empty-state p {
  color: #868e96;
  margin-bottom: 20px;
}

.avatar-selector {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.avatar-option {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.avatar-option:hover {
  background: #e9ecef;
}

.avatar-option.active {
  border-color: #667eea;
  background: #edf2ff;
}

.modal-body .form-group {
  margin-bottom: 20px;
}

.modal-body label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #495057;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
</style>
