import type { Definition, KeyConcept, SummaryResult } from '@/lib/types';
import { MAX_DEFINITIONS, MAX_KEY_CONCEPTS } from '@/lib/limits';

/**
 * 한글 음절 수가 영문 글자 수 이상이면 한국어로 본다.
 * 영어 용어를 괄호로 붙이는 것은 허용되므로, 괄호 안의 글자는 영문 수에서 뺀다.
 */
export function isKorean(s: string): boolean {
  const hangul = (s.match(/[가-힣]/g) ?? []).length;
  const withoutParens = s.replace(/[(（][^)）]*[)）]/g, ' ');
  const latin = (withoutParens.match(/[A-Za-z]/g) ?? []).length;
  return hangul >= latin;
}

/** 응답 글에서 JSON 객체 부분만 꺼낸다: 코드 블록 표시를 걷고 첫 `{`부터 마지막 `}`까지. */
function extractJson(raw: string): unknown {
  const stripped = raw.replace(/```(?:json)?/gi, '');
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(stripped.slice(start, end + 1));
  } catch {
    return null;
  }
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** 모델 응답 글을 SummaryResult로 해석한다. 해석 불가이거나 한국어가 아니면 null. */
export function parseSummary(raw: string): SummaryResult | null {
  const data = extractJson(raw);
  if (!isObject(data)) return null;

  const oneLineSummary = str(data.oneLineSummary);
  if (!oneLineSummary) return null;

  const keyConcepts: KeyConcept[] = (Array.isArray(data.keyConcepts) ? data.keyConcepts : [])
    .filter(isObject)
    .map((c) => ({ name: str(c.name), explanation: str(c.explanation) }))
    .filter((c) => c.name && c.explanation)
    .slice(0, MAX_KEY_CONCEPTS);
  if (keyConcepts.length === 0) return null;

  const definitions: Definition[] = (Array.isArray(data.definitions) ? data.definitions : [])
    .filter(isObject)
    .map((d) => ({ term: str(d.term), description: str(d.description) }))
    .filter((d) => d.term && d.description)
    .slice(0, MAX_DEFINITIONS);

  // 한국어 검사: 한 줄 요약과 핵심 개념 설명만 본다(정의·공식은 기호와 영문이 많아 제외).
  const prose = [oneLineSummary, ...keyConcepts.map((c) => c.explanation)].join(' ');
  if (!isKorean(prose)) return null;

  return { oneLineSummary, keyConcepts, definitions };
}
