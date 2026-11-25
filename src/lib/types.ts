// 서버와 화면이 함께 쓰는 타입, 오류 코드, 오류 문구.
// 오류 문구는 이 파일의 ERROR_MESSAGES만 쓴다. 다른 곳에 복사하지 않는다.

export type ErrorCode =
  | 'NO_FILE'
  | 'NOT_PDF'
  | 'FILE_TOO_LARGE'
  | 'PDF_UNREADABLE'
  | 'SCANNED_PDF'
  | 'AI_RATE_LIMITED'
  | 'AI_FAILED'
  | 'INTERNAL_ERROR';

export interface KeyConcept {
  name: string;
  explanation: string;
}

export interface Definition {
  term: string;
  description: string;
}

export interface SummaryResult {
  oneLineSummary: string;
  /** 1~5개 */
  keyConcepts: KeyConcept[];
  /** 0~8개 */
  definitions: Definition[];
}

export interface ApiSuccess {
  ok: true;
  fileName: string;
  pageCount: number;
  truncated: boolean;
  skippedImagePages: boolean;
  summary: SummaryResult;
}

export interface ApiError {
  ok: false;
  code: ErrorCode;
  message: string;
}

export type ApiResponse = ApiSuccess | ApiError;

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  NO_FILE: '파일이 선택되지 않았어요. PDF를 끌어다 놓거나 눌러서 골라 주세요.',
  NOT_PDF: 'PDF 파일만 올릴 수 있어요. 파일 형식을 확인해 주세요.',
  FILE_TOO_LARGE: '파일이 4MB를 넘어요. 더 작은 PDF로 다시 올려 주세요.',
  PDF_UNREADABLE: 'PDF를 열 수 없어요. 파일이 손상되었거나 암호가 걸려 있는지 확인해 주세요.',
  SCANNED_PDF: '글자를 읽을 수 없는 PDF예요. 스캔한 이미지로 된 PDF는 아직 요약할 수 없어요.',
  AI_RATE_LIMITED: '지금 요청이 많아요. 잠시 후 다시 시도해 주세요.',
  AI_FAILED: '요약을 만들지 못했어요. 잠시 후 다시 시도해 주세요.',
  INTERNAL_ERROR: '알 수 없는 문제가 생겼어요. 잠시 후 다시 시도해 주세요.',
};

export const ERROR_STATUS: Record<ErrorCode, number> = {
  NO_FILE: 400,
  NOT_PDF: 415,
  FILE_TOO_LARGE: 413,
  PDF_UNREADABLE: 422,
  SCANNED_PDF: 422,
  AI_RATE_LIMITED: 429,
  AI_FAILED: 502,
  INTERNAL_ERROR: 500,
};

/** 오류 코드로 API 오류 응답 본문을 만든다. */
export function errorBody(code: ErrorCode): ApiError {
  return { ok: false, code, message: ERROR_MESSAGES[code] };
}
