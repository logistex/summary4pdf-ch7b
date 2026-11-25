# PDF 요약 웹 앱 구현 계획

> **에이전트 작업자용:** 필수 하위 스킬: 이 계획은 superpowers:subagent-driven-development 방식으로 실행한다. 단, 사용자가 담당 에이전트를 정해 두었다(아래 "실행 방식"). 단계는 체크박스(`- [ ]`)로 추적한다.

**목표:** 대학생이 PDF(최대 4MB)를 끌어다 놓으면 OpenRouter 무료 모델로 한 줄 요약·핵심 개념·정의/공식을 한국어로 보여 주는 Next.js 웹 앱을 만들어 GitHub `summary4pdf-ch7b`에 푸시한다.

**구조:** 한 페이지짜리 Next.js App Router 앱이다. 브라우저가 `POST /api/summarize`로 PDF를 보내면, 서버(Node.js 런타임)가 확인 → 텍스트 추출 → OpenRouter 호출(1순위 실패 시 2순위) → 결과 확인을 거쳐 한 번의 JSON 응답으로 돌려준다. 저장소·DB는 없다.

**기술 스택:** Next.js 16.4.6 (App Router, TypeScript, `src/` 폴더), Tailwind CSS, unpdf 2.x(텍스트 추출), Vitest 5.x + @testing-library/react + jsdom(시험), pdf-lib(시험용 PDF 생성), Node.js 24.

**설계 문서:** [docs/superpowers/specs/2026-11-25-pdf-summary-app-design.md](../specs/2026-11-25-pdf-summary-app-design.md). 실행하는 쪽은 설계 문서와 이 계획을 함께 읽는다.

## 실행 방식 (사용자 지정)

| 작업 | 담당 |
|---|---|
| Task 1, 5, 7 | 주 세션 |
| Task 2 | backend-developer |
| Task 3 | ai-integration-specialist |
| Task 4 | frontend-developer |
| Task 6 | qa-engineer (찾은 문제는 해당 담당 에이전트가 고치고, QA가 다시 확인) |

- Task 2·3·4는 동시에 진행한다. 서로 다른 파일만 만들고, 공용 파일(`src/lib/types.ts`, `src/lib/limits.ts`, `tests/helpers/pdf.ts`)은 **읽기만** 한다.
- 하위 에이전트는 **커밋하지 않는다.** 같은 작업 폴더에서 동시에 일하므로, 각 Task가 끝나면 주 세션이 검토하고 커밋한다.
- 작업 브랜치: `feat/pdf-summary` (현재 `docs/prd` 브랜치에서 만든다).

## 전체 제약 (모든 Task에 적용)

- 모든 화면 문구, 오류 메시지, 주석, 커밋 메시지는 한국어로 쓴다.
- `.env*` 파일은 열거나 읽거나 출력하지 않는다. 변수 이름 `OPENROUTER_API_KEY`만 쓴다. 키가 필요한 스크립트는 `node --env-file=.env`로 실행하고, 키 값을 출력하지 않는다.
- `OPENROUTER_API_KEY`는 서버 코드에서만 `process.env`로 읽는다. `NEXT_PUBLIC_` 접두사를 쓰지 않는다.
- PDF 최대 크기는 `4 * 1024 * 1024` 바이트다. 정확히 4MB는 허용하고, 1바이트라도 넘으면 거절한다.
- 모델 1순위는 `nvidia/nemotron-3-ultra-550b-a55b:free`, 2순위는 `nvidia/nemotron-3.5-super-vl:free`다. `src/lib/ai/models.ts` 한 곳에만 적는다.
- PDF 바이트와 추출 텍스트를 디스크(`/tmp` 포함), DB, 로그에 남기지 않는다. 로그에는 파일 크기, 페이지 수, 사용 모델, 오류 코드, 소요 시간만 남긴다.
- 오류 메시지 문구는 `src/lib/types.ts`의 `ERROR_MESSAGES`만 쓴다. 다른 곳에 문구를 복사하지 않는다.
- 시험 명령: `npx vitest run <경로>`. 실제 OpenRouter 호출은 자동 시험에 넣지 않는다(가짜 `fetch`를 쓴다).

## 리뷰 중점 (설계에는 없지만 사용자가 겪기 쉬운 경우)

1. **정확히 4MB 파일**: 경계값이므로 허용되어야 한다. → Task 2 `validate` 시험, Task 4 `precheckFile` 시험
2. **브라우저가 MIME을 비워 주는 PDF, 확장자가 대문자(`.PDF`)인 PDF**: Windows 끌어놓기에서 흔하다. 정상으로 받아야 한다. → Task 4 `precheckFile` 시험
3. **AI가 JSON을 ```json 코드 블록으로 감싸거나 앞뒤에 설명을 붙임**: 정상 결과로 해석해야 한다. → Task 3 `parseSummary` 시험
4. **Vercel이 JSON이 아닌 응답(HTML 413, 504 시간 초과)을 줌**: 빈 화면 대신 한국어 안내가 나와야 한다. → Task 4 `postPdf` 시험
5. **`OPENROUTER_API_KEY`가 설정되지 않은 배포**: `INTERNAL_ERROR` 안내가 나오고 키 관련 내용이 응답에 드러나지 않아야 한다. → Task 2 라우트 시험

---

## 파일 구조

```
src/
  lib/
    types.ts            공용 타입, 오류 코드, 오류 메시지, HTTP 상태 (Task 1)
    limits.ts           크기·길이·시간 상수 (Task 1)
    pdf/
      validate.ts       크기·PDF 시그니처 확인 (Task 2)
      extract.ts        페이지별 텍스트 추출, 스캔 판단, 자르기 (Task 2)
    ai/
      models.ts         모델 ID 두 개 (Task 3)
      prompt.ts         프롬프트 메시지 만들기 (Task 3)
      parse.ts          AI 응답 → SummaryResult, 한국어 검사 (Task 3)
      summarize.ts      OpenRouter 호출과 모델 전환 (Task 3)
    client/
      precheck.ts       브라우저 쪽 형식·크기 확인 (Task 4)
      upload.ts         /api/summarize 호출, JSON 아닌 응답 처리 (Task 4)
  app/
    api/summarize/route.ts   POST 처리 (Task 2)
    layout.tsx               lang="ko", 제목 (Task 4)
    page.tsx                 화면 상태 관리 (Task 4)
  components/
    UploadDropzone.tsx  끌어놓기 영역 (Task 4)
    ProgressStatus.tsx  진행 단계 표시 (Task 4)
    SummaryView.tsx     결과 화면 (Task 4)
    ErrorNotice.tsx     오류 안내 (Task 4)
scripts/
  check-models.mjs      두 모델 실제 호출 확인 (Task 1)
tests/
  helpers/pdf.ts        시험용 PDF 만들기 (Task 1)
  lib/...  app/...  components/...   각 Task의 시험
.env.example            OPENROUTER_API_KEY= (값 없음)
vitest.config.ts
```

---

### Task 1: 프로젝트 뼈대, 공용 타입, 모델 호출 확인 (주 세션)

**Files:**
- Create: Next.js 기본 파일 전체, `vitest.config.ts`, `.env.example`, `src/lib/types.ts`, `src/lib/limits.ts`, `tests/helpers/pdf.ts`, `tests/helpers/pdf.test.ts`, `scripts/check-models.mjs`
- Modify: `.gitignore` (`.env*` 무시, `!.env.example` 허용)

**Interfaces:**
- Produces (`src/lib/types.ts`):

```ts
export type ErrorCode =
  | 'NO_FILE' | 'NOT_PDF' | 'FILE_TOO_LARGE' | 'PDF_UNREADABLE'
  | 'SCANNED_PDF' | 'AI_RATE_LIMITED' | 'AI_FAILED' | 'INTERNAL_ERROR';

export interface KeyConcept { name: string; explanation: string }
export interface Definition { term: string; description: string }
export interface SummaryResult {
  oneLineSummary: string;
  keyConcepts: KeyConcept[];   // 1~5개
  definitions: Definition[];   // 0~8개
}

export interface ApiSuccess {
  ok: true; fileName: string; pageCount: number;
  truncated: boolean; skippedImagePages: boolean; summary: SummaryResult;
}
export interface ApiError { ok: false; code: ErrorCode; message: string }
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
  NO_FILE: 400, NOT_PDF: 415, FILE_TOO_LARGE: 413, PDF_UNREADABLE: 422,
  SCANNED_PDF: 422, AI_RATE_LIMITED: 429, AI_FAILED: 502, INTERNAL_ERROR: 500,
};

export function errorBody(code: ErrorCode): ApiError; // { ok:false, code, message: ERROR_MESSAGES[code] }
```

- Produces (`src/lib/limits.ts`): `MAX_FILE_BYTES = 4 * 1024 * 1024`, `MIN_PAGE_CHARS = 20`(공백 제외 글자 수, 이보다 적으면 글자 없는 페이지), `MAX_TEXT_CHARS = 60000`(1단계 확인 결과로 조정 가능), `MODEL_TIMEOUT_MS = 60000`, `MAX_KEY_CONCEPTS = 5`, `MAX_DEFINITIONS = 8`.
- Produces (`tests/helpers/pdf.ts`, pdf-lib 사용, 영문 StandardFonts):
  - `makeTextPdf(pages: string[]): Promise<Uint8Array>`: 각 페이지에 주어진 영문 글을 쓴다
  - `makeBlankPdf(pageCount: number): Promise<Uint8Array>`: 글자가 없는 페이지들
  - `makeMixedPdf(pages: (string | null)[]): Promise<Uint8Array>`: `null`인 페이지는 비운다
  - `pdfFile(bytes: Uint8Array, name?: string): File`: 시험에서 `FormData`에 넣을 `File` (기본 이름 `test.pdf`, type `application/pdf`)

- [ ] **Step 1: 작업 브랜치 만들기**

Run: `git switch -c feat/pdf-summary`
Expected: `Switched to a new branch 'feat/pdf-summary'`

- [ ] **Step 2: Next.js 뼈대를 임시 폴더에 만들고 루트로 옮기기**

루트에 `CLAUDE.md`, `docs/`, `.claude/`가 있어 create-next-app이 충돌을 낼 수 있으므로, 세션 스크래치 폴더에 만든 뒤 옮긴다.

Run: `npx create-next-app@16.4.6 <스크래치>/scaffold --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes`
그다음 `scaffold`의 내용(`.git`과 `node_modules` 제외)을 저장소 루트로 복사하고 `npm install`.
Expected: 루트에 `package.json`, `src/app/page.tsx`가 생기고 기존 `CLAUDE.md`, `docs/`, `.claude/`는 그대로다.

- [ ] **Step 3: 의존성과 시험 설정 추가**

Run: `npm install unpdf@^2` 그리고 `npm install -D vitest@^5 @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom pdf-lib`
`vitest.config.ts`: react 플러그인, 별칭 `@` → `./src`, 기본 환경 `node`, `include: ['tests/**/*.test.{ts,tsx}']`. 컴포넌트 시험은 파일 첫 줄의 `// @vitest-environment jsdom`으로 환경을 바꾼다.
`package.json`에 `"test": "vitest run"`을 추가한다.

- [ ] **Step 4: `src/lib/types.ts`, `src/lib/limits.ts`를 위 Interfaces대로 작성**

- [ ] **Step 5: 시험용 PDF 도우미의 실패하는 시험 작성** (`tests/helpers/pdf.test.ts`)

```ts
test('makeTextPdf는 %PDF-로 시작하고 페이지 수가 맞다', async () => {
  const bytes = await makeTextPdf(['Hello world page one', 'Second page text']);
  expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
  expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2);
});
test('makeMixedPdf는 null 페이지를 빈 페이지로 만든다', async () => {
  const bytes = await makeMixedPdf(['Text here for page one', null]);
  expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2);
});
```

- [ ] **Step 6: 시험 실패 확인** — Run: `npx vitest run tests/helpers` / Expected: FAIL (`makeTextPdf` 없음)

- [ ] **Step 7: `tests/helpers/pdf.ts` 구현 후 통과 확인** — Run: `npx vitest run tests/helpers` / Expected: PASS

- [ ] **Step 8: `.gitignore`, `.env.example` 정리**

`.gitignore`에 `.env*`와 `!.env.example`이 있는지 확인한다(create-next-app 기본값은 `.env*`). `.env.example` 내용은 `OPENROUTER_API_KEY=` 한 줄이다.
Run: `git check-ignore .env` / Expected: `.env` 출력(무시됨)

- [ ] **Step 9: `scripts/check-models.mjs` 작성 후 실행**

두 모델 각각에 `https://openrouter.ai/api/v1/chat/completions`로 "한국어로 '안녕'이라고만 답해" 요청을 한 번씩 보낸다. 모델마다 `모델ID: OK (n초)` 또는 `모델ID: 실패 (HTTP 상태, 오류 메시지 앞 200자)`만 출력한다. 키 값과 요청 헤더는 출력하지 않는다. 키가 없으면 "OPENROUTER_API_KEY가 설정되지 않았어요"를 출력하고 종료 코드 1.
Run: `node --env-file=.env scripts/check-models.mjs`
Expected: 두 줄 모두 `OK`.
**하나라도 실패하면 여기서 멈추고 사용자에게 묻는다.** 이때 `https://openrouter.ai/api/v1/models`(키 포함 요청)에서 `:free`로 끝나는 모델 후보를 함께 보여 준다. 에이전트가 모델을 바꾸지 않는다. (설계 4.2)
두 모델 모두 OK면, 같은 목록에서 두 모델의 `context_length`를 확인해 작은 쪽 기준으로 `MAX_TEXT_CHARS`가 넉넉히 들어가는지 본다(한국어·영어 혼합 기준 대략 글자 수 ≈ 토큰 수 × 2, 프롬프트와 응답 몫으로 절반만 쓴다). 줄여야 하면 `limits.ts`를 고친다.

- [ ] **Step 10: 빌드와 시험 확인 후 커밋**

Run: `npm run build` 그리고 `npx vitest run` / Expected: 둘 다 성공
```bash
git add -A
git commit -m "chore: Next.js 뼈대, 공용 타입, 시험 도우미, 모델 확인 스크립트"
```
(`git status`로 `.env`가 스테이징되지 않았는지 먼저 확인한다.)

---

### Task 2: PDF 업로드, 확인, 텍스트 추출, API 라우트 (backend-developer)

**Files:**
- Create: `src/lib/pdf/validate.ts`, `src/lib/pdf/extract.ts`, `src/app/api/summarize/route.ts`
- Test: `tests/lib/pdf/validate.test.ts`, `tests/lib/pdf/extract.test.ts`, `tests/app/api/summarize.test.ts`

**Interfaces:**
- Consumes: `src/lib/types.ts`, `src/lib/limits.ts`, `tests/helpers/pdf.ts` (Task 1). `summarize`는 Task 3이 만든다. 시그니처는 `summarize(text: string, apiKey: string, opts?: SummarizeOptions): Promise<SummarizeOutcome>`이고, `SummarizeOutcome = { ok: true; summary: SummaryResult; model: string } | { ok: false; code: 'AI_FAILED' | 'AI_RATE_LIMITED' }`이다. 라우트 시험에서는 `vi.mock('@/lib/ai/summarize')`로 가짜로 바꾼다.
- Produces:
  - `validateUpload(size: number, head: Uint8Array): 'FILE_TOO_LARGE' | 'NOT_PDF' | null`. 크기를 먼저 보고, 그다음 `head`가 `%PDF-`로 시작하는지 본다.
  - `class PdfError extends Error { code: 'PDF_UNREADABLE' | 'SCANNED_PDF' }`
  - `extractPdfText(bytes: Uint8Array): Promise<{ text: string; pageCount: number; truncated: boolean; skippedImagePages: boolean }>`. 실패하면 `PdfError`를 던진다.
  - `POST(req: Request): Promise<Response>`. 응답 본문은 `ApiResponse`이고 `export const runtime = 'nodejs'`, `export const maxDuration = 150`.

- [ ] **Step 1: `validate` 실패하는 시험 작성**

```ts
const pdfHead = new TextEncoder().encode('%PDF-1.7');
test('정확히 4MB는 허용', () => expect(validateUpload(4 * 1024 * 1024, pdfHead)).toBeNull());
test('4MB + 1바이트는 FILE_TOO_LARGE', () => expect(validateUpload(4 * 1024 * 1024 + 1, pdfHead)).toBe('FILE_TOO_LARGE'));
test('PDF 시그니처가 아니면 NOT_PDF', () => expect(validateUpload(100, new TextEncoder().encode('PK\x03\x04'))).toBe('NOT_PDF'));
test('빈 파일은 NOT_PDF', () => expect(validateUpload(0, new Uint8Array())).toBe('NOT_PDF'));
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run tests/lib/pdf/validate.test.ts` / Expected: FAIL

- [ ] **Step 3: `validateUpload` 구현 후 통과 확인** — Expected: PASS

- [ ] **Step 4: `extract` 실패하는 시험 작성**

```ts
test('글자 있는 PDF: 텍스트와 페이지 수', async () => {
  const r = await extractPdfText(await makeTextPdf(['Photosynthesis converts light energy', 'Chlorophyll absorbs light']));
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
});
test('MAX_TEXT_CHARS를 넘으면 잘리고 truncated', async () => {
  const long = 'Lorem ipsum dolor sit amet. '.repeat(400);
  const r = await extractPdfText(await makeTextPdf(Array(80).fill(long)));
  expect(r.text.length).toBeLessThanOrEqual(MAX_TEXT_CHARS);
  expect(r.truncated).toBe(true);
});
test('%PDF-로 시작하지만 깨진 파일은 PDF_UNREADABLE', async () => {
  await expect(extractPdfText(new TextEncoder().encode('%PDF-1.7\ngarbage'))).rejects.toMatchObject({ code: 'PDF_UNREADABLE' });
});
```

(`makeTextPdf`가 페이지당 긴 글을 한 줄로 쓰면 잘릴 수 있다. 시험의 목적은 "총 글자 수 > MAX_TEXT_CHARS"이므로, 도우미가 줄바꿈을 지원하지 않으면 페이지 수를 늘려 맞춘다.)

- [ ] **Step 5: 실패 확인** — Run: `npx vitest run tests/lib/pdf/extract.test.ts` / Expected: FAIL

- [ ] **Step 6: `extractPdfText` 구현**

unpdf의 `getDocumentProxy(bytes)` + `extractText(pdf, { mergePages: false })`로 페이지별 텍스트를 얻는다. 공백을 뺀 글자 수가 `MIN_PAGE_CHARS`보다 적은 페이지는 글자 없는 페이지로 본다. 모두 글자 없는 페이지면 `SCANNED_PDF`, 일부면 그 페이지들을 빼고 `skippedImagePages: true`로 한다. 글자 있는 페이지를 `\n\n`으로 이어 붙이고 `MAX_TEXT_CHARS`에서 자른다. unpdf가 던지는 모든 오류(암호 포함)는 `PDF_UNREADABLE`로 바꾼다. unpdf에 `bytes`의 복사본을 넘긴다(pdf.js가 버퍼를 떼어 갈 수 있다).

- [ ] **Step 7: 통과 확인** — Expected: PASS

- [ ] **Step 8: 라우트 실패하는 시험 작성** (`tests/app/api/summarize.test.ts`)

`vi.mock('@/lib/ai/summarize')`로 `summarize`를 가짜로 바꾸고, `beforeEach`에서 `process.env.OPENROUTER_API_KEY = 'test-key'`로 둔다. `new Request('http://localhost/api/summarize', { method: 'POST', body: formData })`로 `POST`를 직접 부른다.

| 시험 이름 | 준비 | 기대 |
|---|---|---|
| 정상 요약 | 글자 PDF, `summarize` → `{ ok:true, summary, model }` | 200, `ok:true`, `fileName:'test.pdf'`, `pageCount`, `summary`가 그대로 |
| 파일 없음 | 빈 FormData | 400, `code:'NO_FILE'`, `message === ERROR_MESSAGES.NO_FILE` |
| 너무 큼 | 4MB+1바이트(`%PDF-`로 시작) | 413, `FILE_TOO_LARGE`, `summarize` 호출 안 됨 |
| PDF 아님 | `hello` 텍스트, 이름 `fake.pdf` | 415, `NOT_PDF` |
| 스캔 PDF | `makeBlankPdf(2)` | 422, `SCANNED_PDF`, `summarize` 호출 안 됨 |
| 깨진 PDF | `%PDF-1.7\ngarbage` | 422, `PDF_UNREADABLE` |
| AI 실패 | `summarize` → `{ ok:false, code:'AI_FAILED' }` | 502, `AI_FAILED` |
| AI 한도 | `summarize` → `{ ok:false, code:'AI_RATE_LIMITED' }` | 429, `AI_RATE_LIMITED` |
| 키 없음 | `delete process.env.OPENROUTER_API_KEY` | 500, `INTERNAL_ERROR`, 응답 본문에 `OPENROUTER`라는 글자가 없음, `summarize` 호출 안 됨 |
| 예상 못 한 오류 | `summarize`가 throw | 500, `INTERNAL_ERROR` |
| 일부 이미지 페이지 | `makeMixedPdf([글, null])` | 200, `skippedImagePages:true` |

- [ ] **Step 9: 실패 확인** — Run: `npx vitest run tests/app` / Expected: FAIL

- [ ] **Step 10: `src/app/api/summarize/route.ts` 구현**

순서: `formData()`의 `file`이 `File`이 아니면 `NO_FILE` → `validateUpload(file.size, 앞 5바이트)` → `extractPdfText` → 키 확인(없으면 `console.error('OPENROUTER_API_KEY가 설정되지 않음')` 후 `INTERNAL_ERROR`) → `summarize(text, key)` → 성공 응답. 오류 응답은 `Response.json(errorBody(code), { status: ERROR_STATUS[code] })`로 만든다. 마지막에 `console.info(JSON.stringify({ event: 'summarize', size, pageCount, model, code, ms }))` 한 줄만 남긴다(파일 이름·텍스트는 남기지 않는다). 키 확인을 추출 뒤에 두는 이유는 사용자 쪽 오류(파일 문제)를 먼저 알려 주기 위해서다.

- [ ] **Step 11: 통과 확인** — Run: `npx vitest run tests/lib/pdf tests/app` / Expected: PASS

- [ ] **Step 12: 주 세션에 넘기기** (하위 에이전트는 커밋하지 않는다) — 주 세션이 검토 후 `git commit -m "feat: PDF 업로드 확인·텍스트 추출과 요약 API 라우트"`

---

### Task 3: OpenRouter 요약과 모델 전환 (ai-integration-specialist)

**Files:**
- Create: `src/lib/ai/models.ts`, `src/lib/ai/prompt.ts`, `src/lib/ai/parse.ts`, `src/lib/ai/summarize.ts`
- Test: `tests/lib/ai/parse.test.ts`, `tests/lib/ai/summarize.test.ts`

**Interfaces:**
- Consumes: `SummaryResult`, `KeyConcept`, `Definition` (`src/lib/types.ts`), `MODEL_TIMEOUT_MS`, `MAX_KEY_CONCEPTS`, `MAX_DEFINITIONS` (`src/lib/limits.ts`)
- Produces:
  - `models.ts`: `export const MODELS = ['nvidia/nemotron-3-ultra-550b-a55b:free', 'nvidia/nemotron-3.5-super-vl:free'] as const;`
  - `prompt.ts`: `buildMessages(text: string): { role: 'system' | 'user'; content: string }[]`
  - `parse.ts`: `parseSummary(raw: string): SummaryResult | null` (해석 불가 또는 한국어가 아니면 `null`), `isKorean(s: string): boolean`
  - `summarize.ts`:
    ```ts
    export interface SummarizeOptions { fetchImpl?: typeof fetch; timeoutMs?: number }
    export type SummarizeOutcome =
      | { ok: true; summary: SummaryResult; model: string }
      | { ok: false; code: 'AI_FAILED' | 'AI_RATE_LIMITED' };
    export function summarize(text: string, apiKey: string, opts?: SummarizeOptions): Promise<SummarizeOutcome>;
    ```

- [ ] **Step 1: `parseSummary` 실패하는 시험 작성**

```ts
const ok = { oneLineSummary: '광합성은 빛 에너지를 화학 에너지로 바꾸는 과정이다.',
  keyConcepts: [{ name: '엽록체', explanation: '광합성이 일어나는 세포 기관이다.' },
                { name: '명반응', explanation: '빛을 써서 ATP를 만든다.' },
                { name: '암반응', explanation: '이산화탄소를 고정한다.' }],
  definitions: [{ term: '광합성 식', description: '6CO2 + 6H2O → C6H12O6 + 6O2' }] };

test('정상 JSON', () => expect(parseSummary(JSON.stringify(ok))).toEqual(ok));
test('```json 코드 블록으로 감싼 응답', () => expect(parseSummary('```json\n' + JSON.stringify(ok) + '\n```')).toEqual(ok));
test('앞뒤에 설명이 붙은 응답', () => expect(parseSummary('요약입니다:\n' + JSON.stringify(ok) + '\n끝')).toEqual(ok));
test('JSON이 아니면 null', () => expect(parseSummary('죄송합니다')).toBeNull());
test('oneLineSummary가 없으면 null', () => expect(parseSummary(JSON.stringify({ ...ok, oneLineSummary: '' }))).toBeNull());
test('keyConcepts가 비면 null', () => expect(parseSummary(JSON.stringify({ ...ok, keyConcepts: [] }))).toBeNull());
test('핵심 개념 7개는 앞 5개만', () => {
  const many = Array.from({ length: 7 }, (_, i) => ({ name: `개념${i}`, explanation: '설명입니다.' }));
  expect(parseSummary(JSON.stringify({ ...ok, keyConcepts: many }))!.keyConcepts).toHaveLength(5);
});
test('정의 10개는 앞 8개만', () => {
  const many = Array.from({ length: 10 }, (_, i) => ({ term: `용어${i}`, description: '뜻입니다.' }));
  expect(parseSummary(JSON.stringify({ ...ok, definitions: many }))!.definitions).toHaveLength(8);
});
test('definitions가 없으면 빈 배열', () => {
  const { definitions, ...rest } = ok;
  expect(parseSummary(JSON.stringify(rest))!.definitions).toEqual([]);
});
test('영어 결과는 null', () => expect(parseSummary(JSON.stringify({
  oneLineSummary: 'Photosynthesis converts light into chemical energy.',
  keyConcepts: [{ name: 'Chloroplast', explanation: 'Organelle where photosynthesis happens.' }],
  definitions: [] }))).toBeNull());
test('영어 용어를 괄호로 붙인 한국어는 통과', () => expect(isKorean('엽록체(Chloroplast)는 광합성(photosynthesis)이 일어나는 곳이다.')).toBe(true));
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run tests/lib/ai/parse.test.ts` / Expected: FAIL

- [ ] **Step 3: `parse.ts` 구현**

JSON 찾기: 코드 블록 표시를 걷어 내고, 첫 `{`부터 마지막 `}`까지를 `JSON.parse`한다. 각 필드는 문자열인지 확인하고 앞뒤 공백을 다듬는다. 이름이나 설명이 빈 항목은 버린다. `isKorean(s)`: 한글 음절(`가`~`힣`) 수 ≥ 영문 글자(`A-Za-z`) 수이면 `true`. 한국어 검사는 `oneLineSummary`와 모든 `keyConcepts[].explanation`을 이어 붙인 글에 적용한다. 정의·공식은 기호와 영문이 많으므로 검사하지 않는다.

- [ ] **Step 4: 통과 확인** — Expected: PASS

- [ ] **Step 5: `summarize` 실패하는 시험 작성**

가짜 `fetchImpl`이 모델 ID별로 정해 둔 응답을 돌려주게 한다. OpenRouter 응답 형태는 `{ choices: [{ message: { content: string } }] }`이다.

| 시험 이름 | 1순위 | 2순위 | 기대 |
|---|---|---|---|
| 1순위 성공 | 정상 JSON | (호출 안 됨) | `ok:true`, `model === MODELS[0]`, fetch 1회 |
| 1순위 500 → 2순위 | HTTP 500 | 정상 | `ok:true`, `model === MODELS[1]` |
| 1순위 시간 초과 → 2순위 | 응답 안 함 (`timeoutMs: 50`, signal abort까지 대기) | 정상 | `ok:true`, `model === MODELS[1]` |
| 1순위 형식 틀림 → 2순위 | `content: '죄송합니다'` | 정상 | `ok:true`, `model === MODELS[1]` |
| 1순위 영어 → 2순위 | 영어 JSON | 정상 | `ok:true`, `model === MODELS[1]` |
| 1순위 네트워크 오류 → 2순위 | fetch가 throw | 정상 | `ok:true`, `model === MODELS[1]` |
| 둘 다 실패 | HTTP 500 | 형식 틀림 | `{ ok:false, code:'AI_FAILED' }` |
| 둘 다 429 | HTTP 429 | HTTP 429 | `{ ok:false, code:'AI_RATE_LIMITED' }` |
| 하나만 429 | HTTP 429 | HTTP 500 | `{ ok:false, code:'AI_FAILED' }` |
| 요청 형태 | 정상 | — | URL이 `https://openrouter.ai/api/v1/chat/completions`, `Authorization: Bearer test-key`, 본문 `model === MODELS[0]`, `messages`에 원문 텍스트가 들어 있음 |

- [ ] **Step 6: 실패 확인** — Run: `npx vitest run tests/lib/ai/summarize.test.ts` / Expected: FAIL

- [ ] **Step 7: `prompt.ts`, `summarize.ts` 구현**

`prompt.ts`: system 메시지에 다음을 담는다. 대학생의 시험 공부와 과제 준비를 돕는 요약가라는 역할, 결과는 반드시 한국어(전문 용어는 `한국어(English)` 허용), 설계 4.2의 JSON 형태만 출력(코드 블록·설명 없이), 핵심 개념 3~5개, 정의·공식 0~8개, 공식은 글자 그대로(예: `E = mc^2`), 문서에 없는 내용을 지어내지 말 것. user 메시지에는 문서 텍스트를 넣는다.
`summarize.ts`: `MODELS`를 차례로 시도한다. 요청마다 `AbortSignal.timeout(opts.timeoutMs ?? MODEL_TIMEOUT_MS)`를 쓰고, 헤더는 `Authorization`, `Content-Type: application/json`, `X-Title: summary4pdf`다. `response_format`은 보내지 않는다(모델마다 지원이 달라 400이 날 수 있으므로 프롬프트와 `parseSummary`로 처리). `temperature: 0.3`. HTTP 오류, 네트워크 오류, 시간 초과, `parseSummary`가 `null`인 경우 모두 다음 모델로 넘어간다. 모든 모델이 429였을 때만 `AI_RATE_LIMITED`이고, 나머지는 `AI_FAILED`다. 실패 원인은 `console.warn`으로 `{ model, status 또는 'timeout'/'network'/'parse' }`만 남긴다(응답 본문·텍스트는 남기지 않는다).

- [ ] **Step 8: 통과 확인** — Run: `npx vitest run tests/lib/ai` / Expected: PASS

- [ ] **Step 9: 실제 호출 한 번 확인** (키가 있을 때만)

임시 스크립트(스크래치 폴더)로 짧은 영어 문단을 `summarize`에 넣어 결과가 한국어 JSON으로 해석되는지 본다. `node --env-file=.env`로 실행하고, 출력은 `model`과 `summary`만 찍는다. 두 모델 모두 형식을 자주 어기면 프롬프트를 다듬는다. 이 스크립트는 저장소에 넣지 않는다.

- [ ] **Step 10: 주 세션에 넘기기** — 주 세션이 검토 후 `git commit -m "feat: OpenRouter 요약 모듈과 모델 전환"`

---

### Task 4: 업로드·진행·결과 화면 (frontend-developer)

**Files:**
- Create: `src/lib/client/precheck.ts`, `src/lib/client/upload.ts`, `src/components/UploadDropzone.tsx`, `src/components/ProgressStatus.tsx`, `src/components/SummaryView.tsx`, `src/components/ErrorNotice.tsx`
- Modify: `src/app/page.tsx` (전부 교체), `src/app/layout.tsx` (`lang="ko"`, 제목 `PDF 요약`, 설명), `src/app/globals.css` (필요한 만큼)
- Test: `tests/lib/client/precheck.test.ts`, `tests/lib/client/upload.test.ts`, `tests/components/SummaryView.test.tsx`, `tests/components/UploadDropzone.test.tsx`

**Interfaces:**
- Consumes: `ApiResponse`, `ApiSuccess`, `ErrorCode`, `ERROR_MESSAGES` (`src/lib/types.ts`), `MAX_FILE_BYTES` (`src/lib/limits.ts`). 서버 계약은 `POST /api/summarize`, `multipart/form-data`, 필드 `file`, 응답 `ApiResponse`다.
- Produces:
  - `precheckFile(file: { name: string; type: string; size: number }): 'NOT_PDF' | 'FILE_TOO_LARGE' | null`
  - `postPdf(file: File, fetchImpl?: typeof fetch): Promise<ApiResponse>`. 절대 throw하지 않는다.
  - `<UploadDropzone onFile={(f: File) => void} disabled={boolean} />`
  - `<ProgressStatus stage={'uploading' | 'reading' | 'summarizing'} />`
  - `<SummaryView result={ApiSuccess} onReset={() => void} />`
  - `<ErrorNotice message={string} onRetry={() => void} />`

- [ ] **Step 1: `precheckFile` 실패하는 시험 작성**

```ts
test('정상 PDF', () => expect(precheckFile({ name: 'a.pdf', type: 'application/pdf', size: 1000 })).toBeNull());
test('정확히 4MB 허용', () => expect(precheckFile({ name: 'a.pdf', type: 'application/pdf', size: 4 * 1024 * 1024 })).toBeNull());
test('4MB 초과', () => expect(precheckFile({ name: 'a.pdf', type: 'application/pdf', size: 4 * 1024 * 1024 + 1 })).toBe('FILE_TOO_LARGE'));
test('MIME이 비어 있어도 확장자가 .pdf면 허용', () => expect(precheckFile({ name: 'a.pdf', type: '', size: 10 })).toBeNull());
test('대문자 확장자 .PDF 허용', () => expect(precheckFile({ name: 'LECTURE.PDF', type: '', size: 10 })).toBeNull());
test('docx는 NOT_PDF', () => expect(precheckFile({ name: 'a.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 10 })).toBe('NOT_PDF'));
test('PDF가 아니면서 너무 큰 파일은 NOT_PDF가 먼저', () => expect(precheckFile({ name: 'a.zip', type: 'application/zip', size: 10 * 1024 * 1024 })).toBe('NOT_PDF'));
```

규칙: `type === 'application/pdf'` 또는 이름이 `.pdf`로 끝나면(대소문자 무시) PDF로 본다. 진짜 PDF인지는 서버가 시그니처로 다시 확인한다.

- [ ] **Step 2: 실패 확인 → 구현 → 통과 확인** — Run: `npx vitest run tests/lib/client/precheck.test.ts` / Expected: FAIL 후 PASS

- [ ] **Step 3: `postPdf` 실패하는 시험 작성**

| 시험 이름 | 가짜 응답 | 기대 |
|---|---|---|
| 성공 JSON | 200, `ApiSuccess` JSON | 그대로 반환 |
| 오류 JSON | 413, `{ ok:false, code:'FILE_TOO_LARGE', message }` | 그대로 반환 |
| HTML 413 (Vercel 본문 한도) | 413, `text/html` 본문 | `{ ok:false, code:'FILE_TOO_LARGE', message: ERROR_MESSAGES.FILE_TOO_LARGE }` |
| HTML 504 (시간 초과) | 504, 텍스트 본문 | `{ ok:false, code:'AI_FAILED', ... }` |
| 그 밖의 JSON 아닌 응답 | 500, 텍스트 | `{ ok:false, code:'INTERNAL_ERROR', ... }` |
| 네트워크 오류 | fetch가 throw | `{ ok:false, code:'INTERNAL_ERROR', ... }` |
| 요청 형태 | — | `POST /api/summarize`, 본문이 `FormData`이고 `file` 필드가 있음 |

- [ ] **Step 4: 실패 확인 → 구현 → 통과 확인** — Run: `npx vitest run tests/lib/client/upload.test.ts`

- [ ] **Step 5: `SummaryView` 실패하는 시험 작성** (`// @vitest-environment jsdom`)

| 시험 이름 | 입력 | 기대 |
|---|---|---|
| 기본 표시 | 개념 3개, 정의 1개 | 파일 이름, `24쪽` 같은 페이지 수, 한 줄 요약, 개념 이름·설명 3개(번호 목록 `ol`), 정의 `용어`와 `설명` 표시 |
| 정의 없음 | `definitions: []` | `이 문서에서는 따로 정리할 정의나 공식을 찾지 못했어요` |
| 잘림 알림 | `truncated: true` | `문서가 길어서 앞부분 위주로 요약했어요` |
| 이미지 페이지 알림 | `skippedImagePages: true` | `이미지로 된 페이지는 제외하고 요약했어요` |
| 알림 없음 | 둘 다 false | 위 두 문구 없음 |
| 다시 하기 | 버튼 클릭 | `다른 PDF 요약하기` 버튼을 누르면 `onReset` 1회 호출 |

- [ ] **Step 6: 실패 확인 → `SummaryView` 구현 → 통과 확인** — Run: `npx vitest run tests/components/SummaryView.test.tsx`

- [ ] **Step 7: `UploadDropzone` 실패하는 시험 작성** (`// @vitest-environment jsdom`)

| 시험 이름 | 기대 |
|---|---|
| 안내 문구 | `PDF만, 최대 4MB`와 `올린 문서는 요약을 위해 외부 AI 서비스로 전송돼요.`가 보임 |
| 파일 선택 | 숨은 `input[type=file]`(accept=`application/pdf,.pdf`)에 파일을 넣으면 `onFile` 호출 |
| 끌어놓기 | 영역에 `drop` 이벤트(dataTransfer.files 1개)를 보내면 `onFile` 호출 |
| 키보드 | 영역이 `role="button"`, `tabIndex=0`이고 Enter로 파일 선택 창 열기(input `click` 호출)가 됨 |
| 비활성 | `disabled`일 때 drop과 Enter 모두 `onFile`이 불리지 않음 |

- [ ] **Step 8: 실패 확인 → `UploadDropzone` 구현 → 통과 확인** — Run: `npx vitest run tests/components/UploadDropzone.test.tsx`

- [ ] **Step 9: `ProgressStatus`, `ErrorNotice`, `page.tsx`, `layout.tsx` 구현**

`page.tsx`(클라이언트 컴포넌트) 상태: `idle | loading(stage) | done(ApiSuccess) | error(message)`. 파일을 받으면 `precheckFile` → 문제가 있으면 `error(ERROR_MESSAGES[code])`, 서버로 보내지 않음. 없으면 `loading('uploading')` → `postPdf` 호출. 단계 문구는 `uploading` "PDF를 올리는 중", `reading` "텍스트를 읽는 중", `summarizing` "AI가 요약하는 중"이다. 요청 시작 1초 뒤 `reading`, 4초 뒤 `summarizing`으로 바꾼다(추정 표시, 설계 4.3). 응답이 오면 타이머를 정리한다. 로딩 중에는 `UploadDropzone disabled`. 오류 화면에는 메시지와 "다시 올리기" 버튼(→ `idle`)을 둔다. `ProgressStatus`는 `role="status"`와 `aria-live="polite"`를 쓴다.
화면 위쪽: 앱 이름 "PDF 요약"과 설명 "강의 자료나 논문 PDF를 올리면 핵심을 한국어로 정리해 드려요". 결과 화면 순서는 설계 4.3을 따른다(한 줄 요약을 가장 크게). 375px 폭에서 가로 스크롤이 생기지 않게 한다.

- [ ] **Step 10: 시험·빌드 확인** — Run: `npx vitest run tests/lib/client tests/components` 그리고 `npm run lint` / Expected: PASS, lint 오류 없음

- [ ] **Step 11: 주 세션에 넘기기** — 주 세션이 검토 후 `git commit -m "feat: 업로드·진행·결과 한국어 화면"`

---

### Task 5: 연결과 전체 확인 (주 세션)

**Files:** 필요할 때만 Task 2~4의 파일을 조금 고친다.

- [ ] **Step 1: 전체 시험과 빌드** — Run: `npx vitest run` 그리고 `npm run build` / Expected: 모두 PASS, 빌드 성공
- [ ] **Step 2: 키 노출 확인** — Run: `grep -r "OPENROUTER" .next/static` / Expected: 결과 없음 (클라이언트 번들에 변수 이름조차 없어야 한다)
- [ ] **Step 3: 실제 실행 확인** — `npm run dev`(`.env`가 있으면 Next.js가 자동으로 읽는다)로 띄우고, 브라우저에서 `tests/helpers`로 만든 영어 PDF 하나를 올린다. Expected: 세 항목이 한국어로 표시된다.
- [ ] **Step 4: 커밋** (고친 것이 있을 때) — `git commit -m "fix: 연결 중 발견한 문제 수정"`

---

### Task 6: QA 시험과 수정 반복 (qa-engineer)

**Interfaces:**
- Consumes: 설계 문서 8절 시험 상황 1~16, 이 계획의 리뷰 중점 1~5

- [ ] **Step 1: 자동 시험 전체 실행과 코드 리뷰** — `npx vitest run`, `npm run lint`, `npm run build`. 설계 2절의 "실패로 보는 것" 네 가지(키 노출, 영어 결과, 빈 화면·영어 오류, 서버 저장)를 코드에서 직접 확인한다.
- [ ] **Step 2: 실제 실행 시나리오** — `npm run dev`로 띄우고 설계 8절 1~16을 확인한다. 시험용 PDF는 스크래치 폴더에 만든다(한국어 PDF, 영어 논문 형식, 4MB 초과, 이름만 .pdf인 파일, 빈 페이지 PDF, 일부 빈 페이지 PDF, 깨진 PDF, 아주 긴 PDF). 서버 직접 호출은 `curl -F "file=@경로" http://localhost:3000/api/summarize`로 한다. AI 실패 상황(10~13)은 자동 시험 결과로 확인한다. 휴대폰 폭(16)은 브라우저 375px에서 본다.
- [ ] **Step 3: 보고** — 문제마다 재현 방법, 기대/실제 결과, 담당 파일을 적는다. QA는 코드를 고치지 않는다.
- [ ] **Step 4: 수정 반복** — 주 세션이 문제를 담당 에이전트(backend-developer / ai-integration-specialist / frontend-developer)에게 넘겨 고치고 커밋한다. QA가 같은 시나리오를 다시 확인한다. 남은 문제가 없을 때까지 반복한다.

---

### Task 7: GitHub 업로드와 Vercel 안내 (주 세션)

- [ ] **Step 1: 사용자 확인** — 저장소 `summary4pdf-ch7b`를 공개로 만들지 비공개로 만들지, 그리고 `feat/pdf-summary`를 `main`에 합쳐 올려도 되는지 묻는다. 답을 받기 전에는 아무것도 만들거나 올리지 않는다.
- [ ] **Step 2: 올리기 전 점검** — `git ls-files | grep -i "\.env"` / Expected: `.env.example`만 나온다.
- [ ] **Step 3: main에 합치기** — `git switch main` → `git merge --ff-only feat/pdf-summary` (`docs/prd`의 커밋도 함께 들어간다)
- [ ] **Step 4: 저장소 만들고 푸시** — `gh repo create summary4pdf-ch7b --<public|private> --source . --remote origin --push`
- [ ] **Step 5: Vercel 연결 안내** — 사용자가 직접 할 일을 적어 준다: Vercel에서 GitHub 저장소 가져오기, 환경 변수 `OPENROUTER_API_KEY` 추가, 배포, OpenRouter 계정의 데이터 정책(무료 모델 허용) 설정 확인.
