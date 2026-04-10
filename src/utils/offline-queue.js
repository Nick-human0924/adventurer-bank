/**
 * 离线队列系统 - 基于IndexedDB
 * 网络故障时本地排队，恢复后自动同步
 */

const DB_NAME = 'behavior_bank_offline'
const DB_VERSION = 1
const STORE_NAME = 'pending_operations'

class OfflineQueue {
  constructor() {
    this.db = null
    this.isOnline = navigator.onLine
    this.syncInProgress = false
    this.listeners = []
    
    // 监听网络状态
    window.addEventListener('online', () => this.handleOnline())
    window.addEventListener('offline', () => this.handleOffline())
  }

  // 初始化IndexedDB
  async init() {
    if (this.db) return this.db
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('type', 'type', { unique: false })
          store.createIndex('status', 'status', { unique: false })
        }
      }
    })
  }

  // 网络恢复处理
  async handleOnline() {
    console.log('🌐 网络已恢复，启动同步...')
    this.isOnline = true
    this.notifyListeners({ type: 'online' })
    await this.syncPendingOperations()
  }

  // 网络断开处理
  handleOffline() {
    console.log('📴 网络已断开，切换到离线模式')
    this.isOnline = false
    this.notifyListeners({ type: 'offline' })
  }

  // 添加操作到队列
  async enqueue(operation) {
    await this.init()
    
    const record = {
      type: operation.type,        // 'transaction', 'order', 'task_complete' 等
      payload: operation.payload,  // 操作数据
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
      maxRetries: 8
    }
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_NAME], 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.add(record)
      
      request.onsuccess = () => {
        console.log(`📥 操作已加入离线队列: ${operation.type}`)
        resolve(request.result)
      }
      request.onerror = () => reject(request.error)
    })
  }

  // 获取待处理操作
  async getPendingOperations() {
    await this.init()
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_NAME], 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const index = store.index('status')
      const request = index.getAll('pending')
      
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  // 更新操作状态
  async updateOperation(id, updates) {
    await this.init()
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_NAME], 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(id)
      
      request.onsuccess = () => {
        const record = request.result
        if (record) {
          Object.assign(record, updates)
          const updateRequest = store.put(record)
          updateRequest.onsuccess = () => resolve(record)
          updateRequest.onerror = () => reject(updateRequest.error)
        } else {
          reject(new Error('Record not found'))
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  // 删除已完成操作
  async removeOperation(id) {
    await this.init()
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_NAME], 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.delete(id)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // 同步待处理操作
  async syncPendingOperations() {
    if (this.syncInProgress || !this.isOnline) return
    
    this.syncInProgress = true
    this.notifyListeners({ type: 'sync_start' })
    
    try {
      const pending = await this.getPendingOperations()
      console.log(`🔄 发现 ${pending.length} 个待同步操作`)
      
      for (const operation of pending) {
        try {
          await this.processOperation(operation)
          await this.removeOperation(operation.id)
          console.log(`✅ 同步成功: ${operation.type}#${operation.id}`)
        } catch (error) {
          console.error(`❌ 同步失败: ${operation.type}#${operation.id}`, error)
          
          // 更新重试计数
          const newRetryCount = (operation.retryCount || 0) + 1
          if (newRetryCount >= operation.maxRetries) {
            // 标记为失败，保留供人工处理
            await this.updateOperation(operation.id, {
              status: 'failed',
              error: error.message,
              retryCount: newRetryCount
            })
          } else {
            await this.updateOperation(operation.id, {
              retryCount: newRetryCount,
              lastError: error.message
            })
          }
        }
      }
      
      this.notifyListeners({ type: 'sync_complete', count: pending.length })
    } finally {
      this.syncInProgress = false
    }
  }

  // 处理单个操作（需由业务层提供处理器）
  async processOperation(operation) {
    const { type, payload } = operation
    
    // 获取对应处理器
    const handler = this.operationHandlers[type]
    if (!handler) {
      throw new Error(`Unknown operation type: ${type}`)
    }
    
    return handler(payload)
  }

  // 注册操作处理器
  operationHandlers = {}
  
  registerHandler(type, handler) {
    this.operationHandlers[type] = handler
  }

  // 事件监听
  addListener(callback) {
    this.listeners.push(callback)
    return () => {
      const index = this.listeners.indexOf(callback)
      if (index > -1) this.listeners.splice(index, 1)
    }
  }

  notifyListeners(event) {
    this.listeners.forEach(cb => {
      try { cb(event) } catch (e) { console.error(e) }
    })
  }

  // 获取队列统计
  async getStats() {
    await this.init()
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_NAME], 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()
      
      request.onsuccess = () => {
        const all = request.result || []
        const stats = {
          total: all.length,
          pending: all.filter(o => o.status === 'pending').length,
          failed: all.filter(o => o.status === 'failed').length,
          byType: {}
        }
        
        all.forEach(o => {
          stats.byType[o.type] = (stats.byType[o.type] || 0) + 1
        })
        
        resolve(stats)
      }
      request.onerror = () => reject(request.error)
    })
  }
}

// 单例
export const offlineQueue = new OfflineQueue()

// 便捷函数
export async function enqueueOfflineOperation(type, payload) {
  return offlineQueue.enqueue({ type, payload })
}

export async function syncWhenOnline() {
  return offlineQueue.syncPendingOperations()
}

export default offlineQueue
