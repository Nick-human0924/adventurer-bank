// src/components/badges/BadgeUnlockAnimation.vue
<template>
  <transition name="unlock">
    <div v-if="show" class="unlock-overlay" @click="close">
      <div class="unlock-content" @click.stop>
        <div class="sparkles">
          <span v-for="n in 6" :key="n" class="sparkle" :style="getSparkleStyle(n)">✨</span>
        </div>
        
        <div class="badge-display">
          <div class="badge-glow"></div>
          <div class="badge-icon" :style="{ animationDelay: '0.2s' }">
            {{ badge?.icon }}
          </div>
        </div>
        
        <div class="unlock-text">
          <div class="unlock-title">🎉 恭喜获得新徽章！</div>
          <div class="badge-name">{{ badge?.name }}</div>          
          <div class="badge-desc">{{ badge?.description }}</div>
        </div>
        
        <button class="close-btn" @click="close">
          太棒了！
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  badge: { type: Object, default: null }
})

const emit = defineEmits(['close'])

const show = ref(false)

watch(() => props.badge, (newBadge) => {
  if (newBadge) {
    show.value = true
  }
}, { immediate: true })

function close() {
  show.value = false
  setTimeout(() => emit('close'), 300)
}

function getSparkleStyle(n) {
  const angle = (n - 1) * 60
  const distance = 120
  return {
    transform: `rotate(${angle}deg) translateX(${distance}px) rotate(-${angle}deg)`,
    animationDelay: `${n * 0.1}s`
  }
}
</script>

<style scoped>
.unlock-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.unlock-content {
  position: relative;
  background: linear-gradient(135deg, #fff 0%, #f5f5f5 100%);
  border-radius: 24px;
  padding: 40px;
  text-align: center;
  max-width: 320px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.sparkles {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.sparkle {
  position: absolute;
  font-size: 24px;
  animation: sparkle-float 1s ease-out forwards;
  opacity: 0;
}

@keyframes sparkle-float {
  0% {
    opacity: 0;
    transform: rotate(var(--angle)) translateX(0) rotate(calc(-1 * var(--angle))) scale(0);
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: rotate(var(--angle)) translateX(150px) rotate(calc(-1 * var(--angle))) scale(1.5);
  }
}

.badge-display {
  position: relative;
  display: inline-block;
  margin-bottom: 24px;
}

.badge-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120px;
  height: 120px;
  background: radial-gradient(circle, rgba(255,215,0,0.6) 0%, transparent 70%);
  border-radius: 50%;
  animation: glow-pulse 2s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
  50% { transform: translate(-50%, -50%) scale(1.3); opacity: 0.3; }
}

.badge-icon {
  position: relative;
  font-size: 80px;
  animation: badge-bounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  z-index: 1;
}

@keyframes badge-bounce {
  0% { transform: scale(0) rotate(-180deg); }
  100% { transform: scale(1) rotate(0); }
}

.unlock-text {
  margin-bottom: 24px;
}

.unlock-title {
  font-size: 18px;
  font-weight: 700;
  color: #4CAF50;
  margin-bottom: 12px;
}

.badge-name {
  font-size: 24px;
  font-weight: 700;
  color: #333;
  margin-bottom: 8px;
}

.badge-desc {
  font-size: 14px;
  color: #666;
}

.close-btn {
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  color: white;
  border: none;
  padding: 14px 40px;
  border-radius: 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.close-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(76, 175, 80, 0.4);
}

/* Transition animations */
.unlock-enter-active,
.unlock-leave-active {
  transition: all 0.3s ease;
}

.unlock-enter-from,
.unlock-leave-to {
  opacity: 0;
}

.unlock-enter-from .unlock-content,
.unlock-leave-to .unlock-content {
  transform: scale(0.9);
}
</style>
