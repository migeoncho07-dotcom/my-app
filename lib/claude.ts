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

const SYSTEM = `한국어 글에서 '아이와 갈 만한 장소' 이름을 빠짐없이 추출해. 짧거나 캐주얼한 글이어도 고유한 장소 이름(롯데월드, 에버랜드, 뚝섬한강공원, 브릭캠퍼스, ○○키즈카페 등)이 하나라도 보이면 반드시 넣는다. 정말 장소 이름이 하나도 없을 때만 빈 배열.
category: kids_cafe(키즈카페/실내놀이) · hotel(호텔/펜션/리조트) · outdoor(공원/한강공원/숲/동물원/놀이공원/테마파크/워터파크/농장/체험원) · performance(공연/전시/박물관/과학관/아쿠아리움) · restaurant(음식점/카페) · etc(기타). 애매하면 가장 가까운 것, 그래도 모르면 etc.
필드: title(검색 가능한 정식명, 지역어/수식어 제거 — 예 "잠실 롯데월드"→"롯데월드") · region(시/도 구/군, 없으면 "") · address_hint(장소명+동네) · date_range(기간 없으면 null) · age_target(대상연령 없으면 null) · memo(한 줄, 없으면 null) · confidence(0~1). 여러 곳이면 모두 추출. 반드시 제공된 JSON 스키마 형식으로만.`;

export async function parsePlaces(input: {
  text?: string;
  image?: { data: string; mediaType: string };
}): Promise<ParsedPlace[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY 가 설정되지 않았습니다.');

  const client = new Anthropic({ apiKey });

  // 텍스트면 문자열, 이미지면 이미지+안내문 블록
  const userContent = input.image
    ? [
        { type: 'image', source: { type: 'base64', media_type: input.image.mediaType, data: input.image.data } },
        { type: 'text', text: '이 이미지(스크린샷/사진)에서 장소 정보를 추출해줘.' },
      ]
    : (input.text ?? '').slice(0, 12000);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM,
    output_config: { format: { type: 'json_schema', schema: PLACE_SCHEMA } },
    messages: [{ role: 'user', content: userContent }],
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
