import { describe, expect, test } from 'vitest';
import { isKorean, parseSummary } from '@/lib/ai/parse';

const ok = {
  oneLineSummary: '광합성은 빛 에너지를 화학 에너지로 바꾸는 과정이다.',
  keyConcepts: [
    { name: '엽록체', explanation: '광합성이 일어나는 세포 기관이다.' },
    { name: '명반응', explanation: '빛을 써서 ATP를 만든다.' },
    { name: '암반응', explanation: '이산화탄소를 고정한다.' },
  ],
  definitions: [{ term: '광합성 식', description: '6CO2 + 6H2O → C6H12O6 + 6O2' }],
};

describe('parseSummary', () => {
  test('정상 JSON', () => expect(parseSummary(JSON.stringify(ok))).toEqual(ok));
  test('```json 코드 블록으로 감싼 응답', () =>
    expect(parseSummary('```json\n' + JSON.stringify(ok) + '\n```')).toEqual(ok));
  test('앞뒤에 설명이 붙은 응답', () =>
    expect(parseSummary('요약입니다:\n' + JSON.stringify(ok) + '\n끝')).toEqual(ok));
  test('JSON이 아니면 null', () => expect(parseSummary('죄송합니다')).toBeNull());
  test('깨진 JSON이면 null', () => expect(parseSummary('{ "oneLineSummary": ')).toBeNull());
  test('oneLineSummary가 없으면 null', () =>
    expect(parseSummary(JSON.stringify({ ...ok, oneLineSummary: '' }))).toBeNull());
  test('keyConcepts가 비면 null', () =>
    expect(parseSummary(JSON.stringify({ ...ok, keyConcepts: [] }))).toBeNull());
  test('이름이 빈 핵심 개념은 버린다', () => {
    const r = parseSummary(
      JSON.stringify({
        ...ok,
        keyConcepts: [{ name: ' ', explanation: '설명입니다.' }, ok.keyConcepts[0]],
      }),
    );
    expect(r!.keyConcepts).toEqual([ok.keyConcepts[0]]);
  });
  test('핵심 개념 7개는 앞 5개만', () => {
    const many = Array.from({ length: 7 }, (_, i) => ({ name: `개념${i}`, explanation: '설명입니다.' }));
    expect(parseSummary(JSON.stringify({ ...ok, keyConcepts: many }))!.keyConcepts).toHaveLength(5);
  });
  test('정의 10개는 앞 8개만', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ term: `용어${i}`, description: '뜻입니다.' }));
    expect(parseSummary(JSON.stringify({ ...ok, definitions: many }))!.definitions).toHaveLength(8);
  });
  test('definitions가 없으면 빈 배열', () => {
    const { definitions: _definitions, ...rest } = ok;
    void _definitions;
    expect(parseSummary(JSON.stringify(rest))!.definitions).toEqual([]);
  });
  test('영어 결과는 null', () =>
    expect(
      parseSummary(
        JSON.stringify({
          oneLineSummary: 'Photosynthesis converts light into chemical energy.',
          keyConcepts: [{ name: 'Chloroplast', explanation: 'Organelle where photosynthesis happens.' }],
          definitions: [],
        }),
      ),
    ).toBeNull());
  test('<think> 블록이 먼저 나오는 응답', () =>
    expect(parseSummary('<think>{"draft":1} 생각…</think>\n' + JSON.stringify(ok))).toEqual(ok));
  test('여러 줄·대소문자가 섞인 <THINK> 블록', () =>
    expect(parseSummary('<THINK>\n{ 메모 }\n</THINK>\n' + JSON.stringify(ok))).toEqual(ok));
});

describe('isKorean', () => {
  test('영어 용어를 괄호로 붙인 한국어는 통과', () =>
    expect(isKorean('엽록체(Chloroplast)는 광합성(photosynthesis)이 일어나는 곳이다.')).toBe(true));
  test('영어만 있으면 false', () => expect(isKorean('Hello world')).toBe(false));
  test('영어 용어를 섞은 정상 한국어 요약은 통과', () =>
    expect(
      isKorean(
        '이 논문은 Transformer 구조를 제안하며 RNN 없이 self-attention만으로 문장 안의 관계를 학습하고 positional encoding으로 sequence 순서를 표현한다.',
      ),
    ).toBe(true));
  test('영어 문장은 false', () =>
    expect(isKorean('Photosynthesis converts light energy into chemical energy in plants.')).toBe(false));
  test('빈 문자열은 false', () => expect(isKorean('')).toBe(false));
  test('한글·영문이 모두 없는 글은 false', () => expect(isKorean('123 + 456 = 579')).toBe(false));
  test('영어 문장 전체가 괄호 안이면 false', () =>
    expect(isKorean('(Photosynthesis converts light energy into chemical energy.)')).toBe(false));
});
