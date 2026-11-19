import {
  approveTask,
  createTask,
  finishResearch,
  makeInitialState,
  reviseTask,
  sendManualReply,
  updateDraft,
} from './model.mjs';

let data = makeInitialState();
let view = 'home';
let selection = { type: 'task', id: 't1' };
let inspectorOpen = false;
let editingDraft = false;
let showFeedback = false;
let modal = null;
let toastTimer;

const main = document.querySelector('#main-view');
const inspector = document.querySelector('#inspector');
const modalRoot = document.querySelector('#modal-root');

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function dateLabel() {
  return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date());
}

function pill(status) {
  const labels = { approval: '需要你确认', working: 'Agent 处理中', done: '已完成' };
  return `<span class="status-pill ${status}">${labels[status]}</span>`;
}

function taskCard(task) {
  const active = selection.type === 'task' && selection.id === task.id;
  const symbol = { approval: '◈', working: '✳', done: '✓' }[task.status];
  return `<button class="task-card status-${task.status}${active ? ' selected' : ''}" type="button" data-action="select-task" data-id="${esc(task.id)}" aria-label="查看${esc(task.title)}">
    <span class="task-icon" aria-hidden="true">${symbol}</span>
    <span class="task-copy"><span class="task-title">${esc(task.title)}</span><span class="task-subtitle">${esc(task.subtitle)}</span><span class="task-meta"><span>${esc(task.category)}</span><span>${task.sources.length} 条依据</span><span>${esc(task.time)}</span></span></span>
    ${pill(task.status)}
  </button>`;
}

function taskSection(label, tasks, empty) {
  return `<section class="section"><div class="section-head"><h2>${label}</h2><span>${tasks.length} 项</span></div><div class="task-list">${tasks.length ? tasks.map(taskCard).join('') : `<div class="empty-state">${empty}</div>`}</div></section>`;
}

function homeView() {
  const approval = data.tasks.filter(task => task.status === 'approval');
  const working = data.tasks.filter(task => task.status === 'working');
  const done = data.tasks.filter(task => task.status === 'done');
  return `<div class="hero"><p class="eyebrow">${esc(dateLabel())} · 让事情继续前进</p><h1>先处理结果，<br>再处理邮件。</h1><p>告诉 Relay 想达成什么；它会整理依据、推进步骤，在关键动作前请你决定。</p></div>
    <form class="composer" id="goal-form"><label class="composer-label" for="goal-input"><span class="spark" aria-hidden="true">✳</span>交代一件要完成的事</label><textarea id="goal-input" name="goal" placeholder="例如：帮我跟进合作方的新报价，并列出需要我决定的事项"></textarea><div class="composer-bottom"><span class="composer-note">只使用演示邮件，所有对外动作均需你确认</span><button class="primary-btn" type="submit">交给 Relay</button></div></form>
    <div class="suggestions"><span>试一试</span><button type="button" data-action="suggest" data-goal="跟进合作方的新报价，给出下一步建议">跟进合作方案</button><button type="button" data-action="suggest" data-goal="协调下周产品评审，给出共同可用时段">协调评审时间</button><button type="button" data-action="suggest" data-goal="整理本周客户反馈，找出最需要解决的问题">整理客户反馈</button></div>
    ${taskSection('等你做决定', approval, '目前没有需要你确认的事项。')}
    ${taskSection('正在推进', working, '当前没有进行中的任务。')}
    ${taskSection('最近完成', done.slice(0, 2), '完成的任务会显示在这里。')}`;
}

function inboxView() {
  return `<div class="hero"><p class="eyebrow">邮箱由你掌控</p><h1>需要亲自处理时，<br>邮件仍在这里。</h1><p>你可以直接阅读、搜索和回复。Agent 只是另一种推进方式。</p></div>
    <label class="sr-only" for="mail-search">搜索演示邮件</label><input id="mail-search" class="search-input" type="search" placeholder="搜索发件人或主题" />
    <div class="mail-list">${data.mails.map(mail => `<button type="button" class="mail-card${selection.type === 'mail' && selection.id === mail.id ? ' selected' : ''}" data-action="select-mail" data-id="${mail.id}" data-search="${esc(`${mail.from} ${mail.subject}`.toLowerCase())}"><span class="mail-avatar">${esc(mail.from.slice(0, 1))}</span><span class="mail-text"><span class="mail-from">${esc(mail.from)}</span><span class="mail-subject">${esc(mail.subject)}</span><span class="mail-preview">${esc(mail.preview)}</span></span><span class="mail-time">${esc(mail.time)}</span></button>`).join('')}</div>`;
}

function doneView() {
  return `<div class="hero"><p class="eyebrow">透明的结果记录</p><h1>每件已完成的事，<br>都有来龙去脉。</h1><p>查看任务依据和执行步骤，也能区分“已整理”与“已模拟发送”。</p></div>${taskSection('已完成', data.tasks.filter(task => task.status === 'done'), '完成的任务会显示在这里。')}`;
}

function permissionsView() {
  return `<div class="hero"><p class="eyebrow">你决定 Agent 能做什么</p><h1>能力越强，<br>边界越要清楚。</h1><p>在这个概念演示中，所有邮件均为虚构内容，下面展示产品默认的授权原则。</p></div>
    <div class="permission-card"><div><strong>读取相关邮件</strong><p>只在用户交代的任务范围内查找，并展示引用来源。</p></div><span class="permission-value">范围内可用</span></div>
    <div class="permission-card"><div><strong>整理信息与起草</strong><p>Agent 可生成摘要和草稿，用户可以编辑或退回。</p></div><span class="permission-value">可自动准备</span></div>
    <div class="permission-card"><div><strong>发送与其他外部动作</strong><p>发信、改日程、删除内容前必须让用户看到对象和内容并确认。</p></div><span class="permission-value locked">必须人工确认</span></div>
    <div class="permission-card"><div><strong>本作品的数据</strong><p>纯前端模拟；不连接真实邮箱，也不向服务器提交邮件。</p></div><span class="permission-value">仅本地演示</span></div>`;
}

function taskInspector(task) {
  const sourceMails = task.sources.map(id => data.mails.find(mail => mail.id === id)).filter(Boolean);
  const stateIndex = task.status === 'done' ? task.steps.length : task.status === 'approval' ? task.steps.length - 1 : 1;
  const steps = task.steps.map((step, index) => {
    const state = index < stateIndex ? 'done' : index === stateIndex && task.status === 'working' ? 'working' : 'pending';
    const mark = state === 'done' ? '✓' : state === 'working' ? '·' : '–';
    return `<li class="${state}"><span class="step-mark" aria-hidden="true">${mark}</span><span>${esc(step)}</span></li>`;
  }).join('');
  let action = '';
  if (task.status === 'working') action = `<button class="secondary-btn progress-action" type="button" data-action="finish-research" data-id="${esc(task.id)}">完成模拟整理，查看结果</button>`;
  if (task.status === 'approval') action = `<div class="detail-section"><h3>准备好的回复</h3><div class="draft-box"><span class="draft-to">收件人 · ${esc(task.recipient)}</span>${editingDraft ? `<textarea class="draft-editor" id="draft-editor" aria-label="编辑回复草稿">${esc(task.draft)}</textarea>` : `<div class="draft-body">${esc(task.draft)}</div>`}</div><div class="detail-actions">${editingDraft ? `<button class="secondary-btn" type="button" data-action="save-draft">完成编辑</button>` : `<button class="secondary-btn" type="button" data-action="edit-draft">编辑草稿</button>`}<button class="primary-btn" type="button" data-action="approve">审阅并确认</button></div>${showFeedback ? `<textarea class="feedback-editor" id="feedback-editor" placeholder="例如：语气更简短，并先确认交付日期"></textarea><button class="ghost-btn" type="button" data-action="submit-feedback">提交修改意见</button>` : `<button class="ghost-btn" type="button" data-action="return-task">退回给 Agent 修改</button>`}<small class="detail-note">此处的“发送”只更新演示状态，不会触达真实收件人。</small></div>`;
  if (task.status === 'done') action = `<div class="detail-section"><h3>结果</h3><div class="draft-box"><div class="draft-body">${esc(task.draft)}</div></div><small class="detail-note">${task.sentSimulated ? '已完成模拟发送；没有连接真实邮箱。' : '仅完成信息整理；没有发送任何邮件。'}</small></div>`;
  return `<div class="inspector-top"><p class="inspector-label">任务详情 · 可追溯</p><button class="close-inspector" type="button" data-action="close-inspector" aria-label="关闭详情">×</button></div><h2>${esc(task.title)}</h2><p class="inspector-intro">${esc(task.goal)}</p><div class="inspector-status">${pill(task.status)}</div>
    <div class="detail-section"><h3>Agent 的执行路径</h3><ol class="timeline">${steps}</ol>${action && task.status === 'working' ? action : ''}</div>
    <div class="detail-section"><h3>来自哪些邮件</h3><div class="source-list">${sourceMails.length ? sourceMails.map(mail => `<button type="button" class="source-item" data-action="view-source" data-id="${mail.id}"><strong>${esc(mail.subject)}</strong><small>${esc(mail.from)} · ${esc(mail.time)}</small></button>`).join('') : '<p class="inspector-intro">尚未找到相关演示邮件。</p>'}</div></div>${task.status !== 'working' ? action : ''}`;
}

function mailInspector(mail) {
  const count = data.manualReplies.filter(reply => reply.mailId === mail.id).length;
  return `<div class="inspector-top"><p class="inspector-label">原始邮件 · 直接处理</p><button class="close-inspector" type="button" data-action="close-inspector" aria-label="关闭详情">×</button></div><h2>${esc(mail.subject)}</h2><p class="inspector-intro">${esc(mail.from)} · ${esc(mail.address)} · ${esc(mail.time)}</p><div class="mail-body">${esc(mail.body)}</div><div class="detail-section"><h3>你的选择</h3><p class="inspector-intro">这封邮件可以直接回复，也可以交给 Agent 先整理。没有强制的对话步骤。</p><div class="detail-actions"><button class="primary-btn" type="button" data-action="manual-reply" data-id="${mail.id}">自己回复</button><button class="secondary-btn" type="button" data-action="delegate-mail" data-id="${mail.id}">交给 Agent</button></div>${count ? `<small class="detail-note">已模拟手动回复 ${count} 次，未发送真实邮件。</small>` : ''}</div>`;
}

function renderInspector() {
  if (view === 'permissions') { inspector.innerHTML = `<div class="inspector-top"><p class="inspector-label">设计原则</p><button class="close-inspector" type="button" data-action="close-inspector" aria-label="关闭详情">×</button></div><h2>Agent 能做，用户能懂。</h2><p class="inspector-intro">把目标、依据、执行状态与人工决策放在同一个任务里，减少在收件箱中来回寻找上下文。</p><div class="detail-section"><h3>体验这份作品</h3><p class="inspector-intro">从工作台选择“确认北岸工作室的合作范围”，查看依据、编辑草稿并模拟批准；再到收件箱直接回复一封邮件。</p></div>`; inspector.classList.toggle('open', inspectorOpen); return; }
  if (selection.type === 'task') {
    const task = data.tasks.find(item => item.id === selection.id) || data.tasks[0];
    inspector.innerHTML = taskInspector(task);
  } else {
    const mail = data.mails.find(item => item.id === selection.id) || data.mails[0];
    inspector.innerHTML = mailInspector(mail);
  }
  inspector.classList.toggle('open', inspectorOpen);
}

function renderModal() {
  if (!modal) { modalRoot.innerHTML = ''; return; }
  if (modal.type === 'source') {
    const mail = data.mails.find(item => item.id === modal.id);
    modalRoot.innerHTML = `<div class="modal-backdrop" data-action="dismiss-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><p class="eyebrow">引用来源 · 演示邮件</p><h2 id="modal-title">${esc(mail.subject)}</h2><p>${esc(mail.from)} · ${esc(mail.time)}</p><div class="modal-detail"><pre>${esc(mail.body)}</pre></div><div class="modal-actions" style="margin-top:18px"><button class="secondary-btn" type="button" data-action="close-modal">关闭</button></div></div></div>`;
  } else if (modal.type === 'approve') {
    const task = data.tasks.find(item => item.id === selection.id);
    modalRoot.innerHTML = `<div class="modal-backdrop" data-action="dismiss-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><p class="eyebrow">关键动作交还给你</p><h2 id="modal-title">确认这封回复</h2><p>Agent 只能准备内容，最终发送要由你决定。</p><div class="modal-detail"><strong>收件人：</strong>${esc(task.recipient)}<br><strong>主题：</strong>${esc(task.subject)}<pre>${esc(task.draft)}</pre></div><label class="confirm-label"><input type="checkbox" id="approve-check" />我已核对收件人、内容与依据，确认模拟发送</label><div class="modal-actions"><button class="secondary-btn" type="button" data-action="close-modal">再看看</button><button class="primary-btn" type="button" data-action="confirm-approve">确认模拟发送</button></div></div></div>`;
  } else if (modal.type === 'manual') {
    const mail = data.mails.find(item => item.id === modal.id);
    modalRoot.innerHTML = `<div class="modal-backdrop" data-action="dismiss-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><p class="eyebrow">直接由你处理</p><h2 id="modal-title">回复 ${esc(mail.from)}</h2><p>不经 Agent，你可以直接写信。演示不会真实发送。</p><div class="modal-detail"><strong>收件人：</strong>${esc(mail.address)}<br><strong>主题：</strong>Re: ${esc(mail.subject)}</div><textarea class="reply-editor" id="manual-reply-body" aria-label="回复内容" placeholder="写下你的回复..." style="margin-top:14px"></textarea><label class="confirm-label"><input type="checkbox" id="manual-check" />我了解这是模拟发送，内容不会离开浏览器</label><div class="modal-actions"><button class="secondary-btn" type="button" data-action="close-modal">取消</button><button class="primary-btn" type="button" data-action="confirm-manual">模拟发送</button></div></div></div>`;
  }
  modalRoot.querySelector('button, textarea')?.focus();
}

function render() {
  const pages = { home: '工作台', inbox: '收件箱', done: '已完成', permissions: '权限与边界' };
  document.querySelector('#page-name').textContent = pages[view];
  document.querySelectorAll('[data-view]').forEach(button => {
    const active = button.dataset.view === view;
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  });
  document.querySelector('#nav-review-count').textContent = data.tasks.filter(task => task.status === 'approval').length;
  main.innerHTML = { home: homeView, inbox: inboxView, done: doneView, permissions: permissionsView }[view]();
  renderInspector();
  renderModal();
}

function toast(message) {
  const node = document.querySelector('#toast');
  node.textContent = message;
  node.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('visible'), 3700);
}

function simulateResearch(taskId) {
  setTimeout(() => {
    const task = data.tasks.find(item => item.id === taskId);
    if (!task || task.status !== 'working') return;
    data = finishResearch(data, taskId);
    render();
    toast(task.sources.length ? '演示整理已完成。对外动作仍需你确认。' : '没有找到相关演示邮件，未生成回复。');
  }, 850);
}

document.addEventListener('submit', event => {
  if (event.target.id !== 'goal-form') return;
  event.preventDefault();
  try {
    const result = createTask(data, event.target.elements.goal.value);
    data = result.state;
    selection = { type: 'task', id: result.task.id };
    inspectorOpen = true;
    render();
    toast('任务已建立，正在模拟整理邮件。');
    simulateResearch(result.task.id);
  } catch (error) { toast(error.message); }
});

document.addEventListener('input', event => {
  if (event.target.id === 'draft-editor') {
    try { data = updateDraft(data, selection.id, event.target.value); } catch (error) { toast(error.message); }
  }
  if (event.target.id === 'mail-search') {
    const term = event.target.value.trim().toLowerCase();
    document.querySelectorAll('.mail-card').forEach(card => { card.hidden = !card.dataset.search.includes(term); });
  }
});

document.addEventListener('click', event => {
  const target = event.target.closest('[data-action], [data-view]');
  if (!target) return;
  if (target.dataset.view) {
    view = target.dataset.view;
    selection = view === 'inbox' ? { type: 'mail', id: 'm1' } : { type: 'task', id: view === 'done' ? (data.tasks.find(task => task.status === 'done')?.id || 't3') : 't1' };
    inspectorOpen = false;
    editingDraft = false;
    showFeedback = false;
    render();
    window.scrollTo(0, 0);
    return;
  }
  const action = target.dataset.action;
  const id = target.dataset.id;
  try {
    if (action === 'suggest') { document.querySelector('#goal-input').value = target.dataset.goal; document.querySelector('#goal-input').focus(); }
    if (action === 'select-task') { selection = { type: 'task', id }; inspectorOpen = true; editingDraft = false; showFeedback = false; render(); }
    if (action === 'select-mail') { selection = { type: 'mail', id }; inspectorOpen = true; render(); }
    if (action === 'close-inspector') { inspectorOpen = false; inspector.classList.remove('open'); }
    if (action === 'finish-research') { data = finishResearch(data, id); render(); toast('演示整理已完成，等待你的确认。'); }
    if (action === 'edit-draft') { editingDraft = true; renderInspector(); inspector.querySelector('#draft-editor')?.focus(); }
    if (action === 'save-draft') { editingDraft = false; renderInspector(); toast('草稿已保存到本地演示状态。'); }
    if (action === 'return-task') { showFeedback = true; renderInspector(); inspector.querySelector('#feedback-editor')?.focus(); }
    if (action === 'submit-feedback') { data = reviseTask(data, selection.id, inspector.querySelector('#feedback-editor').value); showFeedback = false; editingDraft = false; render(); toast('修改意见已记录，正在模拟重新整理。'); simulateResearch(selection.id); }
    if (action === 'approve') { modal = { type: 'approve' }; renderModal(); }
    if (action === 'confirm-approve') { data = approveTask(data, selection.id, modalRoot.querySelector('#approve-check').checked); modal = null; render(); toast('任务完成。只进行了模拟发送。'); }
    if (action === 'manual-reply') { modal = { type: 'manual', id }; renderModal(); }
    if (action === 'confirm-manual') { data = sendManualReply(data, modal.id, modalRoot.querySelector('#manual-reply-body').value, modalRoot.querySelector('#manual-check').checked); modal = null; render(); toast('回复已记录为模拟发送，未触达真实邮箱。'); }
    if (action === 'delegate-mail') { view = 'home'; render(); document.querySelector('#goal-input').value = `帮我处理“${data.mails.find(mail => mail.id === id).subject}”，先整理依据和回复草稿`; document.querySelector('#goal-input').focus(); toast('已把邮件主题放进任务输入框，你可以继续描述目标。'); }
    if (action === 'view-source') { modal = { type: 'source', id }; renderModal(); }
    if (action === 'close-modal') { modal = null; renderModal(); }
    if (action === 'dismiss-backdrop' && event.target === target) { modal = null; renderModal(); }
  } catch (error) { toast(error.message); }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && modal) { modal = null; renderModal(); }
});

render();
