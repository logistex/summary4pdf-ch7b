export type Stage = 'uploading' | 'reading' | 'summarizing';

const LABELS: Record<Stage, string> = {
  uploading: 'PDF를 올리는 중',
  reading: '텍스트를 읽는 중',
  summarizing: 'AI가 요약하는 중',
};

// 요약하는 동안 지금 단계를 문장으로 알려 준다. 스크린 리더에도 읽힌다.
export default function ProgressStatus({ stage }: { stage: Stage }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center gap-3 py-6">
      <span
        aria-hidden="true"
        className="size-5 shrink-0 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-700"
      />
      <span className="text-lg font-medium">{LABELS[stage]}</span>
    </div>
  );
}
