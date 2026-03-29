/**
 * 22 张大阿尔卡纳 — 卡牌视觉数据 & 含义
 * 每张牌有独立的配色、符号和校园语境解读
 */

export interface TarotCard {
  no: number
  nameZh: string
  nameEn: string
  symbol: string           // 主视觉符号
  colors: [string, string] // 渐变色
  glow: string             // 发光色
  uprightMeaning: string
  reversedMeaning: string
  campusContext: string
  keywords: string[]
}

export const TAROT_CARDS: TarotCard[] = [
  {
    no: 0, nameZh: '愚者', nameEn: 'The Fool', symbol: '🌟',
    colors: ['#4c1d95', '#7c3aed'], glow: 'rgba(124,58,237,0.6)',
    uprightMeaning: '新旅程即将开启，带着好奇心大胆前行，不必等所有条件都完美。',
    reversedMeaning: '冲动可能让你偏航，停下来重新审视方向，给自己一个缓冲期。',
    campusContext: '新学期、转专业、第一次参加社团面试——勇气比完美更重要',
    keywords: ['新开始', '冒险', '纯真', '自由'],
  },
  {
    no: 1, nameZh: '魔术师', nameEn: 'The Magician', symbol: '✨',
    colors: ['#7c2d12', '#f59e0b'], glow: 'rgba(245,158,11,0.6)',
    uprightMeaning: '你拥有实现目标所需的一切资源，关键是行动起来，把想法变成现实。',
    reversedMeaning: '天赋未被善用，或被外界干扰分散了注意力。重新聚焦核心目标。',
    campusContext: '竞赛答辩、项目路演——你的能力远超你的想象',
    keywords: ['创造力', '行动', '专注', '潜能'],
  },
  {
    no: 2, nameZh: '女祭司', nameEn: 'The High Priestess', symbol: '🌙',
    colors: ['#1e1b4b', '#4338ca'], glow: 'rgba(99,102,241,0.5)',
    uprightMeaning: '相信直觉，答案已经在你内心深处。安静下来倾听内在的声音。',
    reversedMeaning: '过度理性忽略了感受，或信息过载让你迷失。给自己独处的空间。',
    campusContext: '选课纠结、社交疲惫——有时候"感觉对了"就是最好的理由',
    keywords: ['直觉', '智慧', '内省', '神秘'],
  },
  {
    no: 3, nameZh: '女皇', nameEn: 'The Empress', symbol: '🌺',
    colors: ['#064e3b', '#10b981'], glow: 'rgba(16,185,129,0.5)',
    uprightMeaning: '丰盛和成长的能量围绕着你。善待自己，也善待周围的人。',
    reversedMeaning: '可能在过度付出中忽略了自我照顾。记得先给自己充电。',
    campusContext: '友谊、恋爱、自我关怀——在温暖别人之前先温暖自己',
    keywords: ['丰盛', '关怀', '成长', '美好'],
  },
  {
    no: 4, nameZh: '皇帝', nameEn: 'The Emperor', symbol: '🏛️',
    colors: ['#7f1d1d', '#dc2626'], glow: 'rgba(220,38,38,0.5)',
    uprightMeaning: '现在需要结构和纪律。制定计划并坚定执行，领导力从自律开始。',
    reversedMeaning: '控制欲太强或规则太死板。适当放松，允许灵活变通。',
    campusContext: '备考计划、团队管理、时间规划——有秩序才有自由',
    keywords: ['权威', '纪律', '结构', '掌控'],
  },
  {
    no: 5, nameZh: '教皇', nameEn: 'The Hierophant', symbol: '📿',
    colors: ['#3b0764', '#9333ea'], glow: 'rgba(147,51,234,0.5)',
    uprightMeaning: '向有经验的人请教，传统的方法里藏着被验证过的智慧。',
    reversedMeaning: '不必盲从权威，有时候需要质疑既定规则，走自己的路。',
    campusContext: '找导师、听学长建议、参加讲座——汲取前人经验',
    keywords: ['传承', '指导', '信仰', '学习'],
  },
  {
    no: 6, nameZh: '恋人', nameEn: 'The Lovers', symbol: '💕',
    colors: ['#831843', '#ec4899'], glow: 'rgba(236,72,153,0.5)',
    uprightMeaning: '面临重要抉择，跟随内心的真实渴望。真诚的连接比完美的条件更珍贵。',
    reversedMeaning: '价值观冲突或关系中的不和谐。停下来想想什么才是真正重要的。',
    campusContext: '恋爱抉择、室友关系、社交圈选择——真心对待每一段缘分',
    keywords: ['选择', '爱情', '和谐', '价值观'],
  },
  {
    no: 7, nameZh: '战车', nameEn: 'The Chariot', symbol: '⚔️',
    colors: ['#1e3a5f', '#3b82f6'], glow: 'rgba(59,130,246,0.5)',
    uprightMeaning: '凭借意志力和决心，你正在突破障碍。保持方向，胜利就在前方。',
    reversedMeaning: '方向不清或内心冲突在拖后腿。先理清优先级再出发。',
    campusContext: '考研冲刺、项目截止日、体育比赛——全力以赴的时刻',
    keywords: ['决心', '突破', '行动力', '胜利'],
  },
  {
    no: 8, nameZh: '力量', nameEn: 'Strength', symbol: '🦁',
    colors: ['#78350f', '#f97316'], glow: 'rgba(249,115,22,0.5)',
    uprightMeaning: '真正的力量来自温柔和耐心。面对困难时，内在的平静比外在的强硬更有效。',
    reversedMeaning: '压抑情绪或对自己太苛刻。接受脆弱也是一种勇气。',
    campusContext: '面对压力、克服恐惧、学会自我调节——柔软也是力量',
    keywords: ['勇气', '耐心', '内在力量', '温柔'],
  },
  {
    no: 9, nameZh: '隐者', nameEn: 'The Hermit', symbol: '🏮',
    colors: ['#422006', '#a16207'], glow: 'rgba(161,98,7,0.5)',
    uprightMeaning: '此刻适合独处和反思。远离喧嚣，在安静中找到属于自己的答案。',
    reversedMeaning: '过度封闭可能让你错过重要连接。适时走出舒适区。',
    campusContext: '图书馆独处、考前冥想、理清人生方向——与自己对话',
    keywords: ['独处', '反思', '智慧', '内观'],
  },
  {
    no: 10, nameZh: '命运之轮', nameEn: 'Wheel of Fortune', symbol: '🎡',
    colors: ['#4a1d96', '#f59e0b'], glow: 'rgba(245,158,11,0.6)',
    uprightMeaning: '变化正在到来，顺势而为。好运的齿轮已开始转动。',
    reversedMeaning: '暂时的逆风不代表永远。低谷期也在积蓄转机的能量。',
    campusContext: '意外机会、转折时刻——把握每一个变化的信号',
    keywords: ['转变', '机遇', '命运', '循环'],
  },
  {
    no: 11, nameZh: '正义', nameEn: 'Justice', symbol: '⚖️',
    colors: ['#713f12', '#eab308'], glow: 'rgba(234,179,8,0.5)',
    uprightMeaning: '公平和真相是你此刻的指引。做出符合内心正义感的决定。',
    reversedMeaning: '可能存在不公或自我欺骗。诚实面对自己，才能做出正确判断。',
    campusContext: '学术诚信、公平竞争、处理矛盾——正直是最好的策略',
    keywords: ['公正', '真相', '平衡', '因果'],
  },
  {
    no: 12, nameZh: '倒吊人', nameEn: 'The Hanged Man', symbol: '🔮',
    colors: ['#134e4a', '#14b8a6'], glow: 'rgba(20,184,166,0.5)',
    uprightMeaning: '换个角度看问题，暂停不等于停滞。有时候放手反而是最大的收获。',
    reversedMeaning: '拖延和犹豫消耗着你的能量。做出决定，哪怕不完美。',
    campusContext: '换位思考、Gap Year、暂缓计划——停下来也是一种前进',
    keywords: ['新视角', '放手', '等待', '牺牲'],
  },
  {
    no: 13, nameZh: '死神', nameEn: 'Death', symbol: '🦋',
    colors: ['#1f2937', '#6b21a8'], glow: 'rgba(107,33,168,0.5)',
    uprightMeaning: '旧篇章正在结束，为新的开始腾出空间。蜕变从告别开始。',
    reversedMeaning: '抗拒改变只会让过渡期更痛苦。接受结束，才能拥抱新生。',
    campusContext: '毕业、分手、告别旧习惯——每一次结束都是新的起点',
    keywords: ['转变', '结束', '重生', '释放'],
  },
  {
    no: 14, nameZh: '节制', nameEn: 'Temperance', symbol: '🌊',
    colors: ['#0c4a6e', '#38bdf8'], glow: 'rgba(56,189,248,0.5)',
    uprightMeaning: '平衡是此刻的功课。在极端之间找到中间地带，耐心调和各方面。',
    reversedMeaning: '失衡的信号——可能学业、社交、休息某一端严重偏斜。',
    campusContext: '学业生活平衡、情绪管理、人际调和——中庸之道',
    keywords: ['平衡', '和谐', '耐心', '调和'],
  },
  {
    no: 15, nameZh: '恶魔', nameEn: 'The Devil', symbol: '🔥',
    colors: ['#450a0a', '#991b1b'], glow: 'rgba(153,27,27,0.5)',
    uprightMeaning: '审视束缚你的东西——是外在的压力还是内心的执念？看清锁链才能打破它。',
    reversedMeaning: '正在从不健康的模式中觉醒。打破Loop需要勇气，但你做得到。',
    campusContext: '手机成瘾、内卷焦虑、不健康关系——认清束缚才能自由',
    keywords: ['束缚', '欲望', '觉醒', '挣脱'],
  },
  {
    no: 16, nameZh: '塔', nameEn: 'The Tower', symbol: '⚡',
    colors: ['#4a044e', '#e11d48'], glow: 'rgba(225,29,72,0.5)',
    uprightMeaning: '突如其来的变化可能让人措手不及，但它正在摧毁不牢固的根基，为重建做准备。',
    reversedMeaning: '危机的影响在减弱，或者你在逃避必要的改变。面对它，而不是绕开。',
    campusContext: '挂科、突发事件、计划被打乱——废墟之上建新楼',
    keywords: ['巨变', '觉醒', '重建', '真相'],
  },
  {
    no: 17, nameZh: '星星', nameEn: 'The Star', symbol: '⭐',
    colors: ['#1e3a5f', '#fbbf24'], glow: 'rgba(251,191,36,0.6)',
    uprightMeaning: '希望之光正在照耀你。保持信念，宇宙正在回应你的努力。',
    reversedMeaning: '暂时迷失了方向或失去信心。抬头看看星空，灵感就在那里。',
    campusContext: '低谷期的希望、理想主义的力量——永远相信美好',
    keywords: ['希望', '灵感', '信念', '治愈'],
  },
  {
    no: 18, nameZh: '月亮', nameEn: 'The Moon', symbol: '🌙',
    colors: ['#0f172a', '#6366f1'], glow: 'rgba(99,102,241,0.5)',
    uprightMeaning: '事情可能没有表面看起来那么简单。保持警觉，相信你的第六感。',
    reversedMeaning: '迷雾正在散去，真相逐渐浮现。之前的困惑即将得到解答。',
    campusContext: '人际关系的隐藏面、考试前的不安——迷雾终会散去',
    keywords: ['直觉', '幻象', '潜意识', '不安'],
  },
  {
    no: 19, nameZh: '太阳', nameEn: 'The Sun', symbol: '☀️',
    colors: ['#78350f', '#fbbf24'], glow: 'rgba(251,191,36,0.7)',
    uprightMeaning: '这是最积极的信号！成功、快乐和满足正向你走来。尽情享受此刻的光芒。',
    reversedMeaning: '快乐暂时被乌云遮挡，但太阳依然在那里。很快就会雨过天晴。',
    campusContext: '考试通过、收到Offer、恋爱甜蜜期——最闪耀的日子',
    keywords: ['快乐', '成功', '活力', '光明'],
  },
  {
    no: 20, nameZh: '审判', nameEn: 'Judgement', symbol: '🎺',
    colors: ['#3b0764', '#c084fc'], glow: 'rgba(192,132,252,0.5)',
    uprightMeaning: '反思过去，做出最终决定的时刻到了。听从内心的召唤，迈向更高的自我。',
    reversedMeaning: '对过去的纠结阻碍了前进。原谅自己，放下遗憾。',
    campusContext: '保研or考研、毕业总结、人生复盘——听从内心的号角',
    keywords: ['觉醒', '反思', '重生', '召唤'],
  },
  {
    no: 21, nameZh: '世界', nameEn: 'The World', symbol: '🌍',
    colors: ['#4c1d95', '#06b6d4'], glow: 'rgba(6,182,212,0.6)',
    uprightMeaning: '一个周期圆满完成！收获成就感的同时，新的旅程也在酝酿。你值得为自己骄傲。',
    reversedMeaning: '距离目标还差最后一步。别在终点前放弃，坚持到底。',
    campusContext: '毕业、完成大项目、达成年度目标——人生的一个圆',
    keywords: ['完成', '圆满', '整合', '成就'],
  },
]
