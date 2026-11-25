import { describe, expect, test, vi } from 'vitest';
import { postPdf } from '@/lib/client/upload';
import { ERROR_MESSAGES } from '@/lib/types';
import type { ApiSuccess } from '@/lib/types';

const file = new File(['%PDF-1.4'], 'a.pdf', { type: 'application/pdf' });

const success: ApiSuccess = {
  ok: true,
  fileName: 'a.pdf',
  pageCount: 3,
  truncated: false,
  skippedImagePages: false,
  summary: { oneLineSummary: '요약', keyConcepts: [{ name: '개념', explanation: '설명' }], definitions: [] },
};

function fakeFetch(res: Response) {
  return vi.fn().mockResolvedValue(res) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

describe('postPdf', () => {
  test('성공 JSON', async () => {
    const f = fakeFetch(new Response(JSON.stringify(success), { status: 200, headers: { 'content-type': 'application/json' } }));
    expect(await postPdf(file, f)).toEqual(success);
  });

  test('오류 JSON', async () => {
    const body = { ok: false, code: 'FILE_TOO_LARGE', message: ERROR_MESSAGES.FILE_TOO_LARGE };
    const f = fakeFetch(new Response(JSON.stringify(body), { status: 413, headers: { 'content-type': 'application/json' } }));
    expect(await postPdf(file, f)).toEqual(body);
  });

  test('HTML 413 (Vercel 본문 한도)', async () => {
    const f = fakeFetch(new Response('<html>Request Entity Too Large</html>', { status: 413, headers: { 'content-type': 'text/html' } }));
    expect(await postPdf(file, f)).toEqual({ ok: false, code: 'FILE_TOO_LARGE', message: ERROR_MESSAGES.FILE_TOO_LARGE });
  });

  test('HTML 504 (시간 초과)', async () => {
    const f = fakeFetch(new Response('An error occurred', { status: 504, headers: { 'content-type': 'text/plain' } }));
    expect(await postPdf(file, f)).toEqual({ ok: false, code: 'AI_FAILED', message: ERROR_MESSAGES.AI_FAILED });
  });

  test('그 밖의 JSON 아닌 응답', async () => {
    const f = fakeFetch(new Response('boom', { status: 500, headers: { 'content-type': 'text/plain' } }));
    expect(await postPdf(file, f)).toEqual({ ok: false, code: 'INTERNAL_ERROR', message: ERROR_MESSAGES.INTERNAL_ERROR });
  });

  test('네트워크 오류', async () => {
    const f = vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch;
    expect(await postPdf(file, f)).toEqual({ ok: false, code: 'INTERNAL_ERROR', message: ERROR_MESSAGES.INTERNAL_ERROR });
  });

  test('요청 형태: POST /api/summarize, FormData file 필드', async () => {
    const f = fakeFetch(new Response(JSON.stringify(success), { status: 200 }));
    await postPdf(file, f);
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('/api/summarize');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get('file')).toBeInstanceOf(File);
  });
});
