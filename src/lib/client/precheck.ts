// 파일을 서버로 보내기 전에 형식과 크기를 확인한다.
// 진짜 PDF인지는 서버가 시그니처로 다시 확인한다.
import { MAX_FILE_BYTES } from '@/lib/limits';

export function precheckFile(file: {
  name: string;
  type: string;
  size: number;
}): 'NOT_PDF' | 'FILE_TOO_LARGE' | null {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) return 'NOT_PDF';
  if (file.size > MAX_FILE_BYTES) return 'FILE_TOO_LARGE';
  return null;
}
