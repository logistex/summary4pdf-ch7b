import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ERROR_MESSAGES, type SummaryResult } from '@/lib/types';
import { MAX_FILE_BYTES } from '@/lib/limits';
import { makeBlankPdf, makeMixedPdf, makeTextPdf, pdfFile } from '../../helpers/pdf';

vi.mock('@/lib/ai/summarize', () => ({ summarize: vi.fn() }));

import { summarize } from '@/lib/ai/summarize';
import { POST } from '@/app/api/summarize/route';

const mockSummarize = vi.mocked(summarize);

const summary: SummaryResult = {
  oneLineSummary: '광합성 요약',
  keyConcepts: [{ name: '광합성', explanation: '빛으로 당을 만든다' }],
  definitions: [{ term: '엽록소', description: '빛을 흡수하는 색소' }],
};

function request(file?: File): Request {
  const form = new FormData();
  if (file) form.append('file', file);
  return new Request('http://localhost/api/summarize', { method: 'POST', body: form });
}

const oneText = () => makeTextPdf(['Photosynthesis converts light energy']);

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  process.env.OPENROUTER_API_KEY = 'test-key';
  mockSummarize.mockResolvedValue({ ok: true, summary, model: 'test-model' });
});

describe('POST /api/summarize', () => {
  test('정상 요약', async () => {
    const bytes = await makeTextPdf(['Photosynthesis converts light energy', 'Chlorophyll absorbs light']);
    const res = await POST(request(pdfFile(bytes)));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      ok: true,
      fileName: 'test.pdf',
      pageCount: 2,
      truncated: false,
      skippedImagePages: false,
      summary,
    });
    expect(mockSummarize).toHaveBeenCalledWith(expect.stringContaining('Photosynthesis'), 'test-key');
  });

  test('파일 없음', async () => {
    const res = await POST(request());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('NO_FILE');
    expect(body.message).toBe(ERROR_MESSAGES.NO_FILE);
  });

  test('multipart가 아닌 요청', async () => {
    const req = new Request('http://localhost/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ a: 1 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('NO_FILE');
  });

  test('너무 큼', async () => {
    const big = new Uint8Array(MAX_FILE_BYTES + 1);
    big.set(new TextEncoder().encode('%PDF-1.7'));
    const res = await POST(request(pdfFile(big)));
    expect(res.status).toBe(413);
    expect((await res.json()).code).toBe('FILE_TOO_LARGE');
    expect(mockSummarize).not.toHaveBeenCalled();
  });

  test('PDF 아님', async () => {
    const res = await POST(request(pdfFile(new TextEncoder().encode('hello'), 'fake.pdf')));
    expect(res.status).toBe(415);
    expect((await res.json()).code).toBe('NOT_PDF');
    expect(mockSummarize).not.toHaveBeenCalled();
  });

  test('스캔 PDF', async () => {
    const res = await POST(request(pdfFile(await makeBlankPdf(2))));
    expect(res.status).toBe(422);
    expect((await res.json()).code).toBe('SCANNED_PDF');
    expect(mockSummarize).not.toHaveBeenCalled();
  });

  test('깨진 PDF', async () => {
    const res = await POST(request(pdfFile(new TextEncoder().encode('%PDF-1.7\ngarbage'))));
    expect(res.status).toBe(422);
    expect((await res.json()).code).toBe('PDF_UNREADABLE');
  });

  test('AI 실패', async () => {
    mockSummarize.mockResolvedValue({ ok: false, code: 'AI_FAILED' });
    const res = await POST(request(pdfFile(await oneText())));
    expect(res.status).toBe(502);
    expect((await res.json()).code).toBe('AI_FAILED');
  });

  test('AI 한도', async () => {
    mockSummarize.mockResolvedValue({ ok: false, code: 'AI_RATE_LIMITED' });
    const res = await POST(request(pdfFile(await oneText())));
    expect(res.status).toBe(429);
    expect((await res.json()).code).toBe('AI_RATE_LIMITED');
  });

  test('키 없음', async () => {
    delete process.env.OPENROUTER_API_KEY;
    const res = await POST(request(pdfFile(await oneText())));
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(JSON.parse(text).code).toBe('INTERNAL_ERROR');
    expect(text).not.toContain('OPENROUTER');
    expect(mockSummarize).not.toHaveBeenCalled();
  });

  test('예상 못 한 오류', async () => {
    mockSummarize.mockRejectedValue(new Error('boom'));
    const res = await POST(request(pdfFile(await oneText())));
    expect(res.status).toBe(500);
    expect((await res.json()).code).toBe('INTERNAL_ERROR');
  });

  test('일부 이미지 페이지', async () => {
    const bytes = await makeMixedPdf(['Mitochondria is the powerhouse of the cell', null]);
    const res = await POST(request(pdfFile(bytes)));
    expect(res.status).toBe(200);
    expect((await res.json()).skippedImagePages).toBe(true);
  });

  test('로그에 파일 이름과 본문을 남기지 않는다', async () => {
    const info = vi.mocked(console.info);
    await POST(request(pdfFile(await oneText(), 'secret-name.pdf')));
    const logged = info.mock.calls.flat().join(' ');
    expect(logged).toContain('"event":"summarize"');
    expect(logged).not.toContain('secret-name');
    expect(logged).not.toContain('Photosynthesis');
  });
});
