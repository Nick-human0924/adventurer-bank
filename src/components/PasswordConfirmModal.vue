<template>
  <div v-if="visible" class="password-modal-overlay" @click.self="cancel">
    <div class="password-modal">
      <div class="modal-header">
        <span class="lock-icon">🔒</span>
        <h3>管理员验证</h3>
      </div>
      
      <p class="modal-desc">{{ description }}</p>
      
      <div class="form-group">
        <label>登录密码</label>
        <input 
          v-model="password" 
          type="password" 
          placeholder="请输入您的登录密码"
          @keyup.enter="confirm"
          ref="passwordInput"
        >
      </div>
      
      <div v-if="error" class="error-msg">
        ⚠️ {{ error }}
      </div>
      
      <div class="modal-actions">
        <button class="btn btn-secondary" @click="cancel" :disabled="verifying">
          取消
        </button>
        <button class="btn btn-primary" @click="confirm" :disabled="verifying || !password">
          <span v-if="verifying">验证中...</span>
          <span v-else>确认</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue'
import { supabase, getCachedUser } from '../utils/supabase.js'

const props = defineProps({
  visible: Boolean,
  description: {
    type: String,
    default: '此操作需要管理员密码验证'
  }
})

const emit = defineEmits(['confirm', 'cancel'])

const password = ref('')
const error = ref('')
const verifying = ref(false)
const passwordInput = ref(null)

watch(() => props.visible, (val) => {
  if (val) {
    password.value = ''
    error.value = ''
    nextTick(() => {
      passwordInput.value?.focus()
    })
  }
})

async function confirm() {
  if (!password.value) return
  
  error.value = ''
  verifying.value = true
  
  try {
    // 获取当前用户邮箱
    const user = await getCachedUser()
    if (!user?.email) {
      error.value = '获取用户信息失败'
      return
    }
    
    // 验证密码
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: password.value
    })
    
    if (signInError) {
      error.value = '密码错误，请重试'
      return
    }
    
    // 验证成功
    emit('confirm')
    password.value = ''
  } catch (err) {
    error.value = '验证失败，请重试'
    console.error('密码验证错误:', err)
  } finally {
    verifying.value = false
  }
}

function cancel() {
  password.value = ''
  error.value = ''
  emit('cancel')
}
</script>

<style scoped>
.password-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.password-modal {
  background: white;
  border-radius: 20px;
  padding: 30px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  text-align: center;
  margin-bottom: 20px;
}

.lock-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 12px;
}

.modal-header h3 {
  font-size: 1.4rem;
  color: #333;
  margin: 0;
}

.modal-desc {
  text-align: center;
  color: #868e96;
  margin-bottom: 24px;
  font-size: 0.95rem;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #495057;
}

.form-group input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

.error-msg {
  background: #ffe3e3;
  color: #c92a2a;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 0.9rem;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.modal-actions .btn {
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-secondary {
  background: #e9ecef;
  color: #495057;
}

.btn-secondary:hover:not(:disabled) {
  background: #dee2e6;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .password-modal {
    padding: 24px;
  }
  
  .lock-icon {
    font-size: 2.5rem;
  }
  
  .modal-header h3 {
    font-size: 1.2rem;
  }
}
</style>
