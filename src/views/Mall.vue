<template>
  <div class="mall-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <span class="header-icon">🎁</span>
        <div class="header-text">
          <h2>兑换商城</h2>
          <p>用努力换来的金币，兑换心仪的奖品</p>
        </div>
      </div>

      <!-- 孩子选择器 -->
      <div class="child-selector">
        <label>👶 选择孩子：</label>
        <select v-model="selectedChildId" @change="loadOrders">
          <option v-for="child in children" :key="child.id" :value="child.id">
            {{ child.avatar?.startsWith('data:') ? '' : (child.avatar || '👶') }} {{ child.name }} ({{ child.current_balance }}💰 {{ child.gem_balance || 0 }}💎)
          </option>
        </select>
      </div>
    </div>

    <!-- 我的订单按钮 -->
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div class="card-title" style="margin: 0;">🏪 奖品列表</div>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-primary" @click="showAddPrizeModal = true">
            ➕ 添加奖品
          </button>
          <button class="btn btn-secondary" @click="showOrders = true">
            📋 我的订单
          </button>
        </div>
      </div>
    </div>

    <!-- 奖品网格 -->
    <div v-if="loading" class="loading-state">
      <span class="loading-spinner">🔄</span>
      <p>加载奖品中...</p>
    </div>

    <div v-else-if="prizes.length === 0" class="empty-state">
      <span class="empty-emoji">🎁</span>
      <p>暂无奖品，请先添加</p>
      <button class="btn btn-primary" @click="showAddPrizeModal = true">
        ➕ 添加奖品
      </button>
    </div>

    <div v-else class="prizes-grid">
      <div
        v-for="prize in prizes"
        :key="prize.id"
        class="prize-card"
        :class="{ 'out-of-stock': prize.stock <= 0 }"
      >
        <!-- 库存标签 -->
        <div class="stock-badge" :class="{ 'low': prize.stock <= 3, 'empty': prize.stock <= 0 }">
          {{ prize.stock <= 0 ? '已售罄' : `剩余 ${prize.stock} 件` }}
        </div>

        <!-- 奖品类型标签 -->
        <div class="prize-type-badge" :class="prize.price_type || 'coins'">
          {{ (prize.price_type || 'coins') === 'coins' ? '💰 金币兑换' : '💎 宝石专属' }}
        </div>

        <!-- 奖品图片 -->
        <div class="prize-image">
          <img v-if="prize.image" :src="prize.image" :alt="prize.name" />
          <span v-else class="prize-emoji">🎁</span>
        </div>

        <!-- 奖品信息 -->
        <div class="prize-info">
          <h3 class="prize-name">{{ prize.name }}</h3>
          <p class="prize-desc">{{ prize.description || '暂无描述' }}</p>

          <div class="prize-price">
            <span class="price-icon">{{ (prize.price_type || 'coins') === 'coins' ? '💰' : '💎' }}</span>
            <span class="price-value" :class="prize.price_type || 'coins'">{{ prize.price }}</span>
            <span class="price-unit">{{ (prize.price_type || 'coins') === 'coins' ? '金币' : '宝石' }}</span>
          </div>
        </div>

        <!-- 兑换按钮 -->
        <button
          class="btn exchange-btn"
          :class="getExchangeBtnClass(prize)"
          :disabled="!canExchange(prize)"
          @click="openExchangeModal(prize)"
        >
          <span v-if="prize.stock <= 0">已售罄</span>
          <span v-else-if="!selectedChild">请先选择孩子</span>
          <span v-else-if="(prize.price_type || 'coins') === 'gems' && (selectedChild.gem_balance || 0) < prize.price">
            💎 宝石不足 (还差 {{ prize.price - (selectedChild.gem_balance || 0) }})
          </span>
          <span v-else-if="(prize.price_type || 'coins') === 'coins' && selectedChild.current_balance < prize.price">
            💰 金币不足 (还差 {{ prize.price - selectedChild.current_balance }})
          </span>
          <span v-else>
            帮 {{ selectedChild?.name }} 兑换
          </span>
        </button>
        
        <!-- 快捷兑换按钮组 -->
        <div v-if="canExchange(prize) && prize.stock > 0" class="quick-exchange-btns">
          <button 
            v-for="n in [1, 3, 5]" 
            :key="n"
            class="btn quick-exchange-btn"
            :class="{ 'disabled': prize.stock < n || !canExchangeMultiple(prize, n) }"
            :disabled="prize.stock < n || !canExchangeMultiple(prize, n)"
            @click="quickExchange(prize, n)"
          >
            {{ n }}个
          </button>
          <button 
            class="btn quick-exchange-btn custom"
            @click="openCustomQuantityModal(prize)"
          >
            自定义
          </button>
        </div>

        <!-- 管理按钮 -->
        <div class="prize-actions">
          <button class="btn btn-small btn-secondary" @click="editPrize(prize)">
            ✏️ 编辑
          </button>
          <button class="btn btn-small btn-danger" @click="deletePrize(prize)">
            🗑️ 删除
          </button>
        </div>
      </div>
    </div>

    <!-- 添加/编辑奖品弹窗 -->
    <div v-if="showAddPrizeModal" class="modal-overlay" @click.self="closeAddPrizeModal">
      <div class="modal prize-modal">
        <div class="modal-header">
          <h3>{{ editingPrize ? '✏️ 编辑奖品' : '➕ 添加奖品' }}</h3>
          <button class="close-btn" @click="closeAddPrizeModal">&times;</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>奖品名称 *</label>
            <input v-model="prizeForm.name" type="text" placeholder="例如：乐高积木" />
          </div>

          <div class="form-group">
            <label>奖品图片</label>
            <div class="image-upload">
              <div v-if="prizeForm.image" class="image-preview">
                <img :src="prizeForm.image" />
                <button class="remove-image" @click="prizeForm.image = ''">&times;</button>
              </div>
              <label v-else class="upload-btn">
                <input type="file" accept="image/*" @change="handleImageUpload" hidden />
                <span>📷 上传图片</span>
              </label>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>货币类型 *</label>
              <div class="currency-selector">
                <label class="currency-option" :class="{ active: prizeForm.price_type === 'coins' }">
                  <input type="radio" v-model="prizeForm.price_type" value="coins" />
                  <span class="currency-icon">💰</span>
                  <span>金币</span>
                </label>
                <label class="currency-option" :class="{ active: prizeForm.price_type === 'gems' }">
                  <input type="radio" v-model="prizeForm.price_type" value="gems" />
                  <span class="currency-icon">💎</span>
                  <span>宝石</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label>所需{{ prizeForm.price_type === 'gems' ? '宝石' : '金币' }} *</label>
              <input v-model.number="prizeForm.price" type="number" min="1" :placeholder="prizeForm.price_type === 'gems' ? '5' : '100'" />
            </div>
          </div>

          <div class="form-group">
            <label>库存数量 *</label>
            <input v-model.number="prizeForm.stock" type="number" min="0" placeholder="10" />
          </div>

          <div class="form-group">
            <label>奖品描述</label>
            <textarea v-model="prizeForm.description" rows="3" placeholder="描述一下这个奖品..."></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn" @click="closeAddPrizeModal">取消</button>
          <button class="btn btn-primary" @click="savePrize" :disabled="!prizeForm.name || !prizeForm.price">
            {{ editingPrize ? '💾 保存修改' : '💾 保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 兑换确认弹窗 -->
    <div v-if="showExchangeModal" class="modal-overlay" @click.self="closeExchangeModal">
      <div class="modal exchange-confirm-modal">
        <div class="modal-header">
          <h3>🎁 确认兑换</h3>
          <button class="close-btn" @click="closeExchangeModal">&times;</button>
        </div>

        <div class="modal-body">
          <div class="confirm-info">
            <div class="confirm-item">
              <span class="label">兑换奖品：</span>
              <span class="value">{{ selectedPrize?.name }}</span>
            </div>
            <div class="confirm-item">
              <span class="label">兑换数量：</span>
              <span class="value">{{ exchangeQuantity }} 个</span>
            </div>
            <div class="confirm-item">
              <span class="label">需要{{ (selectedPrize?.price_type || 'coins') === 'gems' ? '宝石' : '金币' }}：</span>
              <span class="value price">{{ (selectedPrize?.price || 0) * exchangeQuantity }} {{ (selectedPrize?.price_type || 'coins') === 'gems' ? '💎' : '💰' }}</span>
            </div>
            <div class="confirm-item">
              <span class="label">兑换给：</span>
              <span class="value">{{ selectedChild?.name }}</span>
            </div>
            <div class="confirm-item">
              <span class="label">兑换后余额：</span>
              <span class="value">
                {{ (selectedPrize?.price_type || 'coins') === 'gems' 
                  ? ((selectedChild?.gem_balance || 0) - (selectedPrize?.price || 0) * exchangeQuantity) 
                  : (selectedChild?.current_balance - (selectedPrize?.price || 0) * exchangeQuantity) 
                }} {{ (selectedPrize?.price_type || 'coins') === 'gems' ? '💎' : '💰' }}
              </span>
            </div>
          </div>

          <div class="form-group">
            <label>💬 鼓励的话（可选）</label>
            <textarea
              v-model="exchangeMessage"
              rows="3"
              placeholder="例如：这是你努力练琴的奖励！继续加油！"
            ></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn" @click="closeExchangeModal">取消</button>
          <button class="btn btn-primary" @click="confirmExchange" :disabled="exchanging">
            <span v-if="exchanging">兑换中...</span>
            <span v-else>✨ 确认兑换 {{ exchangeQuantity }} 个</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 自定义数量弹窗 -->
    <div v-if="showCustomQuantityModal" class="modal-overlay" @click.self="closeCustomQuantityModal">
      <div class="modal">
        <div class="modal-header">
          <h3>🎁 选择兑换数量</h3>
          <button class="close-btn" @click="closeCustomQuantityModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>奖品：{{ customQuantityPrize?.name }}</label>
            <div style="text-align: center; font-size: 3rem; margin: 10px 0;">
              {{ customQuantityPrize?.image ? '' : (customQuantityPrize?.emoji || '🎁') }}
              <img v-if="customQuantityPrize?.image" :src="customQuantityPrize.image" style="width: 80px; height: 80px; object-fit: cover; border-radius: 10px;" />
            </div>
          </div>
          <div class="form-group">
            <label>兑换数量（库存：{{ customQuantityPrize?.stock || 0 }} 件）</label>
            <div class="quantity-selector">
              <button class="btn quantity-btn" @click="customQuantity = Math.max(1, customQuantity - 1)" :disabled="customQuantity <= 1">-</button>
              <input v-model.number="customQuantity" type="number" min="1" :max="customQuantityPrize?.stock || 1" class="quantity-input" />
              <button class="btn quantity-btn" @click="customQuantity = Math.min(customQuantityPrize?.stock || 1, customQuantity + 1)" :disabled="customQuantity >= (customQuantityPrize?.stock || 1)">+</button>
            </div>
          </div>
          <div class="form-group">
            <label>需要支付：{{ ((customQuantityPrize?.price || 0) * customQuantity) }} {{ (customQuantityPrize?.price_type || 'coins') === 'gems' ? '💎' : '💰' }}</label>
            <div style="font-size: 0.9rem; color: #666; margin-top: 5px;">
              当前余额：{{ (customQuantityPrize?.price_type || 'coins') === 'gems' ? (selectedChild?.gem_balance || 0) : (selectedChild?.current_balance || 0) }} {{ (customQuantityPrize?.price_type || 'coins') === 'gems' ? '💎' : '💰' }}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="closeCustomQuantityModal">取消</button>
          <button class="btn btn-primary" @click="confirmCustomQuantity" :disabled="!canExchangeMultiple(customQuantityPrize, customQuantity)">
            确认兑换
          </button>
        </div>
      </div>
    </div>

    <!-- 颁奖仪式页 -->
    <div v-if="showCelebration" class="celebration-overlay">
      <canvas ref="confettiCanvas" class="confetti-canvas"></canvas>

      <div class="celebration-content">
        <div class="certificate">
          <div class="certificate-border">
            <div class="certificate-inner">
              <div class="certificate-header">
                <span class="trophy">🏆</span>
                <h2>荣誉兑换证书</h2>
                <span class="trophy">🏆</span>
              </div>

              <div class="certificate-body">
                <p class="congrats">恭喜</p>
                <p class="child-name">{{ celebrationData?.childName }}</p>
                <p class="achievement">
                  成功兑换 <strong>{{ celebrationData?.prizeName }}</strong>
                </p>
                <p class="message" v-if="celebrationData?.message">
                  "{{ celebrationData?.message }}"
                </p>
                <p class="date">{{ new Date().toLocaleDateString('zh-CN') }}</p>
              </div>

              <div class="certificate-seal">
                <span class="seal">🎖️</span>
              </div>
            </div>
          </div>
        </div>

        <div class="celebration-actions">
          <button class="btn btn-secondary" @click="printCertificate">
            🖨️ 打印/截图保存
          </button>
          <button class="btn btn-primary" @click="closeCelebration">
            我知道了，去发奖
          </button>
        </div>
      </div>
    </div>

    <!-- 订单列表弹窗 -->
    <div v-if="showOrders" class="modal-overlay" @click.self="showOrders = false">
      <div class="modal orders-modal">
        <div class="modal-header">
          <h3>📋 兑换订单</h3>
          <button class="close-btn" @click="showOrders = false">&times;</button>
        </div>

        <div class="modal-body">
          <div v-if="orders.length === 0" class="empty-orders">
            <span class="empty-emoji">📭</span>
            <p>暂无兑换记录</p>
          </div>

          <div v-else class="orders-list">
            <div v-for="order in orders" :key="order.id" class="order-item">
              <div class="order-prize">
                <img v-if="order.prize_image" :src="order.prize_image" />
                <span v-else class="prize-emoji">🎁</span>
              </div>
              <div class="order-info">
                <div class="order-title">{{ order.prize_name }}</div>
                <div class="order-meta">
                  <span>兑换给：{{ order.child_name }}</span>
                  <span class="order-price">-{{ order.price }} 金币</span>
                </div>
                <div class="order-date">{{ formatDate(order.created_at) }}</div>
                <div v-if="order.message" class="order-message">
                  💬 {{ order.message }}
                </div>
              </div>
              <div class="order-status" :class="order.status">
                {{ getStatusText(order.status) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase } from '../utils/supabase.js'

// 数据
const children = ref([])
const prizes = ref([])
const orders = ref([])
const loading = ref(false)
const selectedChildId = ref('')
const exchanging = ref(false)

// 实时订阅
let subscriptions = []

// 弹窗状态
const showAddPrizeModal = ref(false)
const showExchangeModal = ref(false)
const showCelebration = ref(false)
const showOrders = ref(false)
const showCustomQuantityModal = ref(false)  // 自定义数量弹窗
const editingPrize = ref(null)  // 当前编辑的奖品，null表示添加模式

// 选中数据
const selectedPrize = ref(null)
const exchangeMessage = ref('')
const exchangeQuantity = ref(1)  // 兑换数量
const customQuantityPrize = ref(null)  // 自定义数量时的奖品
const customQuantity = ref(1)  // 自定义数量值
const celebrationData = ref(null)

// 奖品表单
const prizeForm = ref({
  name: '',
  description: '',
  price_type: 'coins',
  price: 100,
  stock: 10,
  image: ''
})

// 计算属性
const selectedChild = computed(() => {
  return children.value.find(c => c.id === selectedChildId.value)
})

// 加载孩子列表
async function loadChildren() {
  console.log('🔄 Mall: 开始加载孩子列表...')
  const { data, error } = await supabase.from('children').select('*').order('name')
  if (error) {
    console.error('❌ Mall: 加载孩子失败:', error)
    return
  }

  // 批量获取所有孩子的交易记录（一次性查询）
  const childIds = (data || []).map(c => c.id)
  let transactionsMap = {}

  if (childIds.length > 0) {
    const { data: allTransactions } = await supabase
      .from('transactions')
      .select('child_id, type, points')
      .in('child_id', childIds)

    // 按孩子ID分组
    allTransactions?.forEach(tx => {
      if (!transactionsMap[tx.child_id]) {
        transactionsMap[tx.child_id] = { earned: 0, spent: 0 }
      }
      if (tx.type === 'earn') {
        transactionsMap[tx.child_id].earned += tx.points
      } else {
        transactionsMap[tx.child_id].spent += tx.points
      }
    })
  }

  // 合并数据 - 优先使用数据库的 current_balance，不一致时自动修复
  const childrenWithBalance = (data || []).map(child => {
    const tx = transactionsMap[child.id] || { earned: 0, spent: 0 }
    const calculatedBalance = tx.earned - tx.spent
    const dbBalance = child.current_balance || 0

    // 如果数据库余额与计算余额差异超过0.01，说明有未记录的变动（如兑换）
    // 优先信任数据库值，同时记录日志
    if (Math.abs(dbBalance - calculatedBalance) > 0.01) {
      console.log(`⚠️ 余额不一致 ${child.name}: 数据库=${dbBalance}, 计算=${calculatedBalance}, 使用数据库值`)
    }

    return {
      ...child,
      current_balance: dbBalance  // 优先使用数据库值
    }
  })

  children.value = childrenWithBalance
  console.log('✅ Mall: 加载到', children.value.length, '个孩子')
  children.value.forEach(c => {
    console.log(`  - ${c.name}: ${c.current_balance}金币, ${c.gem_balance || 0}宝石`)
  })

  if (children.value.length > 0 && !selectedChildId.value) {
    selectedChildId.value = children.value[0].id
    console.log('🎯 Mall: 自动选中第一个孩子:', children.value[0].name)
  }
}

// 加载奖品列表
async function loadPrizes() {
  loading.value = true
  const { data } = await supabase
    .from('prizes')
    .select('*')
    .order('created_at', { ascending: false })
  prizes.value = data || []
  loading.value = false
}

// 加载订单列表
async function loadOrders() {
  if (!selectedChildId.value) return

  const { data } = await supabase
    .from('orders')
    .select(`
      *,
      prize:prize_id(name, image),
      child:child_id(name)
    `)
    .eq('child_id', selectedChildId.value)
    .order('created_at', { ascending: false })

  orders.value = (data || []).map(o => ({
    ...o,
    prize_name: o.prize?.name,
    prize_image: o.prize?.image,
    child_name: o.child?.name
  }))
}

// 判断是否可以兑换
function canExchange(prize) {
  if (!selectedChild.value) return false
  if (prize.stock <= 0) return false

  const priceType = prize.price_type || 'coins'
  if (priceType === 'gems') {
    return (selectedChild.value.gem_balance || 0) >= prize.price
  }
  return selectedChild.value.current_balance >= prize.price
}

// 获取兑换按钮样式
function getExchangeBtnClass(prize) {
  if (prize.stock <= 0) return 'disabled'
  if (!selectedChild.value) return 'disabled'

  const priceType = prize.price_type || 'coins'
  if (priceType === 'gems') {
    if ((selectedChild.value.gem_balance || 0) < prize.price) return 'insufficient'
  } else {
    if (selectedChild.value.current_balance < prize.price) return 'insufficient'
  }
  return 'primary'
}

// 判断是否可以兑换多个
function canExchangeMultiple(prize, quantity) {
  if (!selectedChild.value || !prize) return false
  if (prize.stock < quantity) return false

  const priceType = prize.price_type || 'coins'
  const totalPrice = prize.price * quantity
  if (priceType === 'gems') {
    return (selectedChild.value.gem_balance || 0) >= totalPrice
  }
  return selectedChild.value.current_balance >= totalPrice
}

// 打开兑换弹窗
async function openExchangeModal(prize) {
  if (!canExchange(prize)) return

  // 直接使用本地缓存的孩子数据，避免刷新
  // 如果需要刷新，使用防抖或节流
  
  // 再次检查是否可以兑换
  if (!canExchange(prize)) {
    alert('兑换条件已变化，请刷新页面后重试')
    return
  }

  selectedPrize.value = prize
  exchangeQuantity.value = 1  // 默认1个
  exchangeMessage.value = ''
  showExchangeModal.value = true
}

// 关闭兑换弹窗
function closeExchangeModal() {
  showExchangeModal.value = false
  selectedPrize.value = null
  exchangeQuantity.value = 1
  exchangeMessage.value = ''
}

// 快捷兑换
function quickExchange(prize, quantity) {
  if (!canExchangeMultiple(prize, quantity)) return
  
  selectedPrize.value = prize
  exchangeQuantity.value = quantity
  exchangeMessage.value = ''
  showExchangeModal.value = true
}

// 打开自定义数量弹窗
function openCustomQuantityModal(prize) {
  customQuantityPrize.value = prize
  customQuantity.value = 1
  showCustomQuantityModal.value = true
}

// 关闭自定义数量弹窗
function closeCustomQuantityModal() {
  showCustomQuantityModal.value = false
  customQuantityPrize.value = null
  customQuantity.value = 1
}

// 确认自定义数量
function confirmCustomQuantity() {
  if (!canExchangeMultiple(customQuantityPrize.value, customQuantity.value)) return
  
  selectedPrize.value = customQuantityPrize.value
  exchangeQuantity.value = customQuantity.value
  exchangeMessage.value = ''
  closeCustomQuantityModal()
  showExchangeModal.value = true
}

// 确认兑换
async function confirmExchange() {
  if (!selectedPrize.value || !selectedChild.value) return

  exchanging.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未登录')

    const prize = selectedPrize.value
    const child = selectedChild.value
    const priceType = prize.price_type || 'coins'
    const quantity = exchangeQuantity.value || 1
    const totalPrice = prize.price * quantity

    // 检查库存是否足够
    if (prize.stock < quantity) {
      throw new Error(`库存不足，当前剩余 ${prize.stock} 件`)
    }

    // 检查余额是否足够
    if (priceType === 'gems') {
      if ((child.gem_balance || 0) < totalPrice) {
        throw new Error(`宝石不足，需要 ${totalPrice} 💎`)
      }
    } else {
      if (child.current_balance < totalPrice) {
        throw new Error(`金币不足，需要 ${totalPrice} 💰`)
      }
    }

    // 1. 扣除货币（金币或宝石）
    const updateData = {}
    if (priceType === 'gems') {
      updateData.gem_balance = (child.gem_balance || 0) - totalPrice
    } else {
      updateData.current_balance = child.current_balance - totalPrice
    }

    const { error: childError } = await supabase
      .from('children')
      .update(updateData)
      .eq('id', child.id)

    if (childError) throw childError

    // 2. 减少库存
    const { error: prizeError } = await supabase
      .from('prizes')
      .update({ stock: prize.stock - quantity })
      .eq('id', prize.id)

    if (prizeError) throw prizeError

    // 3. 创建交易记录（金币消费）或宝石交易记录
    if (priceType === 'gems') {
      const { error: gemError } = await supabase.from('gem_transactions').insert({
        child_id: child.id,
        gems: totalPrice,
        type: 'spend',
        note: `兑换奖品：${prize.name} x${quantity} 小艺代填`,
        user_id: user.id
      })
      if (gemError) throw gemError
    } else {
      const { error: txError } = await supabase.from('transactions').insert({
        child_id: child.id,
        points: totalPrice,
        type: 'spend',
        note: `兑换奖品：${prize.name} x${quantity} 小艺代填`,
        rule_id: null,
        user_id: user.id
      })
      if (txError) throw txError
    }

    // 4. 创建订单（临时移除 quantity 列，等待数据库修复）
    const { error: orderError } = await supabase.from('orders').insert({
      child_id: child.id,
      prize_id: prize.id,
      price: totalPrice,
      price_type: priceType,
      // quantity: quantity,  // TODO: 数据库添加 quantity 列后恢复此行
      message: exchangeMessage.value,
      status: 'completed',
      user_id: user.id
    })

    if (orderError) throw orderError

    // 5. 显示颁奖仪式
    celebrationData.value = {
      childName: child.name,
      prizeName: `${prize.name} x${quantity}`,
      message: exchangeMessage.value,
      currency: priceType === 'gems' ? '宝石' : '金币'
    }

    closeExchangeModal()
    showCelebration.value = true

    // 撒花动画
    setTimeout(() => startConfetti(), 100)

    // 刷新数据
    await Promise.all([
      loadChildren(),
      loadPrizes(),
      loadOrders()
    ])
  } catch (error) {
    console.error('兑换失败:', error)
    alert('兑换失败: ' + error.message)
  } finally {
    exchanging.value = false
  }
}

// 撒花动画
function startConfetti() {
  const canvas = document.querySelector('.confetti-canvas')
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight

  const particles = []
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b', '#6c5ce7', '#00b894']

  for (let i = 0; i < 150; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 10 + 5,
      speedY: Math.random() * 3 + 2,
      speedX: Math.random() * 2 - 1,
      rotation: Math.random() * 360,
      rotationSpeed: Math.random() * 10 - 5
    })
  }

  let animationId
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    let activeParticles = 0
    particles.forEach(p => {
      p.y += p.speedY
      p.x += p.speedX
      p.rotation += p.rotationSpeed

      if (p.y < canvas.height) {
        activeParticles++
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
        ctx.restore()
      }
    })

    if (activeParticles > 0 && showCelebration.value) {
      animationId = requestAnimationFrame(animate)
    }
  }

  animate()

  // 5秒后停止
  setTimeout(() => {
    if (animationId) cancelAnimationFrame(animationId)
  }, 5000)
}

// 关闭颁奖仪式
function closeCelebration() {
  showCelebration.value = false
  celebrationData.value = null
}

// 打印证书
function printCertificate() {
  window.print()
}

// 处理图片上传
function handleImageUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  if (file.size > 2 * 1024 * 1024) {
    alert('图片大小不能超过 2MB')
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    prizeForm.value.image = e.target.result
  }
  reader.readAsDataURL(file)
}

// 保存奖品（添加或编辑）
async function savePrize() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未登录')

    const prizeData = {
      name: prizeForm.value.name,
      description: prizeForm.value.description,
      price_type: prizeForm.value.price_type || 'coins',
      price: prizeForm.value.price,
      stock: prizeForm.value.stock,
      image: prizeForm.value.image,
      user_id: user.id
    }

    if (editingPrize.value) {
      // 编辑模式
      const { error } = await supabase
        .from('prizes')
        .update(prizeData)
        .eq('id', editingPrize.value.id)
        .eq('user_id', user.id)

      if (error) throw error
      alert('✅ 奖品修改成功')
    } else {
      // 添加模式
      const { error } = await supabase.from('prizes').insert(prizeData)
      if (error) throw error
      alert('✅ 奖品添加成功')
    }

    closeAddPrizeModal()
    await loadPrizes()
  } catch (error) {
    console.error('保存奖品失败:', error)
    alert('保存失败: ' + error.message)
  }
}

// 关闭添加/编辑奖品弹窗
function closeAddPrizeModal() {
  showAddPrizeModal.value = false
  editingPrize.value = null  // 清空编辑状态
  prizeForm.value = {
    name: '',
    description: '',
    price_type: 'coins',
    price: 100,
    stock: 10,
    image: ''
  }
}

// 删除奖品
async function deletePrize(prize) {
  if (!confirm(`确定要删除奖品 "${prize.name}" 吗？\n\n此操作不可恢复！`)) {
    return
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未登录')

    const { error } = await supabase
      .from('prizes')
      .delete()
      .eq('id', prize.id)
      .eq('user_id', user.id)

    if (error) throw error

    await loadPrizes()
    alert('✅ 奖品已删除')
  } catch (error) {
    console.error('删除奖品失败:', error)
    alert('删除失败: ' + error.message)
  }
}

// 编辑奖品
function editPrize(prize) {
  editingPrize.value = prize
  prizeForm.value = {
    name: prize.name,
    description: prize.description || '',
    price_type: prize.price_type || 'coins',
    price: prize.price,
    stock: prize.stock,
    image: prize.image || ''
  }
  showAddPrizeModal.value = true
}

// 获取状态文本
function getStatusText(status) {
  const statusMap = {
    pending: '待处理',
    completed: '已完成',
    cancelled: '已取消'
  }
  return statusMap[status] || status
}

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  loadChildren()
  loadPrizes()
  if (selectedChildId.value) {
    loadOrders()
  }

  // 设置实时订阅
  const childrenChannel = supabase
    .channel('mall-children-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'children' }, (payload) => {
      console.log('🔄 孩子数据变化:', payload)
      loadChildren()
    })
    .subscribe()

  subscriptions.push(childrenChannel)

  // 页面可见性变化时刷新数据
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  // 清理订阅
  subscriptions.forEach(channel => {
    if (channel && typeof channel.unsubscribe === 'function') {
      channel.unsubscribe()
    }
  })
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

// 页面可见性变化处理
function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    console.log('👁️ 页面重新可见，刷新数据')
    loadChildren()
    loadPrizes()
    if (selectedChildId.value) {
      loadOrders()
    }
  }
}
</script>

<style scoped>
.mall-page {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  font-size: 2.5rem;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-text h2 {
  margin: 0;
  font-size: 1.6rem;
  color: #333;
}

.header-text p {
  margin: 4px 0 0 0;
  color: #868e96;
  font-size: 0.95rem;
}

.child-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}

.child-selector label {
  font-weight: 500;
  color: #495057;
}

.child-selector select {
  padding: 10px 16px;
  border: 2px solid #e9ecef;
  border-radius: 10px;
  font-size: 1rem;
  background: white;
  min-width: 200px;
}

/* 奖品网格 */
.prizes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.prize-card {
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0,0,0,0.08);
  transition: all 0.3s;
  position: relative;
}

.prize-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.12);
}

.prize-card.out-of-stock {
  opacity: 0.7;
}

.stock-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  background: #d3f9d8;
  color: #2b8a3e;
  z-index: 2;
}

.stock-badge.low {
  background: #fff3bf;
  color: #e67700;
}

.stock-badge.empty {
  background: #ffe3e3;
  color: #c92a2a;
}

.prize-image {
  height: 180px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.prize-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.prize-emoji {
  font-size: 4rem;
}

.prize-info {
  padding: 20px;
}

.prize-name {
  font-size: 1.2rem;
  font-weight: 700;
  color: #333;
  margin: 0 0 8px 0;
}

.prize-desc {
  font-size: 0.9rem;
  color: #868e96;
  margin: 0 0 16px 0;
  line-height: 1.5;
  min-height: 40px;
}

.prize-price {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 16px;
}

.price-icon {
  font-size: 1.2rem;
}

.price-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f5576c;
}

.price-value.gems {
  color: #9b59b6;
}

.price-unit {
  font-size: 0.9rem;
  color: #868e96;
}

/* 奖品类型标签 */
.prize-type-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  z-index: 2;
}

.prize-type-badge.coins {
  background: #fff3bf;
  color: #e67700;
}

.prize-type-badge.gems {
  background: #e7d8f3;
  color: #7b2cbf;
}

.exchange-btn {
  width: calc(100% - 40px);
  margin: 0 20px 20px;
  padding: 14px;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.3s;
}

.exchange-btn.primary {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  border: none;
}

.exchange-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(17, 153, 142, 0.4);
}

.exchange-btn.insufficient {
  background: #e9ecef;
  color: #868e96;
  border: none;
  cursor: not-allowed;
}

.exchange-btn.disabled {
  background: #ffe3e3;
  color: #c92a2a;
  border: none;
  cursor: not-allowed;
}

/* 空状态 */
.loading-state,
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #868e96;
}

.loading-spinner {
  font-size: 3rem;
  display: block;
  margin-bottom: 16px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.empty-emoji {
  font-size: 4rem;
  display: block;
  margin-bottom: 16px;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e9ecef;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.3rem;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #adb5bd;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s;
}

.close-btn:hover {
  background: #f8f9fa;
  color: #495057;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e9ecef;
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

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e9ecef;
  border-radius: 10px;
  font-size: 1rem;
  transition: all 0.3s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* 图片上传 */
.image-upload {
  margin-bottom: 8px;
}

.image-preview {
  position: relative;
  width: 100%;
  height: 150px;
  border-radius: 12px;
  overflow: hidden;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-image {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #ff6b6b;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 1rem;
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 500;
}

/* 货币选择器 */
.currency-selector {
  display: flex;
  gap: 12px;
}

.currency-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: 2px solid #e9ecef;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
  background: white;
}

.currency-option:hover {
  border-color: #adb5bd;
}

.currency-option.active {
  border-color: #667eea;
  background: #f3f0ff;
}

.currency-option input {
  display: none;
}

.currency-icon {
  font-size: 1.2rem;
}

/* 确认信息 */
.confirm-info {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.confirm-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #e9ecef;
}

.confirm-item:last-child {
  border-bottom: none;
}

.confirm-item .label {
  color: #868e96;
}

.confirm-item .value {
  font-weight: 600;
  color: #333;
}

.confirm-item .value.price {
  color: #f5576c;
}

/* 颁奖仪式 */
.celebration-overlay {
  position: fixed;
  inset: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.confetti-canvas {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.celebration-content {
  position: relative;
  z-index: 1;
  text-align: center;
}

.certificate {
  background: white;
  padding: 20px;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  margin-bottom: 30px;
}

.certificate-border {
  border: 4px solid #ffd43b;
  border-radius: 16px;
  padding: 8px;
}

.certificate-inner {
  border: 2px solid #fcc419;
  border-radius: 12px;
  padding: 40px;
  background: linear-gradient(135deg, #fffef0 0%, #fff9db 100%);
}

.certificate-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 30px;
}

.certificate-header h2 {
  font-size: 2rem;
  color: #f08c00;
  margin: 0;
  font-family: serif;
}

.trophy {
  font-size: 2.5rem;
}

.certificate-body {
  text-align: center;
}

.congrats {
  font-size: 1.3rem;
  color: #495057;
  margin-bottom: 8px;
}

.child-name {
  font-size: 2.5rem;
  font-weight: 700;
  color: #f5576c;
  margin: 16px 0;
}

.achievement {
  font-size: 1.2rem;
  color: #495057;
  margin-bottom: 20px;
}

.achievement strong {
  color: #f08c00;
  font-size: 1.4rem;
}

.message {
  font-style: italic;
  color: #667eea;
  font-size: 1.1rem;
  padding: 16px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 12px;
  margin: 20px 0;
}

.date {
  color: #868e96;
  font-size: 0.95rem;
  margin-top: 20px;
}

.certificate-seal {
  margin-top: 30px;
}

.seal {
  font-size: 4rem;
}

.celebration-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.celebration-actions .btn {
  padding: 14px 28px;
  font-size: 1rem;
}

/* 订单列表 */
.orders-modal {
  max-width: 600px;
}

.empty-orders {
  text-align: center;
  padding: 40px;
  color: #868e96;
}

.orders-list {
  max-height: 500px;
  overflow-y: auto;
}

.order-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 12px;
  margin-bottom: 12px;
}

.order-prize {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.order-prize img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.order-info {
  flex: 1;
}

.order-title {
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.order-meta {
  display: flex;
  gap: 12px;
  font-size: 0.85rem;
  color: #868e96;
  margin-bottom: 4px;
}

.order-price {
  color: #f5576c;
  font-weight: 600;
}

.order-date {
  font-size: 0.8rem;
  color: #adb5bd;
}

.order-message {
  margin-top: 8px;
  padding: 8px 12px;
  background: #e7f3ff;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #364fc7;
}

.order-status {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  height: fit-content;
}

.order-status.completed {
  background: #d3f9d8;
  color: #2b8a3e;
}

/* 按钮样式 */
.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.3s;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #e9ecef;
  color: #495057;
}

.btn-secondary:hover {
  background: #dee2e6;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 快捷兑换按钮 */
.quick-exchange-btns {
  display: flex;
  gap: 8px;
  padding: 0 20px 20px;
  justify-content: center;
  flex-wrap: wrap;
}

.quick-exchange-btn {
  padding: 6px 12px;
  font-size: 0.85rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.quick-exchange-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.quick-exchange-btn.disabled {
  background: #e9ecef;
  color: #adb5bd;
  cursor: not-allowed;
}

.quick-exchange-btn.custom {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
}

/* 数量选择器 */
.quantity-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 15px 0;
}

.quantity-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 1.2rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  cursor: pointer;
  transition: all 0.3s;
}

.quantity-btn:hover:not(:disabled) {
  transform: scale(1.1);
}

.quantity-btn:disabled {
  background: #e9ecef;
  color: #adb5bd;
  cursor: not-allowed;
}

.quantity-input {
  width: 80px;
  height: 40px;
  text-align: center;
  font-size: 1.2rem;
  font-weight: bold;
  border: 2px solid #e9ecef;
  border-radius: 10px;
  outline: none;
}

.quantity-input:focus {
  border-color: #667eea;
}

/* 打印样式 */
@media print {
  .celebration-overlay {
    position: static;
    background: white;
  }

  .confetti-canvas,
  .celebration-actions {
    display: none;
  }

  .certificate {
    box-shadow: none;
    page-break-inside: avoid;
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .prizes-grid {
    grid-template-columns: 1fr;
  }

  .certificate-inner {
    padding: 24px;
  }

  .child-name {
    font-size: 1.8rem;
  }

  .celebration-actions {
    flex-direction: column;
  }
}
</style>