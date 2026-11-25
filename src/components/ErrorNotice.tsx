interface Props {
  message: string;
  onRetry: () => void;
}

// 오류 안내와 다시 올리기 버튼
export default function ErrorNotice({ message, onRetry }: Props) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border border-red-300 bg-red-50 p-5 dark:border-red-800 dark:bg-red-950">
      <p role="alert" className="break-words text-red-900 dark:text-red-100">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-12 rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      >
        다시 올리기
      </button>
    </div>
  );
}
