/**
 * 智能任务系统核心逻辑
 * 支持单次、连续、累计、组合四种任务类型
 */

import { supabase } from '../utils/supabase.js'

// ============================================
// 任务类型定义
// ============================================

export const TaskTypes = {
  SINGLE: 'single',       // 单次任务：完成一次即结束
  CONTINUOUS: 'continuous', // 连续任务：连续N天完成
  CUMULATIVE: 'cumulative', // 累计任务：累计N次完成
  COMBO: 'combo'          // 组合任务：同时完成多个子项
}

export const TaskStatus = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  FAILED: 'failed',
  EXPIRED: 'expired'
}

// ============================================
// 核心功能：检查任务进度
// ============================================

/**
 * 检查任务进度 (核心函数)
 * 当孩子触发某个行为规则时，自动检测相关任务进度
 * @param {string} childId - 孩子ID
 * @param {string} ruleId - 触发的规则ID
 * @param {string} date - 日期 (YYYY-MM-DD)
 * @returns {Promise<Array>} - 受影响的任务列表
 */
export async function checkTaskProgress(childId, ruleId, date) {
  // 使用本地时区日期
  if (!date) {
    const d = new Date()
    date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  console.log(`🔍 检查任务进度: child=${childId}, rule=${ruleId}, date=${date}`)
  
  const results = []
  
  try {
    // 1. 获取关联此规则的所有活动任务
    const { data: tasks, error: taskError } = await supabase
      .from('tasks')
      .select(`
        *,
        task_progress!inner(id, current_count, streak_count, last_completed_date, status, combo_progress)
      `)
      .eq('status', 'active')
      .or(`task_type.eq.continuous,task_type.eq.cumulative`)
    
    if (taskError) throw taskError
    
    // 2. 获取组合任务 (需要检查linked_rule_ids包含此ruleId)
    const { data: comboTasks, error: comboError } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'active')
      .eq('task_type', 'combo')
      .filter('linked_rule_ids', 'cs', `{${ruleId}}`)
    
    if (comboError) throw comboError
    
    // 合并任务列表
    const allTasks = [...(tasks || []), ...(comboTasks || [])]
    
    // 3. 处理每个任务
    for (const task of allTasks) {
      const result = await processTaskProgress(task, childId, ruleId, date)
      if (result) results.push(result)
    }
    
    console.log(`✅ 任务进度检查完成，${results.length} 个任务受影响`)
    return results
    
  } catch (error) {
    console.error('❌ 检查任务进度失败:', error)
    throw error
  }
}

/**
 * 处理单个任务的进度更新
 */
async function processTaskProgress(task, childId, ruleId, date) {
  // 获取或创建进度记录
  let progress = await getOrCreateProgress(task.id, childId, task.user_id, task.task_type)
  
  // 根据任务类型处理
  switch (task.task_type) {
    case TaskTypes.SINGLE:
      return await handleSingleTask(task, progress, childId, date)
      
    case TaskTypes.CONTINUOUS:
      return await handleContinuousTask(task, progress, childId, date)
      
    case TaskTypes.CUMULATIVE:
      return await handleCumulativeTask(task, progress, childId, date)
      
    case TaskTypes.COMBO:
      return await handleComboTask(task, progress, childId, ruleId, date)
      
    default:
      console.warn(`⚠️ 未知任务类型: ${task.task_type}`)
      return null
  }
}

/**
 * 获取或创建任务进度记录
 */
async function getOrCreateProgress(taskId, childId, userId, taskType) {
  // 查询现有进度
  const { data: existing } = await supabase
    .from('task_progress')
    .select('*')
    .eq('task_id', taskId)
    .eq('child_id', childId)
    .single()
  
  if (existing) return existing
  
  // 创建新进度
  const { data: newProgress, error } = await supabase
    .from('task_progress')
    .insert({
      task_id: taskId,
      child_id: childId,
      user_id: userId,
      status: TaskStatus.ACTIVE,
      combo_progress: taskType === TaskTypes.COMBO ? {} : {}
    })
    .select()
    .single()
  
  if (error) throw error
  return newProgress
}

// ============================================
// 各类任务处理逻辑
// ============================================

/**
 * 单次任务：完成即结束
 */
async function handleSingleTask(task, progress, childId, date) {
  console.log(`📌 处理单次任务: ${task.title}`)
  
  // 更新进度为完成
  const { error } = await supabase
    .from('task_progress')
    .update({
      status: TaskStatus.COMPLETED,
      current_count: 1,
      last_completed_date: date
    })
    .eq('id', progress.id)
  
  if (error) throw error
  
  // 记录完成
  await recordCompletion(task.id, childId, progress.id, date, null, task.reward_points)
  
  // 发放奖励
  const rewardResult = await awardReward(task, childId)
  
  return {
    taskId: task.id,
    title: task.title,
    type: TaskTypes.SINGLE,
    status: TaskStatus.COMPLETED,
    pointsAwarded: rewardResult.points,
    message: `🎉 任务完成！获得 ${task.reward_points} 积分`
  }
}

/**
 * 连续任务：检查是否连续，断连重置
 */
async function handleContinuousTask(task, progress, childId, date) {
  console.log(`🔥 处理连续任务: ${task.title}, 当前连续: ${progress.streak_count}`)
  
  const targetStreak = task.target_streak || 7
  let newStreak = 1
  let isCompleted = false
  let streakBroken = false
  
  if (progress.last_completed_date) {
    const lastDate = new Date(progress.last_completed_date)
    const checkDate = new Date(date)
    const diffDays = Math.floor((checkDate - lastDate) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) {
      // 连续完成
      newStreak = progress.streak_count + 1
      console.log(`✅ 连续第 ${newStreak} 天`)
    } else if (diffDays === 0) {
      // 今天已完成过，不重复计数
      newStreak = progress.streak_count
      console.log(`⚠️ 今天已完成，不重复计数`)
    } else {
      // 断连重置
      newStreak = 1
      streakBroken = true
      console.log(`💔 连续中断，重新计数`)
    }
  } else {
    console.log(`🆕 首次完成，开始计数`)
  }
  
  // 检查是否达成目标
  if (newStreak >= targetStreak) {
    isCompleted = true
  }
  
  // 更新进度
  const updateData = {
    streak_count: newStreak,
    current_count: newStreak,
    last_completed_date: date
  }
  
  if (isCompleted) {
    updateData.status = TaskStatus.COMPLETED
  }
  
  const { error } = await supabase
    .from('task_progress')
    .update(updateData)
    .eq('id', progress.id)
  
  if (error) throw error
  
  // 记录完成
  await recordCompletion(task.id, childId, progress.id, date, null, isCompleted ? task.reward_points : 0)
  
  // 如果完成则发放奖励
  let pointsAwarded = 0
  if (isCompleted) {
    const rewardResult = await awardReward(task, childId)
    pointsAwarded = rewardResult.points
  }
  
  return {
    taskId: task.id,
    title: task.title,
    type: TaskTypes.CONTINUOUS,
    status: isCompleted ? TaskStatus.COMPLETED : TaskStatus.ACTIVE,
    streakCount: newStreak,
    targetStreak: targetStreak,
    streakBroken: streakBroken,
    progress: Math.min((newStreak / targetStreak) * 100, 100),
    pointsAwarded: pointsAwarded,
    message: isCompleted 
      ? `🎉 恭喜！连续${targetStreak}天完成！获得 ${task.reward_points} 积分`
      : streakBroken 
        ? `💔 连续中断，已重新计数 (${newStreak}/${targetStreak})`
        : `🔥 连续第 ${newStreak}/${targetStreak} 天`
  }
}

/**
 * 累计任务：累加完成次数
 */
async function handleCumulativeTask(task, progress, childId, date) {
  console.log(`📊 处理累计任务: ${task.title}, 当前进度: ${progress.current_count}`)
  
  const targetCount = task.target_count || 5
  const newCount = progress.current_count + 1
  const isCompleted = newCount >= targetCount
  
  // 更新进度
  const { error } = await supabase
    .from('task_progress')
    .update({
      current_count: newCount,
      last_completed_date: date,
      status: isCompleted ? TaskStatus.COMPLETED : TaskStatus.ACTIVE
    })
    .eq('id', progress.id)
  
  if (error) throw error
  
  // 记录完成
  await recordCompletion(task.id, childId, progress.id, date, null, isCompleted ? task.reward_points : 0)
  
  // 如果完成则发放奖励
  let pointsAwarded = 0
  if (isCompleted) {
    const rewardResult = await awardReward(task, childId)
    pointsAwarded = rewardResult.points
  }
  
  return {
    taskId: task.id,
    title: task.title,
    type: TaskTypes.CUMULATIVE,
    status: isCompleted ? TaskStatus.COMPLETED : TaskStatus.ACTIVE,
    currentCount: newCount,
    targetCount: targetCount,
    progress: Math.min((newCount / targetCount) * 100, 100),
    pointsAwarded: pointsAwarded,
    message: isCompleted 
      ? `🎉 恭喜！累计${targetCount}次完成！获得 ${task.reward_points} 积分`
      : `✅ 进度更新: ${newCount}/${targetCount}`
  }
}

/**
 * 组合任务：检查所有子项完成情况
 */
async function handleComboTask(task, progress, childId, ruleId, date) {
  console.log(`🎯 处理组合任务: ${task.title}, 触发规则: ${ruleId}`)
  
  const linkedRules = task.linked_rule_ids || []
  if (linkedRules.length === 0) {
    console.warn(`⚠️ 组合任务没有关联规则: ${task.id}`)
    return null
  }
  
  // 更新combo进度
  const comboProgress = progress.combo_progress || {}
  const ruleProgress = comboProgress[ruleId] || {}
  
  // 检查今天是否已记录过此规则
  if (ruleProgress.date === date) {
    console.log(`⚠️ 今天已记录过此规则`)
    return null
  }
  
  // 标记此规则为完成
  comboProgress[ruleId] = {
    completed: true,
    date: date,
    time: new Date().toISOString()
  }
  
  // 检查是否所有子项都完成
  let allCompleted = true
  for (const ruleId of linkedRules) {
    if (!comboProgress[ruleId]?.completed) {
      allCompleted = false
      break
    }
  }
  
  // 计算今日完成数（用于进度显示）
  let todayCompleted = 0
  for (const key in comboProgress) {
    if (comboProgress[key].date === date) {
      todayCompleted++
    }
  }
  
  const isDayComplete = todayCompleted >= linkedRules.length
  const targetDays = task.target_count || 7
  let newCount = progress.current_count
  
  // 如果是新的一天完成所有子项
  if (isDayComplete && progress.last_completed_date !== date) {
    newCount = progress.current_count + 1
  }
  
  const isCompleted = newCount >= targetDays
  
  // 更新进度
  const { error } = await supabase
    .from('task_progress')
    .update({
      combo_progress: comboProgress,
      current_count: newCount,
      last_completed_date: isDayComplete ? date : progress.last_completed_date,
      status: isCompleted ? TaskStatus.COMPLETED : TaskStatus.ACTIVE
    })
    .eq('id', progress.id)
  
  if (error) throw error
  
  // 如果今天完成所有子项，记录完成
  if (isDayComplete) {
    await recordCompletion(task.id, childId, progress.id, date, ruleId, isCompleted ? task.reward_points : 0)
  }
  
  // 如果完成则发放奖励
  let pointsAwarded = 0
  if (isCompleted) {
    const rewardResult = await awardReward(task, childId)
    pointsAwarded = rewardResult.points
  }
  
  return {
    taskId: task.id,
    title: task.title,
    type: TaskTypes.COMBO,
    status: isCompleted ? TaskStatus.COMPLETED : TaskStatus.ACTIVE,
    currentCount: newCount,
    targetCount: targetDays,
    todayCompleted: todayCompleted,
    totalRules: linkedRules.length,
    comboProgress: comboProgress,
    progress: Math.min((newCount / targetDays) * 100, 100),
    pointsAwarded: pointsAwarded,
    message: isCompleted 
      ? `🏆 恭喜！${targetDays}天组合挑战完成！获得 ${task.reward_points} 积分`
      : isDayComplete
        ? `🎯 今日组合完成！(${newCount}/${targetDays}天)`
        : `⏳ 今日进度: ${todayCompleted}/${linkedRules.length}项`
  }
}

// ============================================
// 奖励发放
// ============================================

/**
 * 发放任务奖励
 */
async function awardReward(task, childId) {
  console.log(`💰 发放奖励: ${task.reward_points} 积分给 child ${childId}`)
  
  try {
    // 1. 检查是否已发放
    const { data: progress } = await supabase
      .from('task_progress')
      .select('reward_claimed')
      .eq('task_id', task.id)
      .eq('child_id', childId)
      .single()
    
    if (progress?.reward_claimed) {
      console.log(`⚠️ 奖励已发放过`)
      return { success: false, points: 0, message: '奖励已发放' }
    }
    
    // 2. 创建交易记录
    const { error: transError } = await supabase
      .from('transactions')
      .insert({
        child_id: childId,
        task_id: task.id,
        points: task.reward_points,
        type: 'earn',
        note: `完成任务奖励: ${task.title}`,
        user_id: task.user_id
      })
    
    if (transError) throw transError
    
    // 3. 更新孩子积分
    const { error: childError } = await supabase
      .from('children')
      .update({
        total_points: supabase.rpc('increment', { amount: task.reward_points }),
        current_balance: supabase.rpc('increment', { amount: task.reward_points })
      })
      .eq('id', childId)
    
    // 4. 标记奖励已发放
    await supabase
      .from('task_progress')
      .update({
        reward_claimed: true,
        reward_claimed_at: new Date().toISOString()
      })
      .eq('task_id', task.id)
      .eq('child_id', childId)
    
    console.log(`✅ 奖励发放成功: ${task.reward_points} 积分`)
    return { success: true, points: task.reward_points, message: '奖励发放成功' }
    
  } catch (error) {
    console.error('❌ 奖励发放失败:', error)
    return { success: false, points: 0, message: error.message }
  }
}

/**
 * 记录任务完成
 */
async function recordCompletion(taskId, childId, progressId, date, ruleId = null, points = 0) {
  const { error } = await supabase
    .from('task_completions')
    .insert({
      task_id: taskId,
      child_id: childId,
      progress_id: progressId,
      completion_date: date,
      triggered_by_rule_id: ruleId,
      points_earned: points,
      user_id: (await supabase.auth.getUser()).data.user?.id
    })
  
  if (error) console.error('记录完成失败:', error)
}

// ============================================
// 查询功能
// ============================================

/**
 * 获取孩子的所有任务进度
 */
export async function getChildTaskProgress(childId) {
  const { data, error } = await supabase
    .from('task_progress')
    .select(`
      *,
      tasks(*)
    `)
    .eq('child_id', childId)
    .order('updated_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

/**
 * 获取任务完成历史 (用于日历视图)
 */
export async function getTaskCompletionHistory(taskId, childId, startDate, endDate) {
  const { data, error } = await supabase
    .from('task_completions')
    .select('*')
    .eq('task_id', taskId)
    .eq('child_id', childId)
    .gte('completion_date', startDate)
    .lte('completion_date', endDate)
    .order('completion_date', { ascending: true })
  
  if (error) throw error
  return data || []
}

/**
 * 获取任务的详细进度信息
 */
export async function getTaskDetailWithProgress(taskId, childId) {
  // 获取任务信息
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select(`
      *,
      rules:linked_rule_ids(*)
    `)
    .eq('id', taskId)
    .single()
  
  if (taskError) throw taskError
  
  // 获取进度
  const { data: progress, error: progressError } = await supabase
    .from('task_progress')
    .select('*')
    .eq('task_id', taskId)
    .eq('child_id', childId)
    .single()
  
  // 获取最近30天的完成历史
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const { data: history } = await supabase
    .from('task_completions')
    .select('*')
    .eq('task_id', taskId)
    .eq('child_id', childId)
    .gte('completion_date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('completion_date', { ascending: false })
  
  return {
    task,
    progress: progress || null,
    history: history || []
  }
}

// ============================================
// Mock数据：超级周挑战
// ============================================

/**
 * 创建测试任务：超级周挑战
 */
export async function createMockSuperWeekChallenge(childId, userId) {
  console.log('🏆 创建Mock测试任务: 超级周挑战')
  
  try {
    // 1. 先创建所需的规则
    const { data: readingRule, error: r1 } = await supabase
      .from('rules')
      .insert({
        name: '阅读时光',
        description: '每天阅读至少30分钟',
        points: 5,
        type: 'good',
        icon: '📚',
        user_id: userId
      })
      .select()
      .single()
    
    const { data: pianoRule, error: r2 } = await supabase
      .from('rules')
      .insert({
        name: '钢琴练习',
        description: '每天练习钢琴20分钟',
        points: 5,
        type: 'good',
        icon: '🎹',
        user_id: userId
      })
      .select()
      .single()
    
    if (r1 || r2) throw r1 || r2
    
    // 2. 创建组合任务
    const today = new Date()
    const weekLater = new Date(today)
    weekLater.setDate(weekLater.getDate() + 7)
    
    const { data: task, error: tError } = await supabase
      .from('tasks')
      .insert({
        title: '超级周挑战',
        description: '每天完成阅读和钢琴练习，坚持一周！挑战自我，赢取丰厚奖励！',
        task_type: TaskTypes.COMBO,
        target_count: 7,
        linked_rule_ids: [readingRule.id, pianoRule.id],
        cycle_start: today.toISOString().split('T')[0],
        cycle_end: weekLater.toISOString().split('T')[0],
        reward_points: 50,
        points: 50,
        icon: '🏆',
        status: 'active',
        user_id: userId
      })
      .select()
      .single()
    
    if (tError) throw tError
    
    // 3. 创建模拟进度 (已完成3天)
    const mockDate = new Date(today)
    mockDate.setDate(mockDate.getDate() - 3)
    
    const comboProgress = {}
    
    // 模拟过去3天的完成记录
    for (let i = 0; i < 3; i++) {
      const dateStr = new Date(mockDate)
      dateStr.setDate(dateStr.getDate() + i)
      
      comboProgress[readingRule.id] = {
        completed: true,
        date: dateStr.toISOString().split('T')[0]
      }
      comboProgress[pianoRule.id] = {
        completed: true,
        date: dateStr.toISOString().split('T')[0]
      }
    }
    
    const { data: progress, error: pError } = await supabase
      .from('task_progress')
      .insert({
        task_id: task.id,
        child_id: childId,
        current_count: 3,
        status: TaskStatus.ACTIVE,
        combo_progress: comboProgress,
        last_completed_date: new Date(mockDate.setDate(mockDate.getDate() + 2)).toISOString().split('T')[0],
        user_id: userId
      })
      .select()
      .single()
    
    if (pError) throw pError
    
    // 4. 创建完成记录
    for (let i = 0; i < 3; i++) {
      const dateStr = new Date(today)
      dateStr.setDate(dateStr.getDate() - (3 - i))
      
      await supabase.from('task_completions').insert({
        task_id: task.id,
        child_id: childId,
        progress_id: progress.id,
        completion_date: dateStr.toISOString().split('T')[0],
        triggered_by_rule_id: readingRule.id,
        user_id: userId
      })
      
      await supabase.from('task_completions').insert({
        task_id: task.id,
        child_id: childId,
        progress_id: progress.id,
        completion_date: dateStr.toISOString().split('T')[0],
        triggered_by_rule_id: pianoRule.id,
        user_id: userId
      })
    }
    
    console.log('✅ Mock任务创建成功')
    return {
      success: true,
      task,
      progress,
      readingRuleId: readingRule.id,
      pianoRuleId: pianoRule.id
    }
    
  } catch (error) {
    console.error('❌ 创建Mock任务失败:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// 工具函数
// ============================================

/**
 * 计算剩余天数
 */
export function getRemainingDays(endDate) {
  if (!endDate) return null
  const end = new Date(endDate)
  const today = new Date()
  const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

/**
 * 格式化进度百分比
 */
export function formatProgress(current, target) {
  if (!target || target <= 0) return 0
  return Math.min(Math.round((current / target) * 100), 100)
}

/**
 * 获取任务状态文本
 */
export function getTaskStatusText(status) {
  const statusMap = {
    [TaskStatus.ACTIVE]: '进行中',
    [TaskStatus.COMPLETED]: '已完成',
    [TaskStatus.FAILED]: '已失败',
    [TaskStatus.EXPIRED]: '已过期'
  }
  return statusMap[status] || status
}

/**
 * 获取任务类型文本
 */
export function getTaskTypeText(type) {
  const typeMap = {
    [TaskTypes.SINGLE]: '单次任务',
    [TaskTypes.CONTINUOUS]: '连续任务',
    [TaskTypes.CUMULATIVE]: '累计任务',
    [TaskTypes.COMBO]: '组合挑战'
  }
  return typeMap[type] || type
}

/**
 * 获取任务类型图标
 */
export function getTaskTypeIcon(type) {
  const iconMap = {
    [TaskTypes.SINGLE]: '📋',
    [TaskTypes.CONTINUOUS]: '🔥',
    [TaskTypes.CUMULATIVE]: '📊',
    [TaskTypes.COMBO]: '🎯'
  }
  return iconMap[type] || '📋'
}

export default {
  TaskTypes,
  TaskStatus,
  checkTaskProgress,
  getChildTaskProgress,
  getTaskCompletionHistory,
  getTaskDetailWithProgress,
  createMockSuperWeekChallenge,
  getRemainingDays,
  formatProgress,
  getTaskStatusText,
  getTaskTypeText,
  getTaskTypeIcon
}
