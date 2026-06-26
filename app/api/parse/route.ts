// POST /api/parse
// body: { text?: string, url?: string }
// 텍스트면 그대로, 링크면 본문을 가져와 텍스트 추출 → Claude 파싱 → { places }

import { NextRequest, NextResponse } from 'next/server';
import { parsePlaces } from '@/lib/claude';

export const runtime = 'nodejs';
export const maxDuration = 60;

// HTML에서 사람이 읽는 텍스트만 대충 뽑아냄 (제목/메타 + 구조화데이터 + 본문)
function htmlToText(html: string): string {
  const pick = (re: RegExp) => (html.match(re)?.[1] ?? '').trim();
  const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i);
  // og: / twitter: 메타는 og:title 같은 순서가 뒤바뀐 경우도 있어 양방향으로 시도
  const meta = (key: string) =>
    pick(new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i')) ||
    pick(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`, 'i'));
  const ogTitle = meta('og:title');
  const ogDesc = meta('og:description') || meta('description');
  const ogSite = meta('og:site_name');

  // 네이버/구글 등은 장소 정보를 JSON-LD(application/ld+json)에 담는 경우가 많음
  const ldBlocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1].trim())
    .filter(Boolean)
    .join('\n')
    .slice(0, 4000);

  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

  return [title, ogSite, ogTitle, ogDesc, ldBlocks, body].filter(Boolean).join('\n').slice(0, 12000);
}

async function fetchLinkText(url: string): Promise<string> {
  // 진짜 모바일 브라우저처럼 요청해야 네이버/인스타가 실제 페이지를 돌려줌
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 13; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
    },
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
        { error: '링크 내용을 가져오지 못했어요. 네이버·인스타 링크는 막혀 있는 경우가 많아요. 화면을 캡처해 사진 탭으로 올리거나, 글을 복사해 텍스트 탭에 붙여넣어 주세요.' },
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
