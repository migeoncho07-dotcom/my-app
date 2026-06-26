// POST /api/parse
// body: { text?: string, url?: string }
// 텍스트면 그대로, 링크면 본문을 가져와 텍스트 추출 → Claude 파싱 → { places }

import { NextRequest, NextResponse } from 'next/server';
import { parsePlaces } from '@/lib/claude';

export const runtime = 'nodejs';
export const maxDuration = 60;

// HTML에서 사람이 읽는 텍스트만 대충 뽑아냄 (제목/메타 + 본문)
function htmlToText(html: string): string {
  const pick = (re: RegExp) => (html.match(re)?.[1] ?? '').trim();
  const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const ogTitle = pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const desc = pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  const ogDesc = pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);

  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

  return [title, ogTitle, desc, ogDesc, body].filter(Boolean).join('\n').slice(0, 12000);
}

async function fetchLinkText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; airang/1.0)' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error('fetch-failed');
  const html = await res.text();
  return htmlToText(html);
}

export async function POST(req: NextRequest) {
  let body: { text?: string; url?: string; image?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청이에요.' }, { status: 400 });
  }

  let text = (body.text ?? '').trim();
  const url = (body.url ?? '').trim();
  const image = (body.image ?? '').trim();

  // 이미지(사진/스크린샷) 파싱
  if (image) {
    const m = image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!m) {
      return NextResponse.json({ error: '이미지를 읽지 못했어요.' }, { status: 400 });
    }
    try {
      const places = await parsePlaces({ image: { mediaType: m[1], data: m[2] } });
      return NextResponse.json({ places });
    } catch {
      return NextResponse.json({ error: 'AI 정리 중 문제가 생겼어요.' }, { status: 502 });
    }
  }

  // 링크면 본문 가져오기
  if (!text && url) {
    try {
      text = await fetchLinkText(url);
    } catch {
      return NextResponse.json(
        { error: '링크를 읽지 못했어요. 내용을 복사해서 텍스트로 붙여넣어 주세요.' },
        { status: 422 }
      );
    }
  }

  if (!text) {
    return NextResponse.json({ error: '내용을 입력해 주세요.' }, { status: 400 });
  }

  try {
    const places = await parsePlaces({ text });
    return NextResponse.json({ places });
  } catch (e: any) {
    const msg = String(e?.message || '');
    const status = msg.includes('ANTHROPIC_API_KEY') ? 500 : 502;
    return NextResponse.json(
      { error: 'AI 정리 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.' },
      { status }
    );
  }
}
