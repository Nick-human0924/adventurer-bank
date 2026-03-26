// src/components/badges/BadgeCard.vue
<template>
  <div 
    :class="['badge-card', { 'unlocked': isUnlocked, 'new': isNew }]"
    @click="$emit('click', badge)"
  >
    <div class="badge-icon">{{ badge.icon }}</div>
    <div class="badge-name">{{ badge.name }}</div>
    
    <div v-if="isUnlocked" class="badge-status">
      <span class="check">✓</span>
    </div>
    
    <div v-else class="badge-progress">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
      <div class="progress-text">{{ progressText }}</div>
    </div>
    
    <div v-if="isNew" class="new-badge">NEW</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  badge: { type: Object, required: true },
  isUnlocked: { type: Boolean, default: false },
  isNew: { type: Boolean, default: false },
  progress: { type: Number, default: 0 }
})

defineEmits(['click'])

const progressPercent = computed(() => {
  return Math.min(100, Math.max(0, props.progress))
})

const progressText = computed(() => {
  const condition = props.badge.unlock_condition
  if (!condition) return '未解锁'
  
  if (condition.type === 'total_points') {
    return `${props.progress}/${condition.min}分`
  }
  if (condition.type === 'streak_days') {
    return `${props.progress}/${condition.min}天`
  }
  if (condition.type === 'category_points') {
    return `${props.progress}/${condition.min}分`
  }
  return '未解锁'
})
</script>

<style scoped>
.badge-card {
  position: relative;
  background: #f5f5f5;
  border-radius: 16px;
  padding: 16px 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.badge-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.1);
}

.badge-card.unlocked {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  border-color: #4CAF50;
}

.badge-card.new {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(76, 175, 80, 0); }
}

.badge-icon {
  font-size: 48px;
  margin-bottom: 8px;
  filter: grayscale(100%);
  transition: filter 0.3s;
}

.badge-card.unlocked .badge-icon {
  filter: grayscale(0%);
  animation: bounce 0.5s;
}

@keyframes bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.badge-name {
  font-size: 13px;
  font-weight: 600;
  color: #666;
  margin-bottom: 8px;
}

.badge-card.unlocked .badge-name {
  color: #2e7d32;
}

.badge-status {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  background: #4CAF50;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.check {
  color: white;
  font-size: 14px;
  font-weight: bold;
}

.badge-progress {
  margin-top: 8px;
}

.progress-bar {
  height: 6px;
  background: #ddd;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 4px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #81c784, #4CAF50);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.progress-text {
  font-size: 11px;
  color: #999;
}

.new-badge {
  position: absolute;
  top: -8px;
  left: -8px;
  background: #ff5722;
  color: white;
  font-size: 10px;
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 10px;
  animation: shake 0.5s ease infinite;
}

@keyframes shake {
  0%, 100% { transform: rotate(-5deg); }
  50% { transform: rotate(5deg); }
}
</style>
