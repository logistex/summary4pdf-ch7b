// 크기·길이·시간 상수

/** PDF 최대 크기: 정확히 4MB까지 허용 */
export const MAX_FILE_BYTES = 4 * 1024 * 1024;

/** 공백을 뺀 글자 수가 이보다 적은 페이지는 "글자 없는 페이지"로 본다 */
export const MIN_PAGE_CHARS = 20;

/** AI에 보내는 텍스트 최대 길이(글자 수) */
export const MAX_TEXT_CHARS = 60000;

/** 모델 하나당 응답 대기 한도 */
export const MODEL_TIMEOUT_MS = 60000;

export const MAX_KEY_CONCEPTS = 5;
export const MAX_DEFINITIONS = 8;
