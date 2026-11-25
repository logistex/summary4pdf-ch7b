// PDF를 서버로 올리고 ApiResponse를 돌려준다. 절대 throw하지 않는다.
import { ERROR_MESSAGES, errorBody } from '@/lib/types';
import type { ApiResponse } from '@/lib/types';

function isApiResponse(value: unknown): value is ApiResponse {
  return typeof value === 'object' && value !== null && typeof (value as { ok?: unknown }).ok === 'boolean';
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
    return { ok: false, code: 'INTERNAL_ERROR', message: ERROR_MESSAGES.INTERNAL_ERROR };
  }
}
