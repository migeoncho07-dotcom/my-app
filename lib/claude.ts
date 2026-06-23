// 서버 전용 — Claude로 텍스트에서 장소 정보를 뽑아냅니다.
// 모델: claude-haiku-4-5 (저렴/빠름, 추출 작업에 적합)

import Anthropic from '@anthropic-ai/sdk';
import type { ParsedPlace } from '@/types';

const MODEL = 'claude-haiku-4-5';

// 구조화 출력 스키마 (additionalProperties:false 필수)
const PLACE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    places: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          category: {
            type: 'string',
            enum: ['kids_cafe', 'hotel', 'outdoor', 'performance', 'restaurant', 'etc'],
          },
          region: { type: 'string' },
          address_hint: { type: 'string' },
          date_range: { type: ['string', 'null'] },
          age_target: { type: ['string', 'null'] },
          memo: { type: ['string', 'null'] },
          confidence: { type: 'number' },
        },
        required: [
          'title',
          'category',
          'region',
          'address_hint',
          'date_range',
          'age_target',
          'memo',
          'confidence',
        ],
      },
    },
  },
  required: ['places'],
} as const;

const SYSTEM = `너는 한국의 '아이와 함께 갈 만한 장소' 정보를 텍스트에서 뽑아내는 추출기야.
사용자가 붙여넣은 글(블로그, SNS, 안내문 등)에서 장소를 찾아 구조화해.

규칙:
- 한 글에 여러 장소가 있으면 모두 추출한다.
- category는 반드시 다음 중 하나: kids_cafe(키즈카페/실내놀이), hotel(호텔/펜션/리조트), outdoor(공원/숲/체험원 등 야외), performance(공연/전시/박물관), restaurant(음식점/카페), etc(기타).
- region: "서울 강남", "경기 양평"처럼 시/도 + 구/군 수준으로. 모르면 빈 문자열.
- address_hint: 주소를 찾는 데 쓸 힌트(장소명+동네). 정확한 주소를 모르면 장소명만이라도.
- date_range: 운영기간/행사기간이 있으면 "2025.07.01~07.31" 형식, 없으면 null.
- age_target: 대상 연령("3~7세", "전 연령" 등)이 있으면, 없으면 null.
- memo: 핵심 특징 한두 줄 요약, 없으면 null.
- confidence: 추출 신뢰도 0~1.
- 장소가 전혀 없으면 places는 빈 배열로.
- 반드시 제공된 JSON 스키마 형식으로만 답한다.`;

export async function parsePlaces(text: string): Promise<ParsedPlace[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY 가 설정되지 않았습니다.');

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM,
    output_config: { format: { type: 'json_schema', schema: PLACE_SCHEMA } },
    messages: [{ role: 'user', content: text.slice(0, 12000) }],
  } as any);

  // 구조화 출력 → 텍스트 블록의 JSON 파싱
  const textBlock = response.content.find((b: any) => b.type === 'text') as
    | { type: 'text'; text: string }
    | undefined;
  if (!textBlock) return [];

  try {
    const parsed = JSON.parse(textBlock.text) as { places?: ParsedPlace[] };
    return Array.isArray(parsed.places) ? parsed.places : [];
  } catch {
    return [];
  }
}
