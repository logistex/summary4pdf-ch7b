import { extractText, getDocumentProxy } from 'unpdf';
import { MAX_TEXT_CHARS, MIN_PAGE_CHARS } from '@/lib/limits';

export class PdfError extends Error {
  code: 'PDF_UNREADABLE' | 'SCANNED_PDF';

  constructor(code: 'PDF_UNREADABLE' | 'SCANNED_PDF', message?: string) {
    super(message ?? code);
    this.name = 'PdfError';
    this.code = code;
  }
}

export interface ExtractResult {
  text: string;
  pageCount: number;
  truncated: boolean;
  skippedImagePages: boolean;
}

/** PDF에서 글자를 뽑는다. 실패하면 PdfError를 던진다. */
export async function extractPdfText(bytes: Uint8Array): Promise<ExtractResult> {
  let pages: string[];
  try {
    // pdf.js가 버퍼를 떼어 갈 수 있으므로 복사본을 넘긴다.
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const result = await extractText(pdf, { mergePages: false });
    pages = result.text;
  } catch {
    // 손상된 파일, 암호 걸린 파일 등 unpdf가 던지는 모든 오류
    throw new PdfError('PDF_UNREADABLE');
  }

  const pageCount = pages.length;
  const withText = pages.filter((p) => p.replace(/\s/g, '').length >= MIN_PAGE_CHARS);
  if (withText.length === 0) throw new PdfError('SCANNED_PDF');

  const joined = withText.join('\n\n');
  const truncated = joined.length > MAX_TEXT_CHARS;
  return {
    text: truncated ? joined.slice(0, MAX_TEXT_CHARS) : joined,
    pageCount,
    truncated,
    skippedImagePages: withText.length < pageCount,
  };
}
