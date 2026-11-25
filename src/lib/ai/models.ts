// 요약에 쓰는 모델 ID. 순서가 곧 우선순위다(1순위 -> 2순위).
// 무료 모델은 이름이 바뀌거나 사라질 수 있으므로 바꿀 때는 이 상수만 고친다.
export const MODELS = [
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'nvidia/nemotron-3.5-super-vl:free',
] as const;
