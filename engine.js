/**
 * MiroFish v13 - 叙事引擎
 * 语言多样性 + 用户输入回声 + 感官锚定 + 人格化重写
 */

const EMOTION_MAP = {
  anxious: { valence: -0.6, arousal: 0.7, label: '焦虑' },
  angry:   { valence: -0.7, arousal: 0.9, label: '愤怒' },
  sad:     { valence: -0.8, arousal: -0.5, label: '难过' },
  confused:{ valence: -0.3, arousal: 0.2, label: '迷茫' },
  hopeful: { valence: 0.5, arousal: 0.3, label: '期待' },
  fearful: { valence: -0.7, arousal: 0.8, label: '恐惧' },
  neutral: { valence: 0.0, arousal: 0.0, label: '平静' },
  excited: { valence: 0.8, arousal: 0.9, label: '兴奋' },
};

const SCOPE_LABELS = ['', '仅自己', '身边几个人', '一个群体', '大范围', '全社会'];
const TIME_LABELS = ['', '一周', '两周', '一个月', '三个月', '一年'];
const INTENSITY_LABELS = ['', '微弱', '轻微', '中等', '强烈', '剧烈'];
const UNCERTAINTY_LABELS = ['', '几乎确定', '比较确定', '中等', '不确定', '完全未知'];

// ===== 因素效果（语言变体） =====
const FACTOR_EFFECTS = {
  media: {
    optimistic: ['社交媒体上的一条私信可能打开一扇门', '你的某条内容意外被转发，带来了意想不到的连接'],
    neutral: ['信息流在不断拉扯你的注意力', '你发现自己花了两小时刷手机，却什么都没记住'],
    pessimistic: ['刷到的每一条"成功案例"都在告诉你：你不够好', '社交媒体把你的情绪放大了十倍'],
  },
  authority: {
    optimistic: ['一个有经验的人点拨了一句，你突然想通了', '前辈的一封邮件让你少走了三个月弯路'],
    neutral: ['领导的态度模糊，你拿不准是支持还是反对', '权威人物的话让你更犹豫了'],
    pessimistic: ['一句"你想清楚了吗"击碎了你最后的勇气', '那个你最信任的人，这次没有站在你这边'],
  },
  peer: {
    optimistic: ['朋友的一句"我觉得你可以"比你想象的更有力量', '同龄人的故事让你看到了另一种可能'],
    neutral: ['大家都在往前走，只有你还在原地', '同辈的节奏让你焦虑，但你不确定要不要跟'],
    pessimistic: ['翻开朋友圈那一刻，你觉得自己被落下了', '别人的生活像一面镜子，照出你所有的不确定'],
  },
  money: {
    optimistic: ['账户里的数字给了你一点底气', '经济上的缓冲让你敢于说"试试看"'],
    neutral: ['钱不多也不少，刚好够你继续纠结', '你在心里算了一笔账，结论是"再等等"'],
    pessimistic: ['钱的问题像一根刺，扎在每个决定的背后', '你发现"等有钱了再说"已经说了两年'],
  },
  time: {
    optimistic: ['deadline 反而让你不再犹豫', '时间紧迫让你跳过了纠结，直接行动'],
    neutral: ['时间在走，但你还在原地', '你觉得"还来得及"，但心里知道不太对'],
    pessimistic: ['时间不够了，你被迫做出一个不满意的决定', '你发现"来日方长"是最贵的幻觉'],
  },
  reputation: {
    optimistic: ['你决定不在乎别人的看法，反而轻松了', '放下"面子"的那一刻，你发现自己自由了'],
    neutral: ['你想做自己，但又怕别人怎么看', '面子问题像一层雾，让你看不清自己真正想要什么'],
    pessimistic: ['你害怕被评判，所以选了最安全的路', '别人的目光变成了一座牢'],
  },
  health: {
    optimistic: ['身体的信号让你停下来，反而想清楚了', '一次体检结果让你重新审视了优先级'],
    neutral: ['身体时好时坏，成了你拖延的借口', '你知道该注意健康，但总有"更重要的事"'],
    pessimistic: ['身体开始抗议了，但你还在硬撑', '你忽略了太多信号，直到它不再沉默'],
  },
  family: {
    optimistic: ['家人的一句话让你红了眼眶', '你发现爸妈也在悄悄改变，只是你之前没注意到'],
    neutral: ['家庭的期望像一条隐形的绳子', '你想做自己，但又不想让他们失望'],
    pessimistic: ['家庭的压力让你无法呼吸', '你发现自己越来越像那个你最不想成为的人'],
  },
};

// ===== 叙事模板库 =====
// 每个领域×路径类型有多套模板，避免重复
const NARRATIVE_TEMPLATES = {
  财务: {
    optimistic: [
      {
        title: '开源节流，财务松绑',
        openings: [
          '你终于打开那个一直不敢看的账单',
          '你决定对自己的钱诚实一次',
          '某个凌晨，你把所有支出列了一遍',
        ],
        arcs: [
          [
            { when: '头几天', what: '你发现至少有三笔"不知道什么时候开的"自动扣费' },
            { when: '第一周结束', what: '砍掉它们之后，你第一次觉得钱是自己的' },
            { when: '月底', what: '账户里多出来的数字让你有点不敢相信' },
          ],
          [
            { when: '前三天', what: '你开始用现金付早餐，发现一杯奶茶的钱够吃两顿' },
            { when: '两周后', what: '记账变成了一种习惯，你开始享受数字下降的感觉' },
            { when: '一个月', what: '你攒下了比预期多一倍的钱' },
          ],
        ],
        closings: [
          '这不是暴富，但你第一次掌握了主动权',
          '钱没变多，但你变了——不再被数字绑架',
          '你会发现，财务自由不是赚很多，而是花得明白',
        ],
        you_lose: '至少半年的消费自由——奶茶、外卖、冲动购物都要压缩',
        cost_of_nothing: '信用卡账单会继续涨，利息像滚雪球，半年后你可能连最低还款都吃力',
      },
      {
        title: '找到出口，压力减轻',
        openings: [
          '你在某个瞬间意识到，钱的问题不是钱不够，是花得不明白',
        ],
        arcs: [
          [
            { when: '第一周', what: '你做了一件一直不敢做的事——打开银行APP看余额' },
            { when: '第二周', what: '你发现"不知道花哪了"的钱比想象中多' },
            { when: '一个月后', what: '你开始觉得，钱是可以被管理的' },
          ],
        ],
        closings: [
          '财务状况没变好多少，但你的心态变了',
        ],
        you_lose: '一些即时满足感',
        cost_of_nothing: '你会继续在每个月底问自己：钱去哪了？',
      },
    ],
    neutral: [
      {
        title: '原地踏步，不上不下',
        openings: [
          '你想过要改变，但每次打开记账APP就烦',
          '你知道自己该理财，但"等发了工资再说"',
        ],
        arcs: [
          [
            { when: '第一周', what: '你下载了一个记账软件，记了三天' },
            { when: '第二周', what: '第四天忘了，然后就再也没打开过' },
            { when: '一个月', what: '你的财务状况没有变好，也没有变坏' },
          ],
        ],
        closings: [
          '通货膨胀在悄悄侵蚀你的购买力，只是你感觉不到',
        ],
        you_lose: '时间——这段时间本可以用来建立好的理财习惯',
        cost_of_nothing: '你会继续在每个月底问自己：钱去哪了？',
      },
    ],
    pessimistic: [
      {
        title: '债务雪球，越滚越大',
        openings: [
          '你发现自己已经在三个平台上借了钱',
          '某天你打开信用卡APP，心跳漏了一拍',
        ],
        arcs: [
          [
            { when: '头两周', what: '你用消费缓解焦虑，但每次打开账单都更焦虑' },
            { when: '一个月', what: '你开始拆东墙补西墙' },
            { when: '三个月', what: '最低还款额在涨，但你的收入没有' },
          ],
        ],
        closings: [
          '半年后你可能连最低还款都还不上',
        ],
        you_lose: '信用记录、未来的贷款资格、以及一部分自尊',
        cost_of_nothing: '债务不会消失，只会转移——从一个平台到另一个平台',
      },
    ],
  },
  职业: {
    optimistic: [
      {
        title: '找到方向，重新起飞',
        openings: [
          '你更新了简历，发现能写的比想象中多',
          '你鼓起勇气和领导谈了一次',
          '你在某个深夜决定：不能再这样下去了',
        ],
        arcs: [
          [
            { when: '第一周', what: '你更新了简历，投了三份' },
            { when: '两周后', what: '收到两个面试，其中一个让你心动' },
            { when: '一个月', what: '你拿到了offer，薪资比现在高20%' },
          ],
          [
            { when: '前三天', what: '你在LinkedIn上更新了状态，意外收到一个猎头消息' },
            { when: '第二周', what: '面试中你更清楚自己想要什么了' },
            { when: '一个半月', what: '你入职了新公司，第一天就感觉不一样' },
          ],
        ],
        closings: [
          '跳槽不是万能药，但换一个环境确实能让你重新认识自己',
          '你会发现，离开不是逃避，是选择',
        ],
        you_lose: '目前的舒适区和稳定的收入来源',
        cost_of_nothing: '两年后你还是在同一个工位上，看着比你年轻的人一个个超过你',
      },
    ],
    neutral: [
      {
        title: '原地调整，在夹缝中找空间',
        openings: [
          '你想走，但又怕找不到更好的',
          '你和同事吐槽了一下，感觉好了一点但问题没变',
        ],
        arcs: [
          [
            { when: '第一周', what: '你和领导表达了想尝试新方向的想法' },
            { when: '一个月', what: '被安排参与了一个新项目，但核心问题仍在' },
            { when: '三个月', what: '新项目有进展，但你的热情在消退' },
          ],
        ],
        closings: [
          '你会继续待着，但心里知道这不是终点',
        ],
        you_lose: '跳槽的最佳窗口期',
        cost_of_nothing: '两年后你还是在同一个工位上，只是工牌上的年份变了',
      },
    ],
    pessimistic: [
      {
        title: '消耗殆尽，热情归零',
        openings: [
          '你发现自己已经连续三周没有期待过任何一天',
          '周一早上闹钟响了三遍，你才勉强起来',
        ],
        arcs: [
          [
            { when: '前两周', what: '你投了几份简历，都是已读不回' },
            { when: '一个月', what: '面试了几家，但都不合适' },
            { when: '三个月', what: '你回到了原点，但热情又少了一截' },
          ],
        ],
        closings: [
          '你会变成那种每天数着下班时间的人',
        ],
        you_lose: '自信——每一次被拒都在告诉你"你不行"',
        cost_of_nothing: '两年后你还是会坐在这里，只是眼里的光更少了',
      },
    ],
  },
  感情: {
    optimistic: [
      {
        title: '打破僵局，关系升温',
        openings: [
          '你鼓起勇气发了一条消息，对方秒回了',
          '你们有一次深夜长聊，把积压的话都说出来了',
        ],
        arcs: [
          [
            { when: '第一天', what: '你发了那条一直在打字又删掉的消息' },
            { when: '第三天', what: '你们约了见面，聊了三个小时' },
            { when: '两周后', what: '你发现之前的很多矛盾其实是误解' },
          ],
        ],
        closings: [
          '好的感情不是没有矛盾，而是愿意一起面对',
        ],
        you_lose: '一部分"自我"——好的关系需要妥协',
        cost_of_nothing: '冷战变成常态，你们的对话越来越表面，直到有一天彻底沉默',
      },
    ],
    neutral: [
      {
        title: '悬而未决，关系在风中飘',
        openings: [
          '你们恢复了联系，但聊天变得很客气',
          '你看到对方发了一条朋友圈，纠结了半小时要不要点赞',
        ],
        arcs: [
          [
            { when: '第一周', what: '冷战继续，你开始习惯这种疏远' },
            { when: '一个月', what: '你们约了吃饭，全程没有提那件事' },
            { when: '三个月', what: '关系悬而未决，你不知道该进还是退' },
          ],
        ],
        closings: [
          '拖到最后，你们会以最平淡的方式分开',
        ],
        you_lose: '确定性——你不知道这段关系到底还值不值得投入',
        cost_of_nothing: '你会在某个深夜翻到半年前的聊天记录，发现那时候就已经不一样了',
      },
    ],
    pessimistic: [
      {
        title: '渐行渐远，直到沉默',
        openings: [
          '你发现对方已经把你们的合照从朋友圈删了',
          '你打了三个电话都没接，回了一条"在忙"',
        ],
        arcs: [
          [
            { when: '第一周', what: '一次小争吵引爆了积压已久的情绪' },
            { when: '一个月', what: '你们开始认真考虑是否还要继续' },
            { when: '三个月', what: '关系走到临界点，你们都需要一个答案' },
          ],
        ],
        closings: [
          '你会收到一条"我们谈谈吧"的消息',
        ],
        you_lose: '这段关系本身，以及对未来感情的信心',
        cost_of_nothing: '你会变成那种不敢认真的人',
      },
    ],
  },
  教育: {
    optimistic: [
      {
        title: '找到节奏，稳步提升',
        openings: [
          '你找到了一个适合自己的学习方法',
          '一次小测验的成绩让你看到了努力的回报',
        ],
        arcs: [
          [
            { when: '第一周', what: '你分析了自己的薄弱环节，制定了针对性计划' },
            { when: '两周后', what: '你用费曼学习法检验自己，发现真的记住了' },
            { when: '一个月', what: '成绩出来了——比上次高了15分' },
          ],
        ],
        closings: [
          '学习不是天赋，是方法',
        ],
        you_lose: '娱乐时间——但你会发现，学进去的快乐比刷手机持久',
        cost_of_nothing: '下次考试你会得到差不多的分数',
      },
    ],
    neutral: [
      {
        title: '不上不下，维持现状',
        openings: [
          '你按部就班地复习，但总觉得少了点什么',
          '你在网上看了很多学习方法，收藏了一堆但一个都没试',
        ],
        arcs: [
          [
            { when: '前两周', what: '你偶尔焦虑但很快被短视频冲淡' },
            { when: '一个月', what: '成绩没有下滑，但也没有明显进步' },
            { when: '三个月', what: '你习惯了这种"还行"的状态' },
          ],
        ],
        closings: [
          '毕业时你发现简历上什么亮点都没有',
        ],
        you_lose: '突破的可能性',
        cost_of_nothing: '你会变成那种说"我就是学不好"的人',
      },
    ],
    pessimistic: [
      {
        title: '动力归零，越陷越深',
        openings: [
          '你发现自己"假装学习"的时间比真正学习多',
          '模考成绩把你打回了原形',
        ],
        arcs: [
          [
            { when: '前两周', what: '你上课走神、作业拖延加重' },
            { when: '一个月', what: '你开始逃避学习相关的一切讨论' },
            { when: '三个月', what: '你形成了"我就是学不好"的固定思维' },
          ],
        ],
        closings: [
          '你会变成看到书就烦的人',
        ],
        you_lose: '对自己学习能力的信心',
        cost_of_nothing: '你会在毕业那天发现，自己什么都没准备好',
      },
    ],
  },
  心理: {
    optimistic: [
      {
        title: '开始觉察，慢慢好转',
        openings: [
          '你尝试了5分钟冥想，发现入睡确实快了一些',
          '你开始写情绪日记，第一次把自己的感受完整地写下来了',
        ],
        arcs: [
          [
            { when: '第一周', what: '你决定去看心理咨询，预约的那一刻反而觉得轻松了' },
            { when: '两周后', what: '你发现运动或冥想对情绪有改善' },
            { when: '一个月', what: '遇到压力时你学会了暂停和呼吸' },
          ],
        ],
        closings: [
          '情绪不是敌人，是信使',
        ],
        you_lose: '部分"敏感性"——但你会获得更稳定的内核',
        cost_of_nothing: '焦虑会变成你身体的一部分，像背景噪音一样永远存在',
      },
    ],
    neutral: [
      {
        title: '时好时坏，在波动中找平衡',
        openings: [
          '你知道自己该做点什么，但就是动不起来',
          '你的好心情持续了两天，第三天又回到了原点',
        ],
        arcs: [
          [
            { when: '前两周', what: '好的日子和坏的日子交替出现' },
            { when: '一个月', what: '你偶尔尝试调节但没坚持下来' },
            { when: '三个月', what: '整体没有明显改善，但也没有恶化' },
          ],
        ],
        closings: [
          '你会发现自己比三个月前更累了',
        ],
        you_lose: '时间和精力',
        cost_of_nothing: '三个月后你会发现自己比现在更累，但说不清为什么',
      },
    ],
    pessimistic: [
      {
        title: '情绪失控，影响一切',
        openings: [
          '你开始失眠了，凌晨三点盯着天花板',
          '你发现自己越来越不想社交，连消息都不想回',
        ],
        arcs: [
          [
            { when: '前两周', what: '情绪低落的时间越来越长' },
            { when: '一个月', what: '开始影响工作效率和社交' },
            { when: '三个月', what: '可能出现躯体化症状——头疼、胃疼、胸闷' },
          ],
        ],
        closings: [
          '你可能开始失眠、暴食或厌食',
        ],
        you_lose: '正常生活的能力',
        cost_of_nothing: '你会在某个凌晨因为胸口疼醒来，然后告诉自己"应该没什么大事"',
      },
    ],
  },
  健康: {
    optimistic: [
      {
        title: '及时干预，身体回应',
        openings: [
          '你鼓起勇气做了体检，结果比想象中好很多',
          '你开始每天走3000步，虽然不多但坚持了一周',
        ],
        arcs: [
          [
            { when: '第一周', what: '你做了全面检查，结果比想象中好' },
            { when: '两周后', what: '你开始执行改善方案' },
            { when: '两个月', what: '身体指标有了明显改善' },
          ],
        ],
        closings: [
          '身体比你想象的更愿意配合你',
        ],
        you_lose: '一些坏习惯带来的即时快感',
        cost_of_nothing: '小问题会变成大问题，到时候花的不只是钱，还有时间',
      },
    ],
    neutral: [
      {
        title: '温水煮青蛙，问题在积累',
        openings: [
          '你知道该运动了，但"明天再说"已经说了三周',
          '你买了一堆健康食品，放到过期了一半',
        ],
        arcs: [
          [
            { when: '前两周', what: '你做了基本检查，结果"还行"' },
            { when: '一个月', what: '你偶尔担心但日常不受影响' },
            { when: '三个月', what: '你习惯了这种"亚健康"状态' },
          ],
        ],
        closings: [
          '有些慢性病就是这样"温水煮青蛙"',
        ],
        you_lose: '主动权',
        cost_of_nothing: '你会在某天突然发现，裤子又紧了',
      },
    ],
    pessimistic: [
      {
        title: '忽视信号，小病变大病',
        openings: [
          '你发现自己的体重又涨了，裤子又紧了',
          '你开始频繁头疼，但一直拖着没去检查',
        ],
        arcs: [
          [
            { when: '前两周', what: '你觉得"应该没什么大事"' },
            { when: '一个月', what: '症状时好时坏，你选择忽略' },
            { when: '三个月', what: '问题在不知不觉中加重' },
          ],
        ],
        closings: [
          '你可能在某个凌晨因为疼痛醒来',
        ],
        you_lose: '最佳治疗窗口',
        cost_of_nothing: '身体在发出信号，但你选择忽略它们——直到它们不再沉默',
      },
    ],
  },
  创业: {
    optimistic: [
      {
        title: '验证需求，找到可行模式',
        openings: [
          '你做了一个最小可行产品，发到群里有人表示感兴趣',
          '你找到了一个互补的合伙人',
        ],
        arcs: [
          [
            { when: '第一周', what: 'MVP测试收到了真实用户反馈' },
            { when: '两周后', what: '你快速迭代，产品方向清晰了' },
            { when: '两个月', what: '你有了第一批付费用户' },
          ],
        ],
        closings: [
          '创业不是赌博，是实验',
        ],
        you_lose: '稳定的收入和社交时间',
        cost_of_nothing: '一年后你在聚会上听到有人说"我做了个和你当时想法差不多的东西"',
      },
    ],
    neutral: [
      {
        title: '想法很多，执行为零',
        openings: [
          '你的商业计划书写了三版，每一版都觉得不够好',
          '你和几个朋友聊了想法，大家都说"挺好的"但没人愿意加入',
        ],
        arcs: [
          [
            { when: '前两周', what: '你看了大量创业课程但没动手' },
            { when: '一个月', what: '你写了商业计划书但觉得不够完善' },
            { when: '三个月', what: '你还在"准备阶段"' },
          ],
        ],
        closings: [
          '六个月后你发现自己还在"准备"',
        ],
        you_lose: '时间窗口',
        cost_of_nothing: '你会变成那种"我当年也想过做这个"的人',
      },
    ],
    pessimistic: [
      {
        title: '投入过多，市场不买账',
        openings: [
          '你的MVP上线一周，访问量只有个位数',
          '你发现你的"独特想法"其实已经有人在做了',
        ],
        arcs: [
          [
            { when: '第一周', what: '产品上线但反响冷淡' },
            { when: '一个月', what: '获客成本太高，你开始怀疑方向' },
            { when: '三个月', what: '现金流紧张，你开始算还能撑多久' },
          ],
        ],
        closings: [
          '深夜算完账发现钱只够再撑两个月',
        ],
        you_lose: '钱、时间、以及一部分自信',
        cost_of_nothing: '你会变成那种"我当年也想过做这个"的人，只是你的版本更贵',
      },
    ],
  },
  家庭: {
    optimistic: [
      {
        title: '找到边界，关系趋于健康',
        openings: [
          '你和父母有一次不带争吵的对话，虽然只有十分钟',
          '你学会了在电话里说"我知道你是为我好，但是..."',
        ],
        arcs: [
          [
            { when: '第一周', what: '你尝试温和但坚定地表达边界' },
            { when: '两周后', what: '家人开始慢慢尊重你的选择' },
            { when: '两个月', what: '家庭互动模式有了积极变化' },
          ],
        ],
        closings: [
          '边界不是墙，是门——你可以选择什么时候开',
        ],
        you_lose: '"全家和谐"的假象',
        cost_of_nothing: '你会继续在每次家庭聚会后生一肚子闷气',
      },
    ],
    neutral: [
      {
        title: '维持表面和平',
        openings: [
          '过年回家一切照旧，该催的还是催，该吵的还是吵',
          '你打了个电话回去，聊了五分钟天气就挂了',
        ],
        arcs: [
          [
            { when: '前两周', what: '你想改变但不知道怎么开口' },
            { when: '一个月', what: '你偶尔尝试表达但被旧模式淹没' },
            { when: '三个月', what: '关系基本维持原状' },
          ],
        ],
        closings: [
          '你会越来越不想回家',
        ],
        you_lose: '表达真实自我的机会',
        cost_of_nothing: '你会变成那种逢年过节不想回家的人',
      },
    ],
    pessimistic: [
      {
        title: '矛盾升级，关系僵化',
        openings: [
          '一次家庭聚餐变成了一场审判',
          '你发现自己和父母的沟通方式已经退化到了"嗯""好""知道了"',
        ],
        arcs: [
          [
            { when: '第一周', what: '一次冲突引爆了所有积怨' },
            { when: '一个月', what: '沟通变成了争吵' },
            { when: '三个月', what: '可能需要专业人士介入' },
          ],
        ],
        closings: [
          '你会变成逢年过节不想回家的人',
        ],
        you_lose: '家庭作为后盾的安全感',
        cost_of_nothing: '你会在某个深夜突然很想家，但不知道该打给谁',
      },
    ],
  },
  default: {
    optimistic: [
      {
        title: '开始改变，看到希望',
        openings: [
          '你决定从小事开始改变',
          '你和一个信任的人聊了聊，感觉不那么孤单了',
        ],
        arcs: [
          [
            { when: '第一周', what: '你做了一件一直想做但没做的事' },
            { when: '两周后', thing: '虽然结果一般，但感觉不错' },
            { when: '一个月', what: '你发现改变没有想象中那么难' },
          ],
        ],
        closings: [
          '改变不是一夜之间的事，但每一步都算数',
        ],
        you_lose: '一些安逸',
        cost_of_nothing: '三个月后你发现自己还在原地',
      },
    ],
    neutral: [
      {
        title: '在纠结中消耗',
        openings: [
          '你想了很多但做的很少',
          '你在纠结中度过了一个周末',
        ],
        arcs: [
          [
            { when: '前两周', what: '情绪波动较大' },
            { when: '一个月', what: '你开始接受现状' },
            { when: '三个月', what: '你找到了一个"还行"的平衡' },
          ],
        ],
        closings: [
          '你会变成那种说"还行吧"的人',
        ],
        you_lose: '突破的可能',
        cost_of_nothing: '你会在某个深夜突然觉得，自己好像被困住了',
      },
    ],
    pessimistic: [
      {
        title: '压力持续，越陷越深',
        openings: [
          '你发现自己又在重复去年的模式',
          '你在某个深夜突然觉得，自己好像被困住了',
        ],
        arcs: [
          [
            { when: '前两周', what: '你尝试了一些方法但效果不明显' },
            { when: '一个月', what: '你感到疲惫和无力' },
            { when: '三个月', what: '你学会了和压力共处，但这不是你想要的生活' },
          ],
        ],
        closings: [
          '压力不会消失，只会转移',
        ],
        you_lose: '一部分对生活的热情',
        cost_of_nothing: '你会变成那种说"算了"的人',
      },
    ],
  },
};

// ===== 三件烂事（更多变体） =====
const BAD_THINGS_TEMPLATES = {
  财务: [
    { icon: '💳', pool: ['月底翻信用卡账单时发现数字比上个月又多了一截', '收到银行短信提醒"本期最低还款额"，心跳漏了一拍', '你发现自己已经在三个平台上借了钱', '你打开支付宝发现花呗额度被降了'] },
    { icon: '🛒', pool: ['深夜刷到"限时折扣"，告诉自己"就这一次"', '你把购物车清空了三次，但每次又加回来更多', '收到快递时已经忘了自己买过这个', '你发现自己一个月花了三千多在"小东西"上'] },
    { icon: '💸', pool: ['朋友约饭你说"最近有点紧"', '你发现请客吃饭一个月花了三千多', '同事讨论旅游计划时你默默不说话', '你发现自己已经在用下个月的钱了'] },
  ],
  职业: [
    { icon: '😴', pool: ['周一早上闹钟响了三遍你才起来', '你在工位上发呆了二十分钟才打开电脑', '你发现自己已经连续三周没有期待过任何一天', '你开始数着下班时间过日子'] },
    { icon: '📧', pool: ['领导在群里@你，心跳漏了一拍——结果只是普通文件', '你打开邮箱发现有67封未读，但没有一封是好消息', '你收到一封"关于组织架构调整的通知"', '你发现自己已经一周没有主动做过任何事'] },
    { icon: '🪞', pool: ['新来的实习生比你小五岁，干的活比你多', '你更新简历时发现能写的亮点比想象中少', '面试时被问"你的核心竞争力是什么"，你卡壳了', '你发现自己已经没有可以写在简历上的新经历了'] },
  ],
  感情: [
    { icon: '📱', pool: ['你忍不住翻对方朋友圈，看到一条模糊动态就脑补一出大戏', '你打了一段话又删掉，反复三次', '你发现对方的朋友圈对你设置了三天可见', '你发现自己已经一周没有收到对方的消息了'] },
    { icon: '🌙', pool: ['某个周五晚上一个人待着，突然特别想找人说话', '你路过你们以前常去的地方，脚步不自觉地慢了下来', '你在凌晨两点翻到了半年前的聊天记录', '你发现自己已经很久没有笑过了'] },
    { icon: '💬', pool: ['你们的对话越来越短，从长语音变成了"嗯""好"', '你发现你们已经一个月没有打过电话了', '你们可能会有一次"假性和好"——表面恢复联系，但谁都没提根本问题', '你发现自己已经不期待对方的消息了'] },
  ],
  教育: [
    { icon: '📊', pool: ['成绩出来那天假装不在意，手抖着点开查询页面', '你发现自己"假装学习"的时间比真正学习多', '模考成绩出来后你在厕所待了十分钟', '你发现自己已经一个月没有认真听过课了'] },
    { icon: '👨‍👩‍👧', pool: ['家庭聚餐时亲戚问"考得怎么样"', '爸妈打电话说"我们不给你压力"，但语气里全是压力', '你发现自己的朋友圈把家人屏蔽了', '你发现自己已经不想和任何人讨论学习了'] },
    { icon: '📱', pool: ['凌晨两点打开学习APP，刷了五分钟切回短视频', '你的书桌上堆满了资料但一本都没翻完', '你发现自己收藏的学习方法比做过的题还多', '你已经不记得上次认真学习是什么时候了'] },
  ],
  心理: [
    { icon: '🛏️', pool: ['某天请了一天假，不是身体不舒服，就是不想动', '你发现自己已经连续一周没有出过门了', '你躺在床上但怎么也睡不着，脑子里全是事', '你发现自己已经很久没有为任何事感到兴奋了'] },
    { icon: '😶', pool: ['有人问"最近怎么样"，你说"还行"', '你发现自己已经很久没有真正笑过了', '你在朋友圈发了"我很好"但其实一点都不好', '你发现自己已经不期待任何事了'] },
    { icon: '🔄', pool: ['情绪好转那天觉得自己"已经好了"，然后下一次低谷崩溃得更厉害', '你发现自己又在重复去年的模式', '你在某个瞬间觉得一切都没有意义', '你发现自己已经不知道"正常"是什么感觉了'] },
  ],
  健康: [
    { icon: '🏥', pool: ['搜某个症状被结果吓到，纠结三天要不要去医院', '体检报告上多了一个"建议复查"的项目', '你发现自己已经三个月没有运动了', '你发现自己已经一个月没有睡够7小时了'] },
    { icon: '🍔', pool: ['说"从明天开始健康饮食"，但明天加班到九点又点了外卖', '你发现自己一周吃了五次外卖', '你把冰箱里的蔬菜放到了过期', '你发现自己已经不记得上次做饭是什么时候了'] },
    { icon: '😴', pool: ['知道该早睡了，但到了晚上就是不想结束这一天', '你发现自己已经连续一个月凌晨一点后才睡', '你在凌晨三点醒来，然后再也睡不着', '你发现自己已经习惯了疲惫'] },
  ],
  创业: [
    { icon: '📊', pool: ['商业计划给朋友看，对方说"挺好的"然后岔开话题', '你发现你的"独特想法"其实已经有人在做了', '你的产品上线一周，访问量大部分是你自己', '你发现自己已经三个月没有休息日了'] },
    { icon: '💰', pool: ['算了一笔账：按现在的烧钱速度还能撑X个月', '你发现自己的积蓄比创业前少了一半', '你在犹豫要不要跟家里开口借钱', '你发现自己已经在用信用卡维持公司运营了'] },
    { icon: '🪞', pool: ['某天突然想"如果当初继续上班会怎样"', '你发现自己已经三个月没有休息日了', '你在深夜算完账后失眠了', '你发现自己已经不记得上次开心是什么时候了'] },
  ],
  家庭: [
    { icon: '📞', pool: ['爸妈打电话开头"没什么事就是问问"，结尾变成"你到底怎么想的"', '你发现自己已经两个月没有主动给家里打电话了', '你在家庭群里只发红包不说话', '你发现自己已经不期待和父母的对话了'] },
    { icon: '🏠', pool: ['过年回家第一天其乐融融，第三天开始摩擦', '你发现和父母的对话已经变成了"嗯""好""知道了"', '你在某个瞬间发现自己说话的语气越来越像你妈/爸', '你发现自己已经不想解释自己的生活了'] },
    { icon: '😶', pool: ['你发现自己已经开始用父母当年说你的话来说别人了', '你在某个深夜突然很想家但不知道该打给谁', '你发现自己已经很久没有主动联系家人了', '你在某个瞬间意识到，你已经很久没有给家里打电话了'] },
  ],
  default: [
    { icon: '📱', pool: ['深夜突然焦虑，打开手机搜各种"怎么办"', '你发现自己一晚上解锁了50次手机', '你在凌晨三点刷到了一条让你更焦虑的帖子', '你发现自己已经不记得上次放下手机是什么时候了'] },
    { icon: '⏰', pool: ['跟自己说"下个月开始改变"，然后下个月再说同样的话', '你发现自己已经在同一个问题上纠结了三个月', '你翻开去年的日记发现写的是同样的话', '你发现自己已经说了三次"等忙完这阵就好了"'] },
    { icon: '🪞', pool: ['突然意识到一年前你也在纠结同样的事', '你发现自己已经很久没有为任何事感到兴奋了', '你在某个瞬间觉得自己好像被困住了', '你发现自己已经不知道自己想要什么了'] },
  ],
};

class PredictionEngine {
  constructor() {
    this.externalQuote = null;
    this.fetchExternalQuote();
    this._usedTemplates = new Set();
  }

  async fetchExternalQuote() {
    if (!API_CONFIG || !API_CONFIG.quotes) return;
    for (const api of API_CONFIG.quotes) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), API_CONFIG.timeout || 3000);
        const res = await fetch(api.url, { signal: controller.signal });
        clearTimeout(timer);
        const data = await res.json();
        const parsed = api.parser(data);
        if (parsed && parsed.text) { this.externalQuote = parsed; return; }
      } catch (e) {}
    }
  }

  // ===== 改进的 MBTI 推断 =====
  inferMBTI(text, mood, userPreferences = {}) {
    const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
    const textLower = text.toLowerCase();

    if (userPreferences.EI) scores[userPreferences.EI] += 6;
    if (userPreferences.SN) scores[userPreferences.SN] += 6;
    if (userPreferences.TF) scores[userPreferences.TF] += 6;
    if (userPreferences.JP) scores[userPreferences.JP] += 6;

    for (const [dim, info] of Object.entries(MBTI_DIMENSIONS)) {
      for (const kw of info.keywords) {
        if (textLower.includes(kw)) scores[dim] += 1.5;
      }
    }

    if (['anxious', 'fearful', 'sad'].includes(mood)) { scores.I += 0.5; scores.F += 0.5; }
    if (['angry', 'excited'].includes(mood)) { scores.E += 0.5; scores.T += 0.5; }
    if (mood === 'confused') { scores.P += 0.5; scores.N += 0.5; }
    if (mood === 'neutral') { scores.T += 0.3; scores.J += 0.3; }

    if (text.length > 150) { scores.I += 0.3; scores.N += 0.3; }
    if (text.length < 20) { scores.E += 0.3; scores.S += 0.3; }

    const questionCount = (text.match(/[？?]/g) || []).length;
    if (questionCount >= 3) { scores.N += 0.5; scores.P += 0.5; }

    if (/一定|必须|肯定|绝对/.test(text)) { scores.J += 1; }
    if (/可能|也许|大概|不确定|不知道/.test(text)) { scores.P += 1; }
    if (/因为|所以|导致|因此|逻辑|分析/.test(text)) { scores.T += 1; }
    if (/感觉|觉得|心疼|难受|开心|喜欢/.test(text)) { scores.F += 1; }

    const type = (scores.E >= scores.I ? 'E' : 'I') +
                 (scores.S >= scores.N ? 'S' : 'N') +
                 (scores.T >= scores.F ? 'T' : 'F') +
                 (scores.J >= scores.P ? 'J' : 'P');

    const dims = [['E','I'], ['S','N'], ['T','F'], ['J','P']];
    const dimDiffs = dims.map(([a,b]) => Math.abs(scores[a] - scores[b]));
    const avgDiff = dimDiffs.reduce((s,d) => s + d, 0) / 4;
    const hasUserPref = Object.keys(userPreferences).length;
    const baseConfidence = hasUserPref ? 70 : 35;
    const confidence = Math.min(95, Math.max(25, Math.round(baseConfidence + avgDiff * 8)));

    return { type, confidence, scores, style: MBTI_STYLES[type] || MBTI_STYLES['ISFJ'], userPreferences };
  }

  // ===== 用户输入回声：提取关键词用于回声 =====
  extractUserWords(text) {
    const words = [];
    // 提取有意义的中文词组
    const segments = text.match(/[一-龥]{2,6}/g) || [];
    const stopWords = ['但是', '可是', '不过', '然后', '所以', '因为', '如果', '虽然', '已经', '觉得', '感觉', '知道', '可以', '应该', '可能', '想要', '不想', '不敢', '不知道', '有时候', '一些', '很多', '没有', '还是', '就是', '不是'];
    for (const seg of segments) {
      if (!stopWords.includes(seg) && seg.length >= 2) {
        words.push(seg);
      }
    }
    return [...new Set(words)].slice(0, 5);
  }

  // ===== 从用户输入生成回声句 =====
  echoUserInput(text, domain) {
    const words = this.extractUserWords(text);
    if (words.length === 0) return '';

    const word = words[Math.floor(Math.random() * words.length)];
    const echoes = [
      `你提到的"${word}"，这正是问题的核心`,
      `"${word}"这三个字背后，藏着你真正想说的`,
      `你说"${word}"的时候，我能感受到那份重量`,
      `关于"${word}"——你心里其实已经有答案了`,
      `"${word}"不是一个小问题，它值得你认真对待`,
    ];
    return echoes[Math.floor(Math.random() * echoes.length)];
  }

  // ===== 共情生成（改进版） =====
  generateEmpathy(text, mood, persona, mbti) {
    const keywords = this.extractKeywords(text);
    const domain = keywords[0]?.tag || '日常';
    const pool = DOMAIN_EMPATHY[domain];
    let base;

    if (pool && pool[mood] && pool[mood].length) {
      base = pool[mood][Math.floor(Math.random() * pool[mood].length)];
    } else {
      const defaults = {
        anxious: '我能感受到你内心的不安。',
        angry: '你的愤怒是可以理解的。',
        sad: '我能感受到你的难过。',
        confused: '迷茫的时候最难熬。',
        hopeful: '你的期待让我感到振奋。',
        fearful: '恐惧是人类最原始的保护机制。',
        neutral: '你看起来比较平静。',
        excited: '你的兴奋很有感染力！',
      };
      base = defaults[mood] || defaults.neutral;
    }

    // MBTI 维度增强
    const dim = mbti.type;
    const additions = [];
    if (dim[0] === 'I') additions.push('你习惯在内心消化这些，但有时候说出来会更好');
    if (dim[0] === 'E') additions.push('你可能会想找人聊聊这件事，这对你来说很重要');
    if (dim[1] === 'N') additions.push('你总是在想"如果"和"万一"，这让你看到了更多可能性');
    if (dim[1] === 'S') additions.push('你更关注眼前的具体问题，这是务实的表现');
    if (dim[2] === 'F') additions.push('这件事对你的意义，比表面上看起来更深');
    if (dim[2] === 'T') additions.push('你在试图理性分析，但有些情绪是分析不了的');
    if (dim[3] === 'J') additions.push('你想要一个确定的答案，但人生有时候就是没有标准答案');
    if (dim[3] === 'P') additions.push('你不想被框住，但有时候做选择本身就是一种解脱');

    if (additions.length > 0) {
      base += additions[Math.floor(Math.random() * additions.length)] + '。';
    }

    return this.applyPersonaTone(base, persona, mood);
  }

  // ===== 人格化语气重写（不只是加前缀） =====
  applyPersonaTone(text, persona, mood) {
    if (persona === 'brutal') {
      // 毒舌：直接、尖锐、但有洞察
      const openers = ['说实话，', '别骗自己了——', '我直说吧：', '残酷的真相是：', '你心里清楚：'];
      const closer = mood === 'sad' ? '但哭完了还得站起来。' : mood === 'anxious' ? '焦虑解决不了任何问题。' : '';
      return openers[Math.floor(Math.random() * openers.length)] + text + closer;
    }
    if (persona === 'elder') {
      // 年长的自己：温和、有深度、带反思
      const openers = ['十年前的我也经历过这个。回头看，', '如果我能回到你这个时候——', '以过来人的经验：', '回头看，'];
      return openers[Math.floor(Math.random() * openers.length)] + text;
    }
    return text;
  }

  // ===== 叙事重写（针对路径内容） =====
  rewriteNarrative(text, persona, pathType) {
    if (persona === 'brutal') {
      // 毒舌路径：用更直接的语言
      return text
        .replace(/可能/g, '大概率')
        .replace(/开始/g, '终于')
        .replace(/改善/g, '没那么烂了')
        .replace(/挑战/g, '硬仗')
        .replace(/调整/g, '妥协');
    }
    if (persona === 'elder') {
      // 年长路径：加反思性语句
      if (pathType === 'optimistic') return '这条路我走过，确实能走通——' + text;
      if (pathType === 'pessimistic') return '我当年就是这么耗过来的——' + text;
      return '大多数人最后都选了这条路——' + text;
    }
    return text;
  }

  // ===== 标题重写 =====
  rewriteTitle(title, persona, pathType) {
    if (persona === 'brutal') {
      const brutalMap = {
        optimistic: ['运气不错的话——' + title, '如果走运——' + title],
        neutral: ['大概率就这样了——' + title, '不痛不痒地凑合——' + title],
        pessimistic: ['不改的话——' + title, '等着被教做人——' + title],
      };
      const pool = brutalMap[pathType] || [title];
      return pool[Math.floor(Math.random() * pool.length)];
    }
    if (persona === 'elder') {
      const elderMap = {
        optimistic: ['这条路我走过——' + title, '回头看，这条路是对的'],
        neutral: ['大多数人最后都这样——' + title, '我当时也选了这条路'],
        pessimistic: ['我当年就是这么耗过来的——' + title, '别重蹈我的覆辙——' + title],
      };
      const pool = elderMap[pathType] || [title];
      return pool[Math.floor(Math.random() * pool.length)];
    }
    return title;
  }

  // ===== 关键词提取 =====
  extractKeywords(text) {
    const keywords = [];
    const patterns = [
      { regex: /跳槽|换工作|辞职|离职|求职|面试|升职|降薪|加班|职场|职业倦怠|副业|offer|简历/g, tag: '职业', icon: '💼' },
      { regex: /对象|男友|女友|老公|老婆|分手|吵架|冷战|恋爱|结婚|离婚|暧昧|前任|复合/g, tag: '感情', icon: '💕' },
      { regex: /公司|老板|同事|领导|团队|项目|裁员|失业|被裁|优化|述职/g, tag: '职业', icon: '🏢' },
      { regex: /创业|开公司|合伙人|融资|生意|天使轮|商业模式/g, tag: '创业', icon: '🚀' },
      { regex: /孩子|高考|考试|学校|成绩|老师|同学|留学|考研|志愿|录取|补课|作业/g, tag: '教育', icon: '📚' },
      { regex: /股票|基金|投资|理财|亏损|赚钱|房价|房贷|工资|消费|存钱|保险|信用卡|网贷|负债|借钱/g, tag: '财务', icon: '💰' },
      { regex: /焦虑|抑郁|失眠|压力|崩溃|迷茫|害怕|内耗|情绪|心理咨询|自残|绝望|孤独/g, tag: '心理', icon: '🧠' },
      { regex: /父母|家人|亲戚|家庭|养老|带娃|原生家庭|催生|逼婚|遗产|赡养/g, tag: '家庭', icon: '👨‍👩‍👧' },
      { regex: /健康|生病|医院|体检|减肥|运动|疲劳|亚健康|癌症|慢性病|康复/g, tag: '健康', icon: '❤️' },
      { regex: /AI|人工智能|ChatGPT|技术|转型|被取代|程序员/g, tag: '科技', icon: '🤖' },
      { regex: /自媒体|短视频|直播|流量|粉丝|内容|创作|公众号|抖音|小红书/g, tag: '自媒体', icon: '📱' },
      { regex: /物业|小区|邻居|装修|搬家|租房|买房|换城市|通勤|合租/g, tag: '居住', icon: '🏠' },
    ];
    patterns.forEach(p => {
      const matches = text.match(p.regex);
      if (matches) keywords.push({ tag: p.tag, icon: p.icon, words: [...new Set(matches)].slice(0, 3) });
    });
    if (keywords.length === 0) keywords.push({ tag: '日常', icon: '📌', words: [text.substring(0, 6)] });
    return keywords;
  }

  // ===== 三件烂事（从池中随机选取） =====
  generateBadThings(domain, persona) {
    const pool = BAD_THINGS_TEMPLATES[domain] || BAD_THINGS_TEMPLATES.default;
    return pool.map(item => {
      const event = item.pool[Math.floor(Math.random() * item.pool.length)];
      const rewritten = this.rewriteNarrative(event, persona, 'pessimistic');
      return { icon: item.icon, event: rewritten };
    });
  }

  generatePollData(domain) {
    const base = POLL_DATA[domain] || POLL_DATA.日常;
    const j = () => Math.round((Math.random() - 0.5) * 6);
    return {
      optimistic: Math.max(5, base.optimistic + j()),
      neutral: Math.max(5, base.neutral + j()),
      pessimistic: Math.max(5, base.pessimistic + j()),
    };
  }

  // ===== 主推演入口 =====
  async run(text, mood, scope, intensity, timeScale, uncertainty, factors, persona, mbtiPrefs, onStep) {
    if (onStep) onStep('empathy', '正在分析你的性格特征...', 8);
    await this.delay(200);
    const mbti = this.inferMBTI(text, mood, mbtiPrefs);
    if (onStep) onStep('mbti', `性格类型：${mbti.type}（${mbti.style.approach}）`, 20);
    await this.delay(300);
    if (onStep) onStep('analyze', '理解你的处境...', 40);
    await this.delay(300);
    if (onStep) onStep('paths', '生成三条推演路径...', 60);
    await this.delay(400);
    if (onStep) onStep('persona', '用' + (PERSONAS[persona]?.name || '毒舌朋友') + '的口吻改写...', 80);
    await this.delay(300);
    const result = this.generateLocal(text, mood, scope, intensity, timeScale, uncertainty, factors, persona, mbti);
    if (onStep) onStep('complete', '推演完成', 100);
    return result;
  }

  generateLocal(text, mood, scope, intensity, timeScale, uncertainty, factors, persona, mbti) {
    const moodInfo = EMOTION_MAP[mood] || EMOTION_MAP.neutral;
    const keywords = this.extractKeywords(text);
    const domain = keywords[0]?.tag || '日常';
    const timeLabel = TIME_LABELS[timeScale] || '一个月';
    const empathy = this.generateEmpathy(text, mood, persona, mbti);

    // 概率计算
    const baseOpt = moodInfo.valence > 0.2 ? 38 : (moodInfo.valence < -0.2 ? 22 : 32);
    const basePes = moodInfo.valence < -0.2 ? 32 : (moodInfo.valence > 0.2 ? 14 : 22);
    const uncFactor = uncertainty / 5;

    let optMod = 0, pesMod = 0;
    factors.forEach(f => {
      if (['money', 'health'].includes(f)) { optMod -= 2; pesMod += 2; }
      if (['authority', 'family'].includes(f)) { optMod -= 1; pesMod += 1; }
      if (['time'].includes(f)) { optMod -= 1; pesMod += 3; }
    });

    const optimistic = Math.max(10, Math.min(55, baseOpt + optMod + Math.round((Math.random() - 0.5) * uncFactor * 24)));
    const pessimistic = Math.max(10, Math.min(50, basePes + pesMod + Math.round((Math.random() - 0.5) * uncFactor * 18)));
    const neutral = Math.max(15, 100 - optimistic - pessimistic);

    // 生成路径
    const makePath = (pathType) => {
      const templates = NARRATIVE_TEMPLATES[domain]?.[pathType] || NARRATIVE_TEMPLATES.default[pathType];
      const template = templates[Math.floor(Math.random() * templates.length)];
      const arc = template.arcs[Math.floor(Math.random() * template.arcs.length)];
      const opening = template.openings[Math.floor(Math.random() * template.openings.length)];
      const closing = template.closings[Math.floor(Math.random() * template.closings.length)];

      // 用户输入回声
      const echo = this.echoUserInput(text, domain);

      // 因素影响
      let factorNote = '';
      if (factors.length > 0) {
        const f = factors[Math.floor(Math.random() * factors.length)];
        const effect = FACTOR_EFFECTS[f];
        if (effect && effect[pathType]) {
          factorNote = effect[pathType][Math.floor(Math.random() * effect[pathType].length)];
        }
      }

      // 叙事重写
      const rewrittenTitle = this.rewriteTitle(template.title, persona, pathType);
      const rewrittenOpening = this.rewriteNarrative(opening, persona, pathType);
      const rewrittenClosing = this.rewriteNarrative(closing, persona, pathType);
      const rewrittenArc = arc.map(a => ({
        period: a.when,
        event: this.rewriteNarrative(a.what || a.thing, persona, pathType),
      }));

      return {
        title: rewrittenTitle,
        opening: rewrittenOpening,
        closing: rewrittenClosing,
        turning_points: rewrittenArc,
        you_lose: this.rewriteNarrative(template.you_lose, persona, pathType),
        cost_of_nothing: this.rewriteNarrative(template.cost_of_nothing, persona, pathType),
        echo,
        factorNote,
      };
    };

    return {
      empathy,
      mbti,
      optimistic: { probability: optimistic, ...makePath('optimistic') },
      neutral: { probability: neutral, ...makePath('neutral') },
      pessimistic: { probability: pessimistic, ...makePath('pessimistic') },
      badThings: this.generateBadThings(domain, persona),
      readingCards: READING_CARDS[domain] || READING_CARDS.default,
      stats: STATS_DATA[domain] || STATS_DATA.default,
      poll: this.generatePollData(domain),
      domain,
      factors,
    };
  }

  delay(ms) { return new Promise(r => setTimeout(r, ms)); }
}

window.PredictionEngine = PredictionEngine;
window.EMOTION_MAP = EMOTION_MAP;
window.SCOPE_LABELS = SCOPE_LABELS;
window.TIME_LABELS = TIME_LABELS;
window.INTENSITY_LABELS = INTENSITY_LABELS;
window.UNCERTAINTY_LABELS = UNCERTAINTY_LABELS;
window.FACTOR_EFFECTS = FACTOR_EFFECTS;
