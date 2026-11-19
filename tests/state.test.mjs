import test from 'node:test';
import assert from 'node:assert/strict';
import {
  approveTask,
  createTask,
  finishResearch,
  makeInitialState,
  reviseTask,
  sendManualReply,
  updateDraft,
} from '../model.mjs';

test('new task requires a goal and pauses for approval after simulated research', () => {
  const initial = makeInitialState();
  assert.throws(() => createTask(initial, '  '), /先写下/);
  const { state, task } = createTask(initial, '跟进合作项目');
  assert.equal(task.status, 'working');
  assert.equal(initial.tasks.length, 3);
  const reviewed = finishResearch(state, task.id);
  assert.equal(reviewed.tasks[0].status, 'approval');
  assert.equal(reviewed.tasks[0].sentSimulated, false);
  assert.deepEqual(reviewed.tasks[0].sources, ['m1', 'm2']);
});

test('a goal with no matching demo email does not invent a source or reply', () => {
  const { state, task } = createTask(makeInitialState(), '整理供应链库存');
  assert.deepEqual(task.sources, []);
  assert.equal(task.recipient, '');
  const result = finishResearch(state, task.id);
  assert.equal(result.tasks[0].status, 'done');
  assert.equal(result.tasks[0].sentSimulated, false);
  assert.throws(() => approveTask(result, task.id, true), /不能批准/);
});

test('a draft cannot be sent without explicit confirmation', () => {
  const initial = makeInitialState();
  assert.throws(() => approveTask(initial, 't1', false), /先确认/);
  assert.equal(initial.tasks[0].status, 'approval');
  const edited = updateDraft(initial, 't1', '请确认最终版本。');
  assert.equal(edited.tasks[0].draft, '请确认最终版本。');
  const completed = approveTask(edited, 't1', true);
  assert.equal(completed.tasks[0].status, 'done');
  assert.equal(completed.tasks[0].sentSimulated, true);
});

test('human feedback returns a task to working before another approval', () => {
  const initial = makeInitialState();
  const returned = reviseTask(initial, 't1', '语气更简短');
  assert.equal(returned.tasks[0].status, 'working');
  assert.equal(returned.tasks[0].revisionCount, 1);
  assert.throws(() => approveTask(returned, 't1', true), /不能批准/);
  const reviewed = finishResearch(returned, 't1');
  assert.equal(reviewed.tasks[0].status, 'approval');
});

test('direct reply remains a separate confirmed user action', () => {
  const initial = makeInitialState();
  assert.throws(() => sendManualReply(initial, 'm1', '收到', false), /先确认/);
  const next = sendManualReply(initial, 'm1', '  收到，明天回复。 ', true);
  assert.equal(next.manualReplies[0].recipient, 'linqing@example.com');
  assert.equal(next.manualReplies[0].content, '收到，明天回复。');
  assert.equal(initial.manualReplies.length, 0);
});
