'use client';

import { useEffect, useRef, useState } from 'react';
import ErrorNotice from '@/components/ErrorNotice';
import ProgressStatus from '@/components/ProgressStatus';
import type { Stage } from '@/components/ProgressStatus';
import SummaryView from '@/components/SummaryView';
import UploadDropzone from '@/components/UploadDropzone';
import { precheckFile } from '@/lib/client/precheck';
import { postPdf } from '@/lib/client/upload';
import { ERROR_MESSAGES } from '@/lib/types';
import type { ApiSuccess } from '@/lib/types';

type State =
  | { kind: 'idle' }
  | { kind: 'loading'; stage: Stage }
  | { kind: 'done'; result: ApiSuccess }
  | { kind: 'error'; message: string };

export default function Home() {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => clearTimers, []);

  const handleFile = async (file: File) => {
    const problem = precheckFile(file);
    if (problem) {
      setState({ kind: 'error', message: ERROR_MESSAGES[problem] });
      return;
    }
    setState({ kind: 'loading', stage: 'uploading' });
    // 서버의 실제 단계를 알 수 없어 시간으로 추정해 보여 준다(설계 4.3)
    timers.current = [
      setTimeout(() => setState({ kind: 'loading', stage: 'reading' }), 1000),
      setTimeout(() => setState({ kind: 'loading', stage: 'summarizing' }), 4000),
    ];
    const res = await postPdf(file);
    clearTimers();
    setState(res.ok ? { kind: 'done', result: res } : { kind: 'error', message: res.message });
  };

  const reset = () => setState({ kind: 'idle' });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:py-16">
      <h1 className="text-3xl font-bold">PDF 요약</h1>
      <p className="mt-2 text-zinc-700 dark:text-zinc-300">
        강의 자료나 논문 PDF를 올리면 핵심을 한국어로 정리해 드려요
      </p>

      <div className="mt-8">
        {state.kind === 'done' ? (
          <SummaryView result={state.result} onReset={reset} />
        ) : (
          <div className="flex flex-col gap-6">
            {state.kind === 'error' && <ErrorNotice message={state.message} onRetry={reset} />}
            <UploadDropzone onFile={handleFile} disabled={state.kind === 'loading'} />
            {state.kind === 'loading' && <ProgressStatus stage={state.stage} />}
          </div>
        )}
      </div>
    </main>
  );
}
