import type { SummaryResult } from '@/lib/types';
import { MODEL_TIMEOUT_MS } from '@/lib/limits';
import { MODELS } from './models';
import { parseSummary } from './parse';
import { buildMessages } from './prompt';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export interface SummarizeOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export type SummarizeOutcome =
  | { ok: true; summary: SummaryResult; model: string }
  | { ok: false; code: 'AI_FAILED' | 'AI_RATE_LIMITED' };

type Attempt =
  | { kind: 'ok'; summary: SummaryResult }
  | { kind: 'fail'; reason: number | 'timeout' | 'network' | 'parse' };

async function tryModel(
  model: string,
  text: string,
  apiKey: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<Attempt> {
  let res: Response;
  try {
    res = await fetchImpl(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'summary4pdf',
      },
      // response_format은 보내지 않는다: 모델마다 지원이 달라 400이 날 수 있다.
      body: JSON.stringify({ model, messages: buildMessages(text), temperature: 0.3 }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    const name = (e as { name?: string } | null)?.name;
    return { kind: 'fail', reason: name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'network' };
  }
  if (!res.ok) return { kind: 'fail', reason: res.status };

  try {
    const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
    const content = data.choices?.[0]?.message?.content;
    const summary = typeof content === 'string' ? parseSummary(content) : null;
    return summary ? { kind: 'ok', summary } : { kind: 'fail', reason: 'parse' };
  } catch (e) {
    // 본문을 읽다 시간 초과가 난 경우도 여기로 온다.
    const name = (e as { name?: string } | null)?.name;
    return { kind: 'fail', reason: name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'parse' };
  }
}

/** MODELS를 차례로 시도해 요약한다. 한 모델이 실패하면 다음 모델로 넘어간다. */
export async function summarize(
  text: string,
  apiKey: string,
  opts: SummarizeOptions = {},
): Promise<SummarizeOutcome> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? MODEL_TIMEOUT_MS;
  let all429 = true;

  for (const model of MODELS) {
    const r = await tryModel(model, text, apiKey, fetchImpl, timeoutMs);
    if (r.kind === 'ok') return { ok: true, summary: r.summary, model };
    if (r.reason !== 429) all429 = false;
    // 원인만 남긴다(응답 본문, 문서 텍스트, 키는 남기지 않는다).
    console.warn('[summarize] 모델 실패', { model, reason: r.reason });
  }
  return { ok: false, code: all429 ? 'AI_RATE_LIMITED' : 'AI_FAILED' };
}
