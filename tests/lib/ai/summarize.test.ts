import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { MODELS } from '@/lib/ai/models';
import { summarize } from '@/lib/ai/summarize';

const good = {
  oneLineSummary: '광합성은 빛 에너지를 화학 에너지로 바꾸는 과정이다.',
  keyConcepts: [
    { name: '엽록체', explanation: '광합성이 일어나는 세포 기관이다.' },
    { name: '명반응', explanation: '빛을 써서 ATP를 만든다.' },
    { name: '암반응', explanation: '이산화탄소를 고정한다.' },
  ],
  definitions: [{ term: '광합성 식', description: '6CO2 + 6H2O → C6H12O6 + 6O2' }],
};
const english = {
  oneLineSummary: 'Photosynthesis converts light into chemical energy.',
  keyConcepts: [{ name: 'Chloroplast', explanation: 'Organelle where photosynthesis happens.' }],
  definitions: [],
};

type Behavior = 'ok' | 'http500' | 'http429' | 'hang' | 'garbage' | 'english' | 'throw';

const content = (text: string) =>
  new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), { status: 200 });

/** 모델 ID별 동작을 정해 둔 가짜 fetch. 'hang'은 signal이 abort될 때까지 기다린다. */
function makeFetch(plan: Partial<Record<string, Behavior>>) {
  const calls: { url: string; init: RequestInit; model: string }[] = [];
  const fn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const model = JSON.parse(String(init?.body)).model as string;
    calls.push({ url: String(url), init: init!, model });
    switch (plan[model]) {
      case 'ok':
        return content(JSON.stringify(good));
      case 'http500':
        return new Response('err', { status: 500 });
      case 'http429':
        return new Response('limit', { status: 429 });
      case 'garbage':
        return content('죄송합니다');
      case 'english':
        return content(JSON.stringify(english));
      case 'throw':
        throw new TypeError('fetch failed');
      case 'hang':
        return new Promise<Response>((_, reject) => {
          const signal = init!.signal!;
          const abort = () => reject(signal.reason);
          if (signal.aborted) abort();
          else signal.addEventListener('abort', abort);
        });
      default:
        throw new Error('계획에 없는 모델');
    }
  });
  return { fn: fn as unknown as typeof fetch, calls };
}

const [M1, M2] = MODELS;

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('summarize', () => {
  test('1순위 성공', async () => {
    const f = makeFetch({ [M1]: 'ok' });
    const r = await summarize('본문', 'test-key', { fetchImpl: f.fn });
    expect(r).toEqual({ ok: true, summary: good, model: M1 });
    expect(f.calls).toHaveLength(1);
  });

  test.each<[string, Behavior]>([
    ['1순위 500', 'http500'],
    ['1순위 형식 틀림', 'garbage'],
    ['1순위 영어', 'english'],
    ['1순위 네트워크 오류', 'throw'],
  ])('%s -> 2순위', async (_name, behavior) => {
    const f = makeFetch({ [M1]: behavior, [M2]: 'ok' });
    const r = await summarize('본문', 'test-key', { fetchImpl: f.fn });
    expect(r).toMatchObject({ ok: true, model: M2 });
    expect(f.calls).toHaveLength(2);
  });

  test('1순위 시간 초과 -> 2순위', async () => {
    const f = makeFetch({ [M1]: 'hang', [M2]: 'ok' });
    const r = await summarize('본문', 'test-key', { fetchImpl: f.fn, timeoutMs: 50 });
    expect(r).toMatchObject({ ok: true, model: M2 });
  });

  test('둘 다 실패', async () => {
    const f = makeFetch({ [M1]: 'http500', [M2]: 'garbage' });
    expect(await summarize('본문', 'test-key', { fetchImpl: f.fn })).toEqual({ ok: false, code: 'AI_FAILED' });
  });

  test('둘 다 429', async () => {
    const f = makeFetch({ [M1]: 'http429', [M2]: 'http429' });
    expect(await summarize('본문', 'test-key', { fetchImpl: f.fn })).toEqual({
      ok: false,
      code: 'AI_RATE_LIMITED',
    });
  });

  test('하나만 429면 AI_FAILED', async () => {
    const f = makeFetch({ [M1]: 'http429', [M2]: 'http500' });
    expect(await summarize('본문', 'test-key', { fetchImpl: f.fn })).toEqual({ ok: false, code: 'AI_FAILED' });
  });

  test('요청 형태', async () => {
    const f = makeFetch({ [M1]: 'ok' });
    await summarize('독특한본문텍스트', 'test-key', { fetchImpl: f.fn });
    const { url, init } = f.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-key');
    expect(headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe(M1);
    expect(body.response_format).toBeUndefined();
    expect(JSON.stringify(body.messages)).toContain('독특한본문텍스트');
  });

  test('경고 로그에 본문과 키가 들어가지 않는다', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const f = makeFetch({ [M1]: 'http500', [M2]: 'garbage' });
    await summarize('비밀본문', 'secret-key-xyz', { fetchImpl: f.fn });
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).not.toContain('비밀본문');
    expect(logged).not.toContain('secret-key-xyz');
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
