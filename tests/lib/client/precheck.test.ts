import { describe, expect, test } from 'vitest';
import { precheckFile } from '@/lib/client/precheck';

describe('precheckFile', () => {
  test('정상 PDF', () => expect(precheckFile({ name: 'a.pdf', type: 'application/pdf', size: 1000 })).toBeNull());
  test('정확히 4MB 허용', () => expect(precheckFile({ name: 'a.pdf', type: 'application/pdf', size: 4 * 1024 * 1024 })).toBeNull());
  test('4MB 초과', () => expect(precheckFile({ name: 'a.pdf', type: 'application/pdf', size: 4 * 1024 * 1024 + 1 })).toBe('FILE_TOO_LARGE'));
  test('MIME이 비어 있어도 확장자가 .pdf면 허용', () => expect(precheckFile({ name: 'a.pdf', type: '', size: 10 })).toBeNull());
  test('대문자 확장자 .PDF 허용', () => expect(precheckFile({ name: 'LECTURE.PDF', type: '', size: 10 })).toBeNull());
  test('docx는 NOT_PDF', () => expect(precheckFile({ name: 'a.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 10 })).toBe('NOT_PDF'));
  test('PDF가 아니면서 너무 큰 파일은 NOT_PDF가 먼저', () => expect(precheckFile({ name: 'a.zip', type: 'application/zip', size: 10 * 1024 * 1024 })).toBe('NOT_PDF'));
});
