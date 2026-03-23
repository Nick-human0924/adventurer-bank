// 儿童行为银行 - 分类图标配置
// 包含所有分类和对应的图标库

export const CATEGORY_ICONS = {
  '运动健康': {
    icon: '🏃',
    color: '#ff6b6b',
    icons: ['🏃', '⚽', '🏀', '🎾', '🏊', '🚴', '⛹️', '🤸', '🧘', '🏋️', '🛹', '🏂', '🧗', '🚣', '🤺']
  },
  '学习成长': {
    icon: '📚',
    color: '#4ecdc4',
    icons: ['📚', '📖', '✏️', '📝', '🔬', '🎨', '🧮', '🌍', '🔭', '📐', '📊', '📓', '🏫', '🎓']
  },
  '生活自理': {
    icon: '🧹',
    color: '#95e1d3',
    icons: ['🧹', '🛏️', '🍽️', '🧺', '🚿', '🦷', '👕', '🥾', '🧤', '🧦', '🎒', '🚪', '🪟']
  },
  '艺术创造': {
    icon: '🎹',
    color: '#f38181',
    icons: ['🎹', '🎸', '🎨', '🎭', '🎤', '🎬', '🎮', '📸', '🎪', '🎺', '🎻', '🥁', '🎷', '🎼']
  },
  '品德社交': {
    icon: '💝',
    color: '#aa96da',
    icons: ['💝', '🤝', '🙏', '😊', '🌟', '🏆', '🎁', '💐', '🕊️', '🤗', '💕', '✨', '🎊', '🏅']
  },
  '作息规律': {
    icon: '🌅',
    color: '#fcbad3',
    icons: ['🌅', '🌙', '☀️', '🛌', '⏰', '🌟', '🌈', '🌞', '🌝', '🌜', '🌛', '⭐']
  },
  '健康饮食': {
    icon: '🍎',
    color: '#a8e6cf',
    icons: ['🍎', '🥗', '🥛', '🥦', '🍊', '🥕', '🥤', '🍽️', '🍓', '🍌', '🥝', '🍇', '🍉', '🍒']
  },
  '其他': {
    icon: '⭐',
    color: '#ffd93d',
    icons: ['⭐', '💎', '🏅', '🎖️', '🔰', '💫', '🎯', '🔔', '📌', '✅']
  }
}

// 获取所有分类列表
export const getCategories = () => Object.keys(CATEGORY_ICONS)

// 获取指定分类的图标列表
export const getIconsByCategory = (category) => {
  return CATEGORY_ICONS[category]?.icons || CATEGORY_ICONS['其他'].icons
}

// 获取分类的颜色
export const getCategoryColor = (category) => {
  return CATEGORY_ICONS[category]?.color || '#ffd93d'
}

// 根据图标获取分类（反向查找）
export const getCategoryByIcon = (icon) => {
  for (const [category, data] of Object.entries(CATEGORY_ICONS)) {
    if (data.icons.includes(icon)) {
      return category
    }
  }
  return '其他'
}

// 智能推荐图标（根据行为名称）
export const suggestIcon = (behaviorName, category = null) => {
  const name = behaviorName.toLowerCase()
  
  // 根据关键词推荐
  const keywordMap = {
    '运动健康': {
      icons: ['🏃', '⚽', '🏀', '🎾', '🏊', '🚴'],
      keywords: ['运动', '锻炼', '球', '跑步', '游泳', '骑车', '跳绳', '体操']
    },
    '学习成长': {
      icons: ['📚', '📝', '✏️', '🔬', '🎨', '🧮'],
      keywords: ['作业', '阅读', '学习', '写字', '数学', '英语', '画画', '科学']
    },
    '生活自理': {
      icons: ['🧹', '🛏️', '🦷', '🚿', '👕', '🎒'],
      keywords: ['整理', '家务', '起床', '睡觉', '刷牙', '洗澡', '穿衣', '书包']
    },
    '艺术创造': {
      icons: ['🎹', '🎸', '🎨', '🎤', '🎬', '📸'],
      keywords: ['钢琴', '吉他', '画画', '唱歌', '跳舞', '拍照', '音乐']
    },
    '品德社交': {
      icons: ['💝', '🤝', '🙏', '😊', '🌟', '🏆'],
      keywords: ['帮助', '分享', '礼貌', '感谢', '问好', '友善']
    },
    '作息规律': {
      icons: ['🌅', '🌙', '☀️', '⏰', '🛌'],
      keywords: ['按时', '早睡', '午睡', '起床', '睡觉']
    },
    '健康饮食': {
      icons: ['🍎', '🥗', '🥛', '🥦', '🍊', '🥤'],
      keywords: ['水果', '蔬菜', '牛奶', '喝水', '吃饭', '健康']
    }
  }
  
  // 如果指定了分类，从该分类推荐
  if (category && keywordMap[category]) {
    const matched = keywordMap[category].keywords.find(kw => name.includes(kw))
    if (matched) {
      const index = keywordMap[category].keywords.indexOf(matched) % keywordMap[category].icons.length
      return keywordMap[category].icons[index]
    }
    return keywordMap[category].icons[0]
  }
  
  // 否则遍历所有分类
  for (const [cat, data] of Object.entries(keywordMap)) {
    const matched = data.keywords.find(kw => name.includes(kw))
    if (matched) {
      const index = data.keywords.indexOf(matched) % data.icons.length
      return data.icons[index]
    }
  }
  
  return '⭐' // 默认图标
}

// 智能推荐分类（根据行为名称）
export const suggestCategory = (behaviorName) => {
  const name = behaviorName.toLowerCase()
  
  const categoryKeywords = {
    '运动健康': ['运动', '锻炼', '球', '跑步', '游泳', '骑车', '跳绳', '体操', '瑜伽'],
    '学习成长': ['作业', '阅读', '学习', '写字', '数学', '英语', '画画', '科学', '地理'],
    '生活自理': ['整理', '家务', '起床', '睡觉', '刷牙', '洗澡', '穿衣', '书包', '叠被'],
    '艺术创造': ['钢琴', '吉他', '画画', '唱歌', '跳舞', '拍照', '音乐', '表演', '手工'],
    '品德社交': ['帮助', '分享', '礼貌', '感谢', '问好', '友善', '助人', '合作'],
    '作息规律': ['按时', '早睡', '午睡', '起床', '睡觉', '作息'],
    '健康饮食': ['水果', '蔬菜', '牛奶', '喝水', '吃饭', '健康', '饮食', '刷牙']
  }
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => name.includes(kw))) {
      return category
    }
  }
  
  return '其他'
}

export default {
  CATEGORY_ICONS,
  getCategories,
  getIconsByCategory,
  getCategoryColor,
  getCategoryByIcon,
  suggestIcon,
  suggestCategory
}
