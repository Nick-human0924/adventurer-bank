/**
 * 状态机系统 - 关键业务流程管理
 * 兑换流程：防重复、可恢复、可观测
 */

// 兑换流程状态定义
export const ExchangeStates = {
  INIT: 'init',
  VALIDATING: 'validating',           // 验证参数
  BALANCE_CHECKING: 'balance_checking', // 检查余额
  DEDUCTION_PENDING: 'deduction_pending', // 扣减金币（关键）
  DEDUCTION_CONFIRMED: 'deduction_confirmed', // 扣减成功
  ORDER_CREATING: 'order_creating',    // 创建订单
  ORDER_CONFIRMED: 'order_confirmed',  // 订单创建成功
  REWARD_DELIVERED: 'reward_delivered', // 奖励发放
  COMPLETED: 'completed',              // 完成
  
  // 错误状态
  INVALID: 'invalid',                  // 参数无效
  INSUFFICIENT_BALANCE: 'insufficient_balance', // 余额不足
  DEDUCTION_FAILED: 'deduction_failed', // 扣减失败
  ORDER_FAILED: 'order_failed',        // 订单创建失败
  RECOVERY_NEEDED: 'recovery_needed'   // 需要人工介入
}

// 状态转换图
const StateTransitions = {
  [ExchangeStates.INIT]: ['validating'],
  [ExchangeStates.VALIDATING]: ['balance_checking', 'invalid'],
  [ExchangeStates.BALANCE_CHECKING]: ['deduction_pending', 'insufficient_balance'],
  [ExchangeStates.DEDUCTION_PENDING]: ['deduction_confirmed', 'deduction_failed'],
  [ExchangeStates.DEDUCTION_CONFIRMED]: ['order_creating'],
  [ExchangeStates.ORDER_CREATING]: ['order_confirmed', 'order_failed'],
  [ExchangeStates.ORDER_FAILED]: ['recovery_needed', 'deduction_pending'], // 可重试
  [ExchangeStates.ORDER_CONFIRMED]: ['reward_delivered'],
  [ExchangeStates.REWARD_DELIVERED]: ['completed'],
  [ExchangeStates.DEDUCTION_FAILED]: ['recovery_needed']
}

class ExchangeStateMachine {
  constructor(exchangeId, options = {}) {
    this.id = exchangeId || `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.state = ExchangeStates.INIT
    this.context = {
      childId: null,
      productId: null,
      quantity: 1,
      cost: 0,
      transactionId: null,
      orderId: null,
      error: null,
      retryCount: 0,
      maxRetries: 3,
      ...options
    }
    this.history = []
    this.startTime = Date.now()
    this.persistKey = `exchange_${this.id}`
    
    // 尝试恢复状态
    this.restoreState()
  }

  // 状态转移
  async transition(toState, metadata = {}) {
    const validTransitions = StateTransitions[this.state] || []
    
    if (!validTransitions.includes(toState)) {
      throw new Error(
        `Invalid state transition: ${this.state} -> ${toState}. ` +
        `Valid transitions: ${validTransitions.join(', ')}`
      )
    }
    
    const transition = {
      from: this.state,
      to: toState,
      timestamp: Date.now(),
      ...metadata
    }
    
    this.history.push(transition)
    this.state = toState
    
    // 持久化状态（关键！故障恢复用）
    this.persistState()
    
    console.log(`🔄 Exchange ${this.id}: ${transition.from} -> ${toState}`)
    return transition
  }

  // 持久化到localStorage
  persistState() {
    try {
      const data = {
        id: this.id,
        state: this.state,
        context: this.context,
        history: this.history,
        startTime: this.startTime,
        updatedAt: Date.now()
      }
      localStorage.setItem(this.persistKey, JSON.stringify(data))
    } catch (e) {
      console.warn('Failed to persist state:', e)
    }
  }

  // 从localStorage恢复
  restoreState() {
    try {
      const data = localStorage.getItem(this.persistKey)
      if (data) {
        const parsed = JSON.parse(data)
        // 只恢复进行中的交换（已完成的不恢复）
        if (!['completed', 'recovery_needed'].includes(parsed.state)) {
          this.state = parsed.state
          this.context = { ...this.context, ...parsed.context }
          this.history = parsed.history || []
          console.log(`📂 Restored exchange ${this.id} at state: ${this.state}`)
          return true
        }
      }
    } catch (e) {
      console.warn('Failed to restore state:', e)
    }
    return false
  }

  // 清理持久化数据
  cleanup() {
    try {
      localStorage.removeItem(this.persistKey)
    } catch (e) {
      console.warn('Failed to cleanup state:', e)
    }
  }

  // 检查是否可重试
  canRetry() {
    return this.context.retryCount < this.context.maxRetries
  }

  // 获取恢复点（从哪个状态继续）
  getRecoveryPoint() {
    // 如果扣减已确认但订单未创建，从订单创建开始
    if (this.state === ExchangeStates.DEDUCTION_CONFIRMED || 
        this.state === ExchangeStates.ORDER_FAILED) {
      return ExchangeStates.ORDER_CREATING
    }
    
    // 如果扣减未完成，从头开始
    if (['init', 'validating', 'balance_checking'].includes(this.state)) {
      return ExchangeStates.INIT
    }
    
    // 其他情况需要人工介入
    return null
  }

  // 获取状态摘要
  getSummary() {
    return {
      id: this.id,
      state: this.state,
      isTerminal: ['completed', 'recovery_needed', 'invalid', 'insufficient_balance'].includes(this.state),
      isError: ['deduction_failed', 'order_failed', 'recovery_needed'].includes(this.state),
      duration: Date.now() - this.startTime,
      retryCount: this.context.retryCount,
      canRetry: this.canRetry(),
      recoveryPoint: this.getRecoveryPoint()
    }
  }
}

// 状态机管理器
class StateMachineManager {
  constructor() {
    this.machines = new Map()
    this.loadActiveMachines()
  }

  // 创建新状态机
  create(options = {}) {
    const machine = new ExchangeStateMachine(null, options)
    this.machines.set(machine.id, machine)
    return machine
  }

  // 获取状态机
  get(id) {
    return this.machines.get(id)
  }

  // 加载所有活动的本地状态机
  loadActiveMachines() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('exchange_')) {
          const id = key.replace('exchange_', '')
          const machine = new ExchangeStateMachine(id)
          if (machine.state !== 'init') {
            this.machines.set(id, machine)
            console.log(`📂 Loaded active exchange: ${id} at ${machine.state}`)
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load active machines:', e)
    }
  }

  // 获取所有活动交换
  getActiveExchanges() {
    return Array.from(this.machines.values()).filter(m => 
      !['completed', 'recovery_needed'].includes(m.state)
    )
  }

  // 获取需要恢复的交换
  getRecoveryNeeded() {
    return Array.from(this.machines.values()).filter(m => 
      ['deduction_confirmed', 'order_failed'].includes(m.state)
    )
  }
}

// 单例
export const stateMachineManager = new StateMachineManager()

// 便捷函数
export function createExchange(options) {
  return stateMachineManager.create(options)
}

export function getExchange(id) {
  return stateMachineManager.get(id)
}

export { ExchangeStateMachine, StateMachineManager }
