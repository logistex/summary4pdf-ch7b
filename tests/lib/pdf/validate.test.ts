import { describe, expect, test } from 'vitest';
import { validateUpload } from '@/lib/pdf/validate';

const pdfHead = new TextEncoder().encode('%PDF-1.7');

describe('validateUpload', () => {
  test('정확히 4MB는 허용', () => expect(validateUpload(4 * 1024 * 1024, pdfHead)).toBeNull());
  test('4MB + 1바이트는 FILE_TOO_LARGE', () =>
    expect(validateUpload(4 * 1024 * 1024 + 1, pdfHead)).toBe('FILE_TOO_LARGE'));
  test('PDF 시그니처가 아니면 NOT_PDF', () =>
    expect(validateUpload(100, new TextEncoder().encode('PK\x03\x04'))).toBe('NOT_PDF'));
  test('빈 파일은 NOT_PDF', () => expect(validateUpload(0, new Uint8Array())).toBe('NOT_PDF'));
  test('크기 검사가 시그니처 검사보다 먼저', () =>
    expect(validateUpload(4 * 1024 * 1024 + 1, new TextEncoder().encode('hello'))).toBe('FILE_TOO_LARGE'));
});
