import assert from 'node:assert/strict';
import test from 'node:test';

import { systemPrompt } from '../src/runtime/prompt.ts';
import { toolDefinitions } from '../src/runtime/tools.ts';

test('tracked work requires a persisted task identity', () => {
  const prompt = systemPrompt({
    instructions: 'Synthetic workspace instructions',
  } as Parameters<typeof systemPrompt>[0]);

  assert.equal(toolDefinitions.task.eager, true);
  assert.ok(prompt.includes('call the task tool with action: "start"'));
  assert.ok(prompt.includes('nod_tool_search to find task'));
  assert.ok(prompt.includes('returned task ID'));
  assert.ok(prompt.includes('action: "finish" succeeds for that same ID'));
  assert.ok(prompt.includes('not a saved task'));
});
