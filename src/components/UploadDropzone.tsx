'use client';

import { useRef, useState } from 'react';
import type { DragEvent, KeyboardEvent } from 'react';

interface Props {
  onFile: (file: File) => void;
  disabled: boolean;
}

// 끌어다 놓거나 눌러서 PDF를 고르는 영역. 키보드(Enter, Space)로도 열 수 있다.
export default function UploadDropzone({ onFile, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPicker();
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setDragging(true);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label="PDF 파일 선택. 파일을 끌어다 놓을 수도 있어요"
        onClick={openPicker}
        onKeyDown={onKeyDown}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={() => setDragging(false)}
        className={`flex min-h-56 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-4 py-10 text-center focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
          disabled
            ? 'cursor-not-allowed border-zinc-300 bg-zinc-100 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900'
            : dragging
              ? 'cursor-pointer border-blue-700 bg-blue-50 dark:bg-blue-950'
              : 'cursor-pointer border-zinc-400 hover:border-blue-700 hover:bg-blue-50 dark:border-zinc-600 dark:hover:bg-blue-950'
        }`}
      >
        <p className="text-lg font-semibold">PDF를 여기에 끌어다 놓으세요</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">또는 눌러서 파일 고르기</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ''; // 같은 파일을 다시 골라도 반응하도록 비운다
          if (file) onFile(file);
        }}
      />
      <p className="text-sm font-medium">PDF만, 최대 4MB</p>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">올린 문서는 요약을 위해 외부 AI 서비스로 전송돼요.</p>
    </div>
  );
}
