// PDF를 서버로 올리고 ApiResponse를 돌려준다. 절대 throw하지 않는다.
import { errorBody } from '@/lib/types';
import type { ApiResponse } from '@/lib/types';

// 화면이 바로 쓸 수 있는 모양인지 확인한다. 모양이 틀리면 예외나 빈 안내가 되므로 받아들이지 않는다.
function isApiResponse(value: unknown): value is ApiResponse {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.ok === true) {
    const s = v.summary as Record<string, unknown> | null | undefined;
    return (
      typeof v.fileName === 'string' &&
      typeof v.pageCount === 'number' &&
      typeof s === 'object' &&
      s !== null &&
      typeof s.oneLineSummary === 'string' &&
      Array.isArray(s.keyConcepts) &&
      Array.isArray(s.definitions)
    );
  }
  if (v.ok === false) return typeof v.code === 'string' && typeof v.message === 'string';
  return false;
}

export async function postPdf(file: File, fetchImpl: typeof fetch = fetch): Promise<ApiResponse> {
  try {
    const form = new FormData();
    form.append('file', file);
    const res = await fetchImpl('/api/summarize', { method: 'POST', body: form });

    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    if (isApiResponse(json)) return json;

    // JSON이 아닌 응답: 호스팅 환경이 직접 돌려준 오류(본문 한도, 시간 초과 등)
    if (res.status === 413) return errorBody('FILE_TOO_LARGE');
    if (res.status === 504) return errorBody('AI_FAILED');
    return errorBody('INTERNAL_ERROR');
  } catch {
    return errorBody('INTERNAL_ERROR');
  }
}
