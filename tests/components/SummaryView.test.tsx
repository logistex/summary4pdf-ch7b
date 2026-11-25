// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import SummaryView from '@/components/SummaryView';
import type { ApiSuccess } from '@/lib/types';

afterEach(cleanup);

function make(over: Partial<ApiSuccess> = {}): ApiSuccess {
  return {
    ok: true,
    fileName: 'lecture03.pdf',
    pageCount: 24,
    truncated: false,
    skippedImagePages: false,
    summary: {
      oneLineSummary: '운영체제의 프로세스 관리를 다룬 강의예요.',
      keyConcepts: [
        { name: '프로세스', explanation: '실행 중인 프로그램' },
        { name: '스레드', explanation: '프로세스 안의 실행 흐름' },
        { name: '스케줄링', explanation: 'CPU를 나눠 쓰는 방법' },
      ],
      definitions: [{ term: '문맥 교환', description: '실행 중인 작업을 바꾸는 일' }],
    },
    ...over,
  };
}

describe('SummaryView', () => {
  test('기본 표시', () => {
    render(<SummaryView result={make()} onReset={() => {}} />);
    expect(screen.getByText('lecture03.pdf')).toBeInTheDocument();
    expect(screen.getByText(/24쪽/)).toBeInTheDocument();
    expect(screen.getByText('운영체제의 프로세스 관리를 다룬 강의예요.')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: '핵심 개념' });
    expect(list.tagName).toBe('OL');
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('프로세스')).toBeInTheDocument();
    expect(screen.getByText('프로세스 안의 실행 흐름')).toBeInTheDocument();
    expect(screen.getByText('문맥 교환')).toBeInTheDocument();
    expect(screen.getByText('실행 중인 작업을 바꾸는 일')).toBeInTheDocument();
  });

  test('정의 없음', () => {
    render(<SummaryView result={make({ summary: { ...make().summary, definitions: [] } })} onReset={() => {}} />);
    expect(screen.getByText('이 문서에서는 따로 정리할 정의나 공식을 찾지 못했어요')).toBeInTheDocument();
  });

  test('잘림 알림', () => {
    render(<SummaryView result={make({ truncated: true })} onReset={() => {}} />);
    expect(screen.getByText('문서가 길어서 앞부분 위주로 요약했어요')).toBeInTheDocument();
  });

  test('이미지 페이지 알림', () => {
    render(<SummaryView result={make({ skippedImagePages: true })} onReset={() => {}} />);
    expect(screen.getByText('이미지로 된 페이지는 제외하고 요약했어요')).toBeInTheDocument();
  });

  test('알림 없음', () => {
    render(<SummaryView result={make()} onReset={() => {}} />);
    expect(screen.queryByText('문서가 길어서 앞부분 위주로 요약했어요')).not.toBeInTheDocument();
    expect(screen.queryByText('이미지로 된 페이지는 제외하고 요약했어요')).not.toBeInTheDocument();
  });

  test('다시 하기', async () => {
    const onReset = vi.fn();
    render(<SummaryView result={make()} onReset={onReset} />);
    await userEvent.click(screen.getByRole('button', { name: '다른 PDF 요약하기' }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
