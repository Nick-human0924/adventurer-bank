<template>
  <div class="app">
    <nav class="sidebar">
      <div class="logo">
        <h1>🏦 儿童行为银行</h1>
      </div>
      <ul class="nav-links">
        <li v-for="route in routes" :key="route.path">
          <router-link :to="route.path" :class="{ active: $route.path === route.path }">
            <span class="icon">{{ route.meta.icon }}</span>
            <span class="title">{{ route.meta.title }}</span>
          </router-link>
        </li>
      </ul>
      <div class="connection-status" :class="{ connected: isConnected }">
        <span class="dot"></span>
        {{ isConnected ? 'Supabase 已连接' : '连接中...' }}
      </div>
    </nav>
    
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from './utils/supabase.js'
import router from './router'

const isConnected = ref(false)
const $route = useRoute()

const routes = computed(() => router.getRoutes())

onMounted(async () => {
  try {
    const { data, error } = await supabase.from('children').select('count')
    if (!error) {
      isConnected.value = true
    }
  } catch (e) {
    console.log('连接检查:', e)
    isConnected.value = false
  }
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #f5f7fa;
}

.app {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 260px;
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px 0;
  position: fixed;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.logo {
  padding: 0 20px 30px;
  border-bottom: 1px solid rgba(255,255,255,0.2);
}

.logo h1 {
  font-size: 1.4rem;
  font-weight: 600;
}

.nav-links {
  list-style: none;
  padding: 20px 0;
  flex: 1;
}

.nav-links li {
  padding: 5px 15px;
}

.nav-links a {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  color: rgba(255,255,255,0.9);
  text-decoration: none;
  border-radius: 10px;
  transition: all 0.3s;
}

.nav-links a:hover,
.nav-links a.active {
  background: rgba(255,255,255,0.2);
  color: white;
}

.nav-links .icon {
  font-size: 1.3rem;
  margin-right: 12px;
}

.connection-status {
  padding: 15px 20px;
  margin: 0 15px;
  background: rgba(0,0,0,0.2);
  border-radius: 10px;
  display: flex;
  align-items: center;
  font-size: 0.85rem;
}

.connection-status .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff6b6b;
  margin-right: 8px;
}

.connection-status.connected .dot {
  background: #51cf66;
}

.main-content {
  flex: 1;
  margin-left: 260px;
  padding: 30px;
  min-height: 100vh;
}

.card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  margin-bottom: 24px;
}

.card-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn-success {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
}

.btn-danger {
  background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);
  color: white;
}

input, select, textarea {
  padding: 10px 15px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: border-color 0.3s;
  width: 100%;
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: #667eea;
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
}

.stat-icon.blue { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.stat-icon.green { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
.stat-icon.orange { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.stat-icon.purple { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }

.stat-content h3 {
  font-size: 0.9rem;
  color: #868e96;
  margin-bottom: 5px;
}

.stat-content .number {
  font-size: 1.8rem;
  font-weight: 700;
  color: #333;
}

.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 15px;
  text-align: left;
  border-bottom: 1px solid #e9ecef;
}

th {
  font-weight: 600;
  color: #495057;
  background: #f8f9fa;
}

tr:hover {
  background: #f8f9fa;
}

.badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
}

.badge-success {
  background: #d3f9d8;
  color: #2b8a3e;
}

.badge-danger {
  background: #ffe3e3;
  color: #c92a2a;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 30px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-title {
  font-size: 1.3rem;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #868e96;
}
</style>
