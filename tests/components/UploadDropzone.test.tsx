// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import UploadDropzone from '@/components/UploadDropzone';

afterEach(cleanup);

const pdf = () => new File(['%PDF-1.4'], 'a.pdf', { type: 'application/pdf' });

function setup(disabled = false) {
  const onFile = vi.fn();
  const { container } = render(<UploadDropzone onFile={onFile} disabled={disabled} />);
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  const zone = screen.getByRole('button');
  return { onFile, input, zone };
}

describe('UploadDropzone', () => {
  test('안내 문구', () => {
    setup();
    expect(screen.getByText('PDF만, 최대 4MB')).toBeInTheDocument();
    expect(screen.getByText('올린 문서는 요약을 위해 외부 AI 서비스로 전송돼요.')).toBeInTheDocument();
  });

  test('파일 선택', async () => {
    const { onFile, input } = setup();
    expect(input).toHaveAttribute('accept', 'application/pdf,.pdf');
    const f = pdf();
    await userEvent.upload(input, f);
    expect(onFile).toHaveBeenCalledWith(f);
  });

  test('끌어놓기', () => {
    const { onFile, zone } = setup();
    const f = pdf();
    fireEvent.drop(zone, { dataTransfer: { files: [f] } });
    expect(onFile).toHaveBeenCalledWith(f);
  });

  test('키보드', async () => {
    const { input, zone } = setup();
    expect(zone).toHaveAttribute('tabindex', '0');
    const click = vi.spyOn(input, 'click');
    zone.focus();
    await userEvent.keyboard('{Enter}');
    expect(click).toHaveBeenCalledTimes(1);
  });

  test('비활성', async () => {
    const { onFile, input, zone } = setup(true);
    fireEvent.drop(zone, { dataTransfer: { files: [pdf()] } });
    const click = vi.spyOn(input, 'click');
    zone.focus();
    fireEvent.keyDown(zone, { key: 'Enter' });
    expect(onFile).not.toHaveBeenCalled();
    expect(click).not.toHaveBeenCalled();
    expect(zone).toHaveAttribute('aria-disabled', 'true');
  });
});
