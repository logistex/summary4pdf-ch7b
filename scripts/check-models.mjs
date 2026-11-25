// 두 OpenRouter 모델이 실제로 호출되는지 한 번씩 확인한다.
// 실행: node --env-file=.env scripts/check-models.mjs
// 키 값과 요청 헤더는 출력하지 않는다.

// src/lib/ai/models.ts와 같은 값을 유지할 것(모델을 바꾸면 함께 고친다).
const MODELS = [
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'nvidia/nemotron-3.5-super-vl:free',
];

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.log('OPENROUTER_API_KEY가 설정되지 않았어요');
  process.exit(1);
}

let failed = false;
for (const model of MODELS) {
  const started = Date.now();
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: "한국어로 '안녕'이라고만 답해" }],
      }),
      signal: AbortSignal.timeout(90000),
    });
    const sec = ((Date.now() - started) / 1000).toFixed(1);
    const body = await res.text();
    if (!res.ok) {
      failed = true;
      console.log(`${model}: 실패 (HTTP ${res.status}, ${body.slice(0, 200)})`);
      continue;
    }
    const content = JSON.parse(body)?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim() === '') {
      failed = true;
      console.log(`${model}: 실패 (빈 응답, ${body.slice(0, 200)})`);
      continue;
    }
    console.log(`${model}: OK (${sec}초)`);
  } catch (err) {
    failed = true;
    console.log(`${model}: 실패 (${err instanceof Error ? err.name + ': ' + err.message : String(err)})`);
  }
}
process.exitCode = failed ? 1 : 0;
