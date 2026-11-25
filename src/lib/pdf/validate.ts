import { MAX_FILE_BYTES } from '@/lib/limits';

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

/** 업로드 파일의 크기와 앞부분을 확인한다. 크기를 먼저 보고, 그다음 PDF 시그니처를 본다. */
export function validateUpload(size: number, head: Uint8Array): 'FILE_TOO_LARGE' | 'NOT_PDF' | null {
  if (size > MAX_FILE_BYTES) return 'FILE_TOO_LARGE';
  if (head.length < PDF_SIGNATURE.length) return 'NOT_PDF';
  if (!PDF_SIGNATURE.every((byte, i) => head[i] === byte)) return 'NOT_PDF';
  return null;
}
