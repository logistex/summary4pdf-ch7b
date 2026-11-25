import { describe, expect, test } from 'vitest';
import { extractPdfText, PdfError } from '@/lib/pdf/extract';
import { MAX_TEXT_CHARS } from '@/lib/limits';
import { makeBlankPdf, makeMixedPdf, makeTextPdf } from '../../helpers/pdf';

describe('extractPdfText', () => {
  test('글자 있는 PDF: 텍스트와 페이지 수', async () => {
    const r = await extractPdfText(
      await makeTextPdf(['Photosynthesis converts light energy', 'Chlorophyll absorbs light']),
    );
    expect(r.pageCount).toBe(2);
    expect(r.text).toContain('Photosynthesis');
    expect(r.truncated).toBe(false);
    expect(r.skippedImagePages).toBe(false);
  });

  test('모든 페이지에 글자가 없으면 SCANNED_PDF', async () => {
    await expect(extractPdfText(await makeBlankPdf(3))).rejects.toMatchObject({ code: 'SCANNED_PDF' });
  });

  test('일부 페이지만 비면 skippedImagePages', async () => {
    const r = await extractPdfText(await makeMixedPdf(['Mitochondria is the powerhouse of the cell', null]));
    expect(r.skippedImagePages).toBe(true);
    expect(r.pageCount).toBe(2);
    expect(r.text).toContain('Mitochondria');
  });

  test('MAX_TEXT_CHARS를 넘으면 잘리고 truncated', async () => {
    const long = 'Lorem ipsum dolor sit amet. '.repeat(400);
    const r = await extractPdfText(await makeTextPdf(Array(80).fill(long)));
    expect(r.text.length).toBeLessThanOrEqual(MAX_TEXT_CHARS);
    expect(r.truncated).toBe(true);
  });

  test('%PDF-로 시작하지만 깨진 파일은 PDF_UNREADABLE', async () => {
    const broken = new TextEncoder().encode('%PDF-1.7\ngarbage');
    await expect(extractPdfText(broken)).rejects.toBeInstanceOf(PdfError);
    await expect(extractPdfText(broken)).rejects.toMatchObject({ code: 'PDF_UNREADABLE' });
  });

  test('입력 버퍼를 떼어 가지 않는다', async () => {
    const bytes = await makeTextPdf(['Photosynthesis converts light energy']);
    const len = bytes.byteLength;
    await extractPdfText(bytes);
    expect(bytes.byteLength).toBe(len);
  });
});
