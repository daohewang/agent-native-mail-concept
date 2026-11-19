export const DEMO_MAILS = [
  {
    id: 'm1',
    from: '林清 · 北岸工作室',
    address: 'linqing@example.com',
    subject: 'Re: 品牌更新项目 · 报价与范围确认',
    preview: '我们已根据周二讨论更新了报价，期待你们在周五前确认范围。',
    body: '剑武你好，\n\n我们已根据周二讨论更新了报价。最终版包含首页设计、组件库及两轮验收，交付日期调整为 12 月 12 日。请在周五前确认是否按这版范围推进。\n\n谢谢，\n林清',
    time: '09:42',
    tag: '待回复',
  },
  {
    id: 'm2',
    from: '北岸工作室 · 项目组',
    address: 'project@example.com',
    subject: '品牌更新项目 · 报价 v3',
    preview: '附件是最终报价，设计范围与验收节点已标注。',
    body: '你好，\n\n附上报价 v3：设计范围为首页、组件库与移动端适配。第一轮验收在 11 月 30 日，第二轮验收在 12 月 12 日。如无异议，我们会按此排期启动。\n\n项目组',
    time: '昨天',
    tag: '报价',
  },
  {
    id: 'm3',
    from: '周予 · 产品团队',
    address: 'zhouyu@example.com',
    subject: '下周产品评审时间',
    preview: '周二下午和周三上午都可以，想请你汇总一下大家的时间。',
    body: '大家好，\n\n下周的产品评审需要确认时间。我周二下午、周三上午都方便，麻烦看看其余同事的安排。\n\n周予',
    time: '昨天',
    tag: '日程',
  },
  {
    id: 'm4',
    from: '运营组',
    address: 'ops@example.com',
    subject: '十一月客户反馈汇总',
    preview: '六封反馈邮件已整理在同一个会话里。',
    body: '大家好，\n\n十一月的六封客户反馈已汇总。高频问题是新手引导不够清晰、进度状态不易理解。建议下周讨论优先级。\n\n运营组',
    time: '周二',
    tag: '已整理',
  },
];

export const INITIAL_TASKS = [
  {
    id: 't1',
    title: '确认北岸工作室的合作范围',
    goal: '核对最新报价与交付范围，准备回复。',
    status: 'approval',
    category: '合作推进',
    subtitle: '已核对两封邮件，回复草稿等待你确认。',
    time: '刚刚更新',
    sources: ['m1', 'm2'],
    recipient: 'linqing@example.com',
    subject: 'Re: 品牌更新项目 · 报价与范围确认',
    draft: '林清你好，\n\n我已核对报价 v3 中的设计范围与验收节点。首页、组件库及移动端适配的范围清楚，12 月 12 日作为最终交付日期也与我们的计划一致。请按这一版推进，并在启动前同步第一轮验收所需材料。\n\n谢谢！',
    steps: [
      '找到与项目相关的最新邮件',
      '对照报价 v3 与交付节点',
      '起草回复并标出待确认事项',
      '等待你的批准后模拟发送',
    ],
    revisionCount: 0,
    sentSimulated: false,
  },
  {
    id: 't2',
    title: '协调下周的产品评审',
    goal: '汇总同事可用时间，给出一个可确认的评审时段。',
    status: 'working',
    category: '日程协调',
    subtitle: '正在对照两组时间，尚未联系任何人。',
    time: '3 分钟前',
    sources: ['m3'],
    recipient: 'zhouyu@example.com',
    subject: 'Re: 下周产品评审时间',
    draft: '周予你好，\n\n我整理了现有时间，建议先预留周三上午 10:00–10:30。若你确认，我再同步给其他同事。\n\n谢谢！',
    steps: ['查找相关邮件', '对照候选时间', '整理待确认时段', '等待你的批准后模拟发送'],
    revisionCount: 0,
    sentSimulated: false,
  },
  {
    id: 't3',
    title: '汇总十一月客户反馈',
    goal: '从客户邮件中归纳高频问题。',
    status: 'done',
    category: '信息整理',
    subtitle: '已整理 6 封反馈；没有发送邮件。',
    time: '昨天完成',
    sources: ['m4'],
    recipient: '',
    subject: '',
    draft: '高频反馈：新手引导不够清楚；任务进度状态不易理解。建议把“当前状态”和“下一步”放在同一视图。',
    steps: ['查找反馈邮件', '合并重复意见', '生成可追溯摘要'],
    revisionCount: 0,
    sentSimulated: false,
  },
];

export function makeInitialState() {
  return {
    tasks: structuredClone(INITIAL_TASKS),
    mails: structuredClone(DEMO_MAILS),
    manualReplies: [],
  };
}

export function createTask(state, goal) {
  const title = goal.trim();
  if (!title) throw new Error('先写下你想完成的事。');
  const id = `t${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const sources = /反馈|客户|新版本/.test(title) ? ['m4']
    : /评审|日程|时间|会议/.test(title) ? ['m3']
      : /合作|报价|品牌|北岸/.test(title) ? ['m1', 'm2'] : [];
  const mail = state.mails.find(item => item.id === sources[0]);
  const task = {
    id,
    title,
    goal: title,
    status: 'working',
    category: '新任务',
    subtitle: '正在模拟查找邮件与整理步骤。',
    time: '刚刚创建',
    sources,
    recipient: mail?.address || '',
    subject: mail ? `Re: ${mail.subject}` : '',
    draft: mail
      ? `你好，\n\n关于“${title}”，演示邮件中提到：${mail.preview}\n\n建议先确认目标和下一步，再继续推进。请告知你方便的时间。\n\n谢谢！`
      : '',
    steps: ['理解你的目标', '检索相关邮件', '拟定下一步', '等待你的批准后模拟发送'],
    revisionCount: 0,
    sentSimulated: false,
  };
  return { state: { ...state, tasks: [task, ...state.tasks] }, task };
}

export function finishResearch(state, taskId) {
  return mapTask(state, taskId, task => {
    if (task.status !== 'working') throw new Error('这项任务当前不在处理中。');
    if (!task.sources.length) return {
      ...task,
      status: 'done',
      subtitle: '演示邮件中没有相关内容，未生成回复或执行外部动作。',
      draft: '没有找到与目标相关的演示邮件。请尝试上方的示例任务。',
      time: '刚刚完成',
    };
    return { ...task, status: 'approval', subtitle: '已整理依据与草稿，等待你确认。', time: '刚刚更新' };
  });
}

export function reviseTask(state, taskId, note) {
  const feedback = note.trim();
  if (!feedback) throw new Error('写一句你希望调整的地方。');
  return mapTask(state, taskId, task => {
    if (task.status !== 'approval') throw new Error('只有待确认的任务可以退回。');
    return {
      ...task,
      status: 'working',
      subtitle: `收到修改意见：${feedback}`,
      revisionCount: task.revisionCount + 1,
      draft: `${task.draft}\n\n【演示修订提示】${feedback}`,
    };
  });
}

export function updateDraft(state, taskId, draft) {
  return mapTask(state, taskId, task => {
    if (task.status !== 'approval') throw new Error('只有待确认的草稿可以编辑。');
    return { ...task, draft };
  });
}

export function approveTask(state, taskId, confirmed) {
  if (!confirmed) throw new Error('请先确认收件人和内容。');
  return mapTask(state, taskId, task => {
    if (task.status !== 'approval') throw new Error('这项任务目前不能批准。');
    if (!task.recipient || !task.draft.trim()) throw new Error('收件人或内容为空，无法模拟发送。');
    return {
      ...task,
      status: 'done',
      subtitle: '已完成模拟发送；没有连接真实邮箱。',
      time: '刚刚完成',
      sentSimulated: true,
    };
  });
}

export function sendManualReply(state, mailId, content, confirmed) {
  if (!confirmed) throw new Error('请先确认这是一封演示回复。');
  const body = content.trim();
  if (!body) throw new Error('先写下回复内容。');
  const mail = state.mails.find(item => item.id === mailId);
  if (!mail) throw new Error('找不到这封邮件。');
  return {
    ...state,
    manualReplies: [{ mailId, content: body, recipient: mail.address, at: new Date().toISOString() }, ...state.manualReplies],
  };
}

function mapTask(state, taskId, transform) {
  let found = false;
  const tasks = state.tasks.map(task => {
    if (task.id !== taskId) return task;
    found = true;
    return transform(task);
  });
  if (!found) throw new Error('找不到这项任务。');
  return { ...state, tasks };
}
