// 시험용 PDF를 코드로 만든다. pdf-lib의 기본 글꼴(Helvetica)을 써서 영문만 지원한다.
import { PDFDocument, StandardFonts } from 'pdf-lib';

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 40;
const FONT_SIZE = 10;
const LINE_HEIGHT = 12;
const CHARS_PER_LINE = 95;

/** 긴 글을 일정 글자 수마다 줄로 나눈다. */
function wrap(text: string): string[] {
  const lines: string[] = [];
  for (let i = 0; i < text.length; i += CHARS_PER_LINE) {
    lines.push(text.slice(i, i + CHARS_PER_LINE));
  }
  return lines;
}

/** 각 항목이 한 페이지가 된다. null이면 글자 없는 빈 페이지. */
export async function makeMixedPdf(pages: (string | null)[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const content of pages) {
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    if (content === null) continue;
    let y = PAGE_HEIGHT - MARGIN;
    for (const line of wrap(content)) {
      // 페이지 아래로 넘쳐도 글은 그대로 남기므로 텍스트 추출 시험에는 문제없다.
      page.drawText(line, { x: MARGIN, y, size: FONT_SIZE, font });
      y -= LINE_HEIGHT;
    }
  }
  return doc.save();
}

/** 각 페이지에 주어진 영문 글을 쓴다. */
export function makeTextPdf(pages: string[]): Promise<Uint8Array> {
  return makeMixedPdf(pages);
}

/** 글자가 없는 페이지들로 된 PDF (스캔 PDF 흉내). */
export function makeBlankPdf(pageCount: number): Promise<Uint8Array> {
  return makeMixedPdf(Array.from({ length: pageCount }, () => null));
}

/** 시험에서 FormData에 넣을 File을 만든다. */
export function pdfFile(bytes: Uint8Array, name = 'test.pdf'): File {
  // 복사해서 ArrayBuffer 기반 Uint8Array로 만든다(BlobPart 타입 요구사항).
  return new File([new Uint8Array(bytes)], name, { type: 'application/pdf' });
}
