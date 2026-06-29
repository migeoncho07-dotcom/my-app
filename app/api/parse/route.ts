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

const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 13; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

async function fetchHtml(url: string): Promise<{ html: string; finalUrl: string; ok: boolean }> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': MOBILE_UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
    },
    redirect: 'follow',
  });
  const html = await res.text();
  return { html, finalUrl: res.url || url, ok: res.ok };
}

// 네이버 단축링크(naver.me) 등은 HTTP 리다이렉트가 아니라 meta/JS로 페이지를 넘기는
// 경우가 있어, HTML 안의 다음 주소를 찾아 직접 따라감.
function clientRedirect(html: string): string | null {
  const meta = html.match(/<meta[^>]+http-equiv=["']?refresh["']?[^>]*content=["'][^"']*url=([^"'>]+)/i);
  if (meta) return meta[1].replace(/&amp;/g, '&').trim();
  const js = html.match(/(?:location\.(?:href|replace)\s*=\s*|location\.replace\(\s*)["']([^"']+)["']/i);
  if (js) return js[1].replace(/&amp;/g, '&').trim();
  return null;
}

function naverPlaceId(url: string): string | null {
  const m = url.match(/(?:entry\/place|place|restaurant|hairshop|attraction)\/(\d{5,})/) || url.match(/[?&]id=(\d{5,})/);
  return m ? m[1] : null;
}

// 네이버 장소 페이지에 박혀 있는 이름/주소/좌표를 best-effort로 뽑아냄
function extractNaverInfo(html: string): string {
  const g = (re: RegExp) => html.match(re)?.[1] ?? '';
  const name = g(/"name"\s*:\s*"([^"]{1,80})"/);
  const road = g(/"roadAddress"\s*:\s*"([^"]{1,120})"/);
  const addr = g(/"address"\s*:\s*"([^"]{1,120})"/);
  const y = g(/"y"\s*:\s*"?(3[0-9]\.\d{3,})"?/) || g(/"latitude"\s*:\s*"?(3[0-9]\.\d{3,})"?/);
  const x = g(/"x"\s*:\s*"?(1[0-9]{2}\.\d{3,})"?/) || g(/"longitude"\s*:\s*"?(1[0-9]{2}\.\d{3,})"?/);
  const lines: string[] = [];
  if (name) lines.push(`장소명: ${name}`);
  if (road || addr) lines.push(`주소: ${road || addr}`);
  if (x && y) lines.push(`좌표(위도,경도): ${y},${x}`);
  return lines.join('\n');
}

async function fetchLinkText(url: string): Promise<string> {
  // meta/JS 리다이렉트까지 최대 4번 따라가서 진짜 페이지에 도달
  let cur = url;
  let html = '';
  let finalUrl = url;
  for (let hop = 0; hop < 4; hop++) {
    const r = await fetchHtml(cur);
    html = r.html;
    finalUrl = r.finalUrl;
    if (!r.ok && !html) throw new Error('fetch-failed');
    const next = clientRedirect(html);
    if (next && hop < 3) {
      try {
        cur = new URL(next, finalUrl).toString();
        continue;
      } catch {
        break;
      }
    }
    break;
  }

  // 네이버 장소면, 정보가 더 많은 모바일 장소 페이지(m.place.naver.com)에서 보강
  let naverExtra = '';
  if (/naver\./.test(finalUrl)) {
    naverExtra = extractNaverInfo(html);
    const pid = naverPlaceId(finalUrl);
    if (!naverExtra && pid) {
      try {
        const r2 = await fetchHtml(`https://m.place.naver.com/place/${pid}/home`);
        naverExtra = extractNaverInfo(r2.html);
        if (!html.trim()) html = r2.html;
      } catch {
        /* 무시 */
      }
    }
  }

  const combined = [naverExtra, htmlToText(html)].filter(Boolean).join('\n').slice(0, 12000);
  if (!combined.trim()) throw new Error('empty');
  return combined;
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
