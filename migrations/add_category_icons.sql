-- 儿童行为银行 - 分类图标系统数据库迁移脚本
-- 执行时间: 2026-03-23

-- 1. 添加分类字段到rules表
ALTER TABLE rules 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other',
ADD COLUMN IF NOT EXISTS icon_emoji TEXT DEFAULT '⭐';

-- 2. 更新现有规则的分类（根据行为名称智能分类）

-- 运动健康类
UPDATE rules 
SET category = '运动健康', icon_emoji = '🏃'
WHERE name LIKE '%运动%' 
   OR name LIKE '%锻炼%' 
   OR name LIKE '%球%' 
   OR name LIKE '%跑步%'
   OR name LIKE '%游泳%'
   OR name LIKE '%骑车%';

-- 学习成长类
UPDATE rules 
SET category = '学习成长', icon_emoji = '📚'
WHERE name LIKE '%作业%' 
   OR name LIKE '%阅读%' 
   OR name LIKE '%学习%'
   OR name LIKE '%写字%'
   OR name LIKE '%数学%'
   OR name LIKE '%英语%';

-- 生活自理类
UPDATE rules 
SET category = '生活自理', icon_emoji = '🧹'
WHERE name LIKE '%整理%' 
   OR name LIKE '%家务%' 
   OR name LIKE '%起床%'
   OR name LIKE '%睡觉%'
   OR name LIKE '%刷牙%'
   OR name LIKE '%洗澡%';

-- 艺术创造类
UPDATE rules 
SET category = '艺术创造', icon_emoji = '🎹'
WHERE name LIKE '%钢琴%' 
   OR name LIKE '%画画%' 
   OR name LIKE '%音乐%'
   OR name LIKE '%舞蹈%'
   OR name LIKE '%手工%';

-- 品德社交类
UPDATE rules 
SET category = '品德社交', icon_emoji = '💝'
WHERE name LIKE '%帮助%' 
   OR name LIKE '%分享%' 
   OR name LIKE '%礼貌%'
   OR name LIKE '%感谢%';

-- 作息规律类
UPDATE rules 
SET category = '作息规律', icon_emoji = '🌅'
WHERE name LIKE '%按时%' 
   OR name LIKE '%早睡%'
   OR name LIKE '%午睡%';

-- 3. 插入完整的示例规则（带分类和图标）

-- 运动健康类规则
INSERT INTO rules (name, icon, category, description, points, type, is_active, user_id)
SELECT '踢足球', '⚽', '运动健康', '参加足球活动或训练', 8, 'good', true, user_id
FROM rules LIMIT 1
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE name = '踢足球');

INSERT INTO rules (name, icon, category, description, points, type, is_active, user_id)
SELECT '打篮球', '🏀', '运动健康', '进行篮球运动', 8, 'good', true, user_id
FROM rules LIMIT 1
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE name = '打篮球');

INSERT INTO rules (name, icon, category, description, points, type, is_active, user_id)
SELECT '游泳', '🏊', '运动健康', '游泳锻炼30分钟以上', 10, 'good', true, user_id
FROM rules LIMIT 1
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE name = '游泳');

INSERT INTO rules (name, icon, category, description, points, type, is_active, user_id)
SELECT '骑自行车', '🚴', '运动健康', '户外骑车活动', 8, 'good', true, user_id
FROM rules LIMIT 1
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE name = '骑自行车');

INSERT INTO rules (name, icon, category, description, points, type, is_active, user_id)
SELECT '跳绳', '⛹️', '运动健康', '跳绳运动', 6, 'good', true, user_id
FROM rules LIMIT 1
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE name = '跳绳');

-- 学习成长类规则
INSERT INTO rules (name, icon, category, description, points, type, is_active, user_id)
SELECT '画画', '🎨', '学习成长', '完成绘画作品', 6, 'good', true, user_id
FROM rules LIMIT 1
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE name = '画画');

INSERT INTO rules (name, icon, category, description, points, type, is_active, user_id)
SELECT '写字练习', '✏️', '学习成长', '认真练习写字', 5, 'good', true, user_id
FROM rules LIMIT 1
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE name = '写字练习');

INSERT INTO rules (name, icon, category, description, points, type, is_active, user_id)
SELECT '学英语', '🌍', '学习成长', '学习英语单词或对话', 6, 'good', true, user_id
FROM rules LIMIT 1
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE name = '学英语');

-- 生活自理类规则
INSERT INTO rules (name, icon, category, description, points, type, is_active, user_id)
SELECT '叠被子', '🛏️', '生活自理', '起床后自己叠被子', 4, 'good', true, user_id
FROM rules LIMIT 1
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE name = '叠被子');

INSERT INTO rules (name, icon, category, description, points, type, is_active, user_id)
SELECT '刷牙', '🦷', '生活自理', '早晚认真刷牙', 4, 'good', true, user_id
FROM rules LIMIT 1
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE name = '刷牙');

INSERT INTO rules (name, icon, category, description, points, type, is_active, user_id)
SELECT '洗澡', '🚿', '生活自理', '自己洗澡', 5, 'good', true, user_id
FROM rules LIMIT 1
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE name = '洗澡');

INSERT INTO rules (name, icon, category, description, points, type, is_active, user_id)
SELECT '收拾餐桌', '🍽️', '生活自理', '饭后帮忙收拾餐桌', 4, 'good', true, user_id
FROM rules LIMIT 1
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE name = '收拾餐桌');

INSERT INTO rules (name, icon, category, description, points, type, is_active, user_id)
SELECT '整理书包', '🎒', '生活自理', '自己整理书包', 4, 'good', true, user_id
FROM rules LIMIT 1
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE name = '整理书包');

-- 艺术创造类规则
INSERT INTO rules (name, icon, category, description, points, type, is_active, user_id)
SELECT '弹钢琴', '🎹', '艺术创造', '练习钢琴30分钟以上', 8, 'good', true, user_id
FROM rules LIMIT 1
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE name = '弹钢琴');

INSERT INTO rules (name, icon, category, description, points, type, is_active, user_id)
SELECT '弹吉他', '🎸', '艺术创造', '练习吉他', 8, 'good', true, user_id
FROM rules LIMIT 1
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE name = '弹吉他');

INSERT INTO rules (name, icon, category, description, points, type, is_active, user_id)
SELECT '唱歌', '🎤', '艺术创造', '练习唱歌', 6, 'good', true, user_id
FROM rules LIMIT 1
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE name = '唱歌');

INSERT INTO rules (name, icon, category, description, points, type, is_active, user_id)
SELECT '拍照', '📸', '艺术创造', '拍摄照片作品', 5, 'good', true, user_id
FROM rules LIMIT 1
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE name = '拍照');

-- 品德社交类规则
INSERT INTO rules (name, icon, category, description, points, type, is_active, user_id)
SELECT '主动打招呼', '😊', '品德社交', '主动和家人朋友问好', 4, 'good', true, user_id
FROM rules LIMIT 1
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE name = '主动打招呼');

INSERT INTO rules (name, icon, category, description, points, type, is_active, user_id)
SELECT '说谢谢', '🙏', '品德社交', '得到帮助时说谢谢', 4, 'good', true, user_id
FROM rules LIMIT 1
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE name = '说谢谢');

INSERT INTO rules (name, icon, category, description, points, type, is_active, user_id)
SELECT '分享玩具', '🤝', '品德社交', '和小朋友分享玩具', 5, 'good', true, user_id
FROM rules LIMIT 1
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE name = '分享玩具');

-- 作息规律类规则
INSERT INTO rules (name, icon, category, description, points, type, is_active, user_id)
SELECT '按时睡觉', '🌙', '作息规律', '在规定时间前上床睡觉', 5, 'good', true, user_id
FROM rules LIMIT 1
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE name = '按时睡觉');

INSERT INTO rules (name, icon, category, description, points, type, is_active, user_id)
SELECT '午睡', '☀️', '作息规律', '中午按时午睡', 4, 'good', true, user_id
FROM rules LIMIT 1
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE name = '午睡');

-- 4. 验证数据
SELECT category, COUNT(*) as rule_count 
FROM rules 
GROUP BY category 
ORDER BY rule_count DESC;
