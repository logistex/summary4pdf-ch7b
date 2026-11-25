import { PDFDocument } from 'pdf-lib';
import { describe, expect, test } from 'vitest';
import { makeBlankPdf, makeMixedPdf, makeTextPdf, pdfFile } from './pdf';

describe('시험용 PDF 도우미', () => {
  test('makeTextPdf는 %PDF-로 시작하고 페이지 수가 맞다', async () => {
    const bytes = await makeTextPdf(['Hello world page one', 'Second page text']);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2);
  });

  test('makeMixedPdf는 null 페이지를 빈 페이지로 만든다', async () => {
    const bytes = await makeMixedPdf(['Text here for page one', null]);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2);
  });

  test('makeBlankPdf는 요청한 수만큼 페이지를 만든다', async () => {
    const bytes = await makeBlankPdf(3);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(3);
  });

  test('pdfFile은 기본 이름과 PDF MIME을 가진다', async () => {
    const file = pdfFile(await makeBlankPdf(1));
    expect(file.name).toBe('test.pdf');
    expect(file.type).toBe('application/pdf');
  });
});
