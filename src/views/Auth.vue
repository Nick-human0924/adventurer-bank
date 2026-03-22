<template>
  <div class="auth-page">
    <div class="auth-container">
      <div class="auth-logo">
        <span class="logo-icon">🏦</span>
        <h1>儿童行为银行</h1>
        <p>培养孩子好习惯，从积分激励开始</p>
      </div>
      
      <div class="auth-tabs">
        <button 
          class="tab-btn" 
          :class="{ active: isLogin }"
          @click="isLogin = true"
        >
          登录
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: !isLogin }"
          @click="isLogin = false"
        >
          注册
        </button>
      </div>
      
      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="form-group">
          <label>邮箱地址</label>
          <input 
            v-model="form.email" 
            type="email" 
            required
            placeholder="请输入邮箱"
          >
        </div>
        
        <div class="form-group">
          <label>密码</label>
          <input 
            v-model="form.password" 
            type="password" 
            required
            placeholder="请输入密码（至少6位）"
            minlength="6"
          >
        </div>
        
        <div v-if="!isLogin" class="form-group">
          <label>确认密码</label>
          <input 
            v-model="form.confirmPassword" 
            type="password" 
            required
            placeholder="请再次输入密码"
          >
        </div>
        
        <div v-if="!isLogin" class="form-group">
          <label>家庭名称（可选）</label>
          <input 
            v-model="form.familyName" 
            type="text"
            placeholder="例如：温馨小家"
          >
        </div>
        
        <div v-if="error" class="error-message">
          <span class="error-icon">⚠️</span>
          {{ error }}
        </div>
        
        <button 
          type="submit" 
          class="submit-btn"
          :disabled="loading"
        >
          <span v-if="loading">{{ isLogin ? '登录中...' : '注册中...' }}</span>
          <span v-else>{{ isLogin ? '立即登录' : '创建账号' }}</span>
        </button>
      </form>
      
      <div class="auth-footer">
        <p v-if="isLogin">
          还没有账号？<a @click="isLogin = false" href="#">立即注册</a>
        </p>
        <p v-else>
          已有账号？<a @click="isLogin = true" href="#">立即登录</a>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../utils/supabase.js'

const router = useRouter()
const isLogin = ref(true)
const loading = ref(false)
const error = ref('')

const form = reactive({
  email: '',
  password: '',
  confirmPassword: '',
  familyName: ''
})

async function handleSubmit() {
  error.value = ''
  loading.value = true
  
  try {
    if (!isLogin.value) {
      // 注册验证
      if (form.password !== form.confirmPassword) {
        error.value = '两次输入的密码不一致'
        return
      }
      
      // 注册
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password
      })
      
      if (authError) throw authError
      
      // 创建家庭设置
      if (form.familyName) {
        await supabase.from('family_settings').insert({
          user_id: authData.user.id,
          family_name: form.familyName
        })
      }
      
      alert('🎉 注册成功！请使用新账号登录')
      isLogin.value = true
      form.password = ''
      form.confirmPassword = ''
    } else {
      // 登录
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password
      })
      
      if (loginError) throw loginError
      
      // 跳转到首页
      router.push('/')
    }
  } catch (err) {
    console.error('Auth error:', err)
    error.value = err.message || '操作失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.auth-container {
  background: white;
  border-radius: 24px;
  padding: 40px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.auth-logo {
  text-align: center;
  margin-bottom: 32px;
}

.logo-icon {
  font-size: 4rem;
  display: block;
  margin-bottom: 16px;
}

.auth-logo h1 {
  font-size: 1.8rem;
  color: #333;
  margin: 0 0 8px 0;
}

.auth-logo p {
  color: #868e96;
  font-size: 0.95rem;
  margin: 0;
}

.auth-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  background: #f8f9fa;
  padding: 4px;
  border-radius: 12px;
}

.tab-btn {
  flex: 1;
  padding: 12px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  color: #868e96;
  cursor: pointer;
  transition: all 0.3s;
}

.tab-btn.active {
  background: white;
  color: #667eea;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 0.9rem;
  font-weight: 500;
  color: #495057;
}

.form-group input {
  padding: 14px 16px;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #ffe3e3;
  color: #c92a2a;
  border-radius: 8px;
  font-size: 0.9rem;
}

.submit-btn {
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 8px;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.auth-footer {
  text-align: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e9ecef;
}

.auth-footer p {
  color: #868e96;
  font-size: 0.95rem;
  margin: 0;
}

.auth-footer a {
  color: #667eea;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}

.auth-footer a:hover {
  text-decoration: underline;
}

@media (max-width: 480px) {
  .auth-container {
    padding: 24px;
    border-radius: 20px;
  }
  
  .auth-logo h1 {
    font-size: 1.5rem;
  }
  
  .logo-icon {
    font-size: 3rem;
  }
}
</style>
