import { summarize } from '@/lib/ai/summarize';
import { extractPdfText, PdfError, type ExtractResult } from '@/lib/pdf/extract';
import { validateUpload } from '@/lib/pdf/validate';
import { ERROR_STATUS, errorBody, type ApiSuccess, type ErrorCode } from '@/lib/types';

// 런타임은 기본값(Node.js)을 쓴다. Next.js 16에서 cacheComponents와 runtime 설정을 함께 쓸 수 없다.
export const maxDuration = 150;

function fail(code: ErrorCode): Response {
  return Response.json(errorBody(code), { status: ERROR_STATUS[code] });
}

export async function POST(req: Request): Promise<Response> {
  const start = Date.now();
  let size = 0;
  let pageCount: number | undefined;
  let model: string | undefined;
  let code: ErrorCode | 'OK' = 'OK';

  const respondError = (c: ErrorCode): Response => {
    code = c;
    return fail(c);
  };

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return respondError('NO_FILE');
    size = file.size;

    const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    const invalid = validateUpload(file.size, head);
    if (invalid) return respondError(invalid);

    let extracted: ExtractResult;
    try {
      extracted = await extractPdfText(new Uint8Array(await file.arrayBuffer()));
    } catch (e) {
      if (e instanceof PdfError) return respondError(e.code);
      throw e;
    }
    pageCount = extracted.pageCount;

    // 사용자 쪽 오류(파일 문제)를 먼저 알리기 위해 키 확인은 추출 뒤에 한다.
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('OPENROUTER_API_KEY가 설정되지 않음');
      return respondError('INTERNAL_ERROR');
    }

    const outcome = await summarize(extracted.text, apiKey);
    if (!outcome.ok) return respondError(outcome.code);
    model = outcome.model;

    const body: ApiSuccess = {
      ok: true,
      fileName: file.name,
      pageCount: extracted.pageCount,
      truncated: extracted.truncated,
      skippedImagePages: extracted.skippedImagePages,
      summary: outcome.summary,
    };
    return Response.json(body);
  } catch (e) {
    console.error('요약 처리 중 예상하지 못한 오류', e instanceof Error ? e.message : 'unknown');
    return respondError('INTERNAL_ERROR');
  } finally {
    // 파일 이름과 본문은 남기지 않는다.
    console.info(JSON.stringify({ event: 'summarize', size, pageCount, model, code, ms: Date.now() - start }));
  }
}
