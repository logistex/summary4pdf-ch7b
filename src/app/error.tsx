'use client'; // 오류 경계는 클라이언트 컴포넌트여야 한다.

import { ERROR_MESSAGES } from '@/lib/types';

// 화면을 그리다 예외가 나면 영어 기본 화면 대신 한국어 안내를 보여 준다.
// 오류 내용(message, stack)은 화면에 내지 않는다.
export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:py-16">
      <p role="alert" className="text-zinc-900 dark:text-zinc-100">
        {ERROR_MESSAGES.INTERNAL_ERROR}
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-4 rounded-md bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        다시 시도
      </button>
    </main>
  );
}
