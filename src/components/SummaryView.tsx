import type { ApiSuccess } from '@/lib/types';

interface Props {
  result: ApiSuccess;
  onReset: () => void;
}

// 결과 화면: 파일 정보, 알림, 한 줄 요약, 핵심 개념, 정의·공식, 다시 하기 버튼
export default function SummaryView({ result, onReset }: Props) {
  const { fileName, pageCount, truncated, skippedImagePages, summary } = result;

  return (
    <article className="flex flex-col gap-8">
      <header>
        <h2 className="break-words text-base font-medium text-zinc-600 dark:text-zinc-400">
          <span className="text-zinc-900 dark:text-zinc-100">{fileName}</span>
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{pageCount}쪽</p>
      </header>

      {(truncated || skippedImagePages) && (
        <div className="flex flex-col gap-2">
          {truncated && (
            <p className="rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">
              문서가 길어서 앞부분 위주로 요약했어요
            </p>
          )}
          {skippedImagePages && (
            <p className="rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">
              이미지로 된 페이지는 제외하고 요약했어요
            </p>
          )}
        </div>
      )}

      <section aria-labelledby="sec-summary">
        <h3 id="sec-summary" className="text-sm font-semibold text-blue-700 dark:text-blue-300">
          한 줄 요약
        </h3>
        <p className="mt-2 break-words text-2xl font-bold leading-snug sm:text-3xl">{summary.oneLineSummary}</p>
      </section>

      <section aria-labelledby="sec-concepts">
        <h3 id="sec-concepts" className="text-lg font-semibold">
          핵심 개념
        </h3>
        <ol aria-label="핵심 개념" className="mt-3 list-decimal space-y-4 pl-6">
          {summary.keyConcepts.map((c, i) => (
            <li key={i} className="break-words">
              <p className="font-semibold">{c.name}</p>
              <p className="mt-1 text-zinc-700 dark:text-zinc-300">{c.explanation}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="sec-defs">
        <h3 id="sec-defs" className="text-lg font-semibold">
          정의·공식
        </h3>
        {summary.definitions.length === 0 ? (
          <p className="mt-3 text-zinc-700 dark:text-zinc-300">
            이 문서에서는 따로 정리할 정의나 공식을 찾지 못했어요
          </p>
        ) : (
          <dl className="mt-3 space-y-4">
            {summary.definitions.map((d, i) => (
              <div key={i} className="break-words">
                <dt className="font-semibold">{d.term}</dt>
                <dd className="mt-1 text-zinc-700 dark:text-zinc-300">{d.description}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <button
        type="button"
        onClick={onReset}
        className="min-h-12 self-stretch rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:self-start"
      >
        다른 PDF 요약하기
      </button>
    </article>
  );
}
