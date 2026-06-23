'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { parseInput, searchKakao } from '@/lib/parse-client';
import { savePlaceApi } from '@/lib/group-client';
import { category } from '@/styles/tokens';
import Button from '@/components/ui/Button';
import type { ParsedPlace, Category, KakaoPlace } from '@/types';

type Step = 'input' | 'loading' | 'review';

interface EditablePlace extends ParsedPlace {
  include: boolean;
  address: string;
  lat: number;
  lng: number;
  kakao_place_id: string;
}

const CATS = Object.keys(category) as Category[];

export default function AddPage() {
  const router = useRouter();
  const { firebaseUser, profile } = useAuth();

  const [step, setStep] = useState<Step>('input');
  const [tab, setTab] = useState<'text' | 'link'>('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [items, setItems] = useState<EditablePlace[]>([]);
  const [saving, setSaving] = useState(false);

  async function handleParse() {
    setError('');
    const payload = tab === 'text' ? { text } : { url };
    if (tab === 'text' && !text.trim()) return setError('내용을 붙여넣어 주세요.');
    if (tab === 'link' && !url.trim()) return setError('링크를 입력해 주세요.');

    setStep('loading');
    try {
      const places = await parseInput(payload);
      if (places.length === 0) {
        setError('장소를 찾지 못했어요. 내용을 더 자세히 붙여넣어 보세요.');
        setStep('input');
        return;
      }
      // 제목+지역으로 카카오 주소를 자동 검색해 미리 채움 (여러 곳 병렬)
      const enriched = await Promise.all(
        places.map(async (p): Promise<EditablePlace> => {
          let address = '';
          let lat = 0;
          let lng = 0;
          let kakao_place_id = '';
          let region = p.region;
          try {
            const cands = await searchKakao(p.title, p.region);
            if (cands.length > 0) {
              const k = cands[0];
              address = k.road_address_name || k.address_name;
              lat = parseFloat(k.y) || 0;
              lng = parseFloat(k.x) || 0;
              kakao_place_id = k.id;
              // 지역이 비어 있으면 주소 앞부분(시/도 구/군)으로 채움
              if (!region && k.address_name) {
                region = k.address_name.split(' ').slice(0, 2).join(' ');
              }
            }
          } catch {
            /* 주소 자동검색 실패 시 그냥 빈 값으로 — 사용자가 직접 찾기 가능 */
          }
          return { ...p, region, include: true, address, lat, lng, kakao_place_id };
        })
      );
      setItems(enriched);
      setStep('review');
    } catch (e: any) {
      setError(e?.message || 'AI 정리에 실패했어요.');
      setStep('input');
    }
  }

  function update(i: number, patch: Partial<EditablePlace>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  async function handleSave() {
    if (!firebaseUser) return;
    const chosen = items.filter((it) => it.include);
    if (chosen.length === 0) return setError('저장할 장소를 한 개 이상 골라주세요.');

    setError('');
    setSaving(true);
    try {
      const sourceText = tab === 'text' ? text : url;
      for (const it of chosen) {
        await savePlaceApi({
          title: it.title,
          category: it.category,
          region: it.region,
          address: it.address,
          lat: it.lat,
          lng: it.lng,
          date_range: it.date_range ?? '',
          age_target: it.age_target ?? '',
          memo: it.memo ?? '',
          source_text: sourceText.slice(0, 2000),
          ai_confidence: it.confidence,
          kakao_place_id: it.kakao_place_id,
        });
      }
      router.push('/home');
    } catch {
      setError('저장 중 문제가 생겼어요. 다시 시도해 주세요.');
      setSaving(false);
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '60px 20px 0' }}>
      <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.03em' }}>장소 추가</div>

      {step === 'input' && (
        <InputStep
          tab={tab}
          setTab={setTab}
          text={text}
          setText={setText}
          url={url}
          setUrl={setUrl}
          error={error}
          onParse={handleParse}
        />
      )}

      {step === 'loading' && <LoadingStep />}

      {step === 'review' && (
        <ReviewStep
          items={items}
          update={update}
          error={error}
          saving={saving}
          onSave={handleSave}
          onBack={() => { setStep('input'); setError(''); }}
        />
      )}
    </div>
  );
}

/* ── 단계 1: 입력 ── */
function InputStep({
  tab, setTab, text, setText, url, setUrl, error, onParse,
}: {
  tab: 'text' | 'link';
  setTab: (t: 'text' | 'link') => void;
  text: string;
  setText: (v: string) => void;
  url: string;
  setUrl: (v: string) => void;
  error: string;
  onParse: () => void;
}) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginTop: 18 }}>
      <div style={{ fontSize: 13.5, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 16, lineHeight: 1.5 }}>
        블로그·SNS 글을 붙여넣거나 링크를 넣으면<br />AI가 장소 정보를 자동으로 정리해줘요.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 2, background: 'var(--ios-material)', borderRadius: 10, padding: 2, marginBottom: 16 }}>
        {(['text', 'link'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: tab === t ? 700 : 500,
              color: tab === t ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: tab === t ? '#fff' : 'transparent',
              boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,.12)' : 'none',
            }}
          >
            {t === 'text' ? '텍스트 붙여넣기' : '링크'}
          </button>
        ))}
      </div>

      {tab === 'text' ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="장소 정보가 담긴 글을 붙여넣어 주세요"
          style={{
            width: '100%',
            minHeight: 200,
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 15,
            padding: 16,
            fontSize: 14.5,
            fontWeight: 500,
            lineHeight: 1.6,
            resize: 'vertical',
          }}
        />
      ) : (
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          inputMode="url"
          placeholder="https://..."
          style={{
            width: '100%',
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 15,
            padding: '15px 16px',
            fontSize: 15,
            fontWeight: 500,
          }}
        />
      )}

      {error && <div style={{ color: 'var(--brand-strong)', fontSize: 13, fontWeight: 600, marginTop: 12 }}>{error}</div>}

      <div style={{ marginTop: 'auto', paddingTop: 24, paddingBottom: 24 }}>
        <Button onClick={onParse}>✨ AI로 정리하기</Button>
      </div>
    </div>
  );
}

/* ── 단계 2: 로딩 ── */
function LoadingStep() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, paddingBottom: 60 }}>
      <div className="airang-spin" style={{ fontSize: 44 }}>✨</div>
      <div style={{ fontSize: 16, fontWeight: 700 }}>AI가 정리하고 있어요…</div>
      <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>잠시만 기다려 주세요</div>
      <style>{`
        @keyframes airang-spin-kf { 0%{transform:scale(1) rotate(0)} 50%{transform:scale(1.25) rotate(12deg)} 100%{transform:scale(1) rotate(0)} }
        .airang-spin { animation: airang-spin-kf 1.1s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

/* ── 단계 3: 골라담기 + 편집 ── */
function ReviewStep({
  items, update, error, saving, onSave, onBack,
}: {
  items: EditablePlace[];
  update: (i: number, patch: Partial<EditablePlace>) => void;
  error: string;
  saving: boolean;
  onSave: () => void;
  onBack: () => void;
}) {
  const chosenCount = items.filter((it) => it.include).length;
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginTop: 16 }}>
      <div style={{ fontSize: 13.5, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 14 }}>
        {items.length}곳을 찾았어요. 확인·수정하고 저장하세요.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 16 }}>
        {items.map((it, i) => (
          <PlaceEditCard key={i} item={it} onChange={(patch) => update(i, patch)} />
        ))}
      </div>

      {error && <div style={{ color: 'var(--brand-strong)', fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 24 }}>
        <Button onClick={onSave} disabled={saving || chosenCount === 0}>
          {saving ? '저장하는 중…' : `${chosenCount}곳 저장하기`}
        </Button>
        <button onClick={onBack} style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-tertiary)', padding: 8 }}>
          다시 입력
        </button>
      </div>
    </div>
  );
}

function PlaceEditCard({
  item, onChange,
}: {
  item: EditablePlace;
  onChange: (patch: Partial<EditablePlace>) => void;
}) {
  const [candidates, setCandidates] = useState<KakaoPlace[] | null>(null);
  const [searching, setSearching] = useState(false);

  async function findAddress() {
    setSearching(true);
    try {
      const res = await searchKakao(item.title, item.region);
      setCandidates(res);
    } catch {
      setCandidates([]);
    } finally {
      setSearching(false);
    }
  }

  function pick(k: KakaoPlace) {
    onChange({
      address: k.road_address_name || k.address_name,
      lat: parseFloat(k.y),
      lng: parseFloat(k.x),
      kakao_place_id: k.id,
    });
    setCandidates(null);
  }

  const fieldStyle: React.CSSProperties = {
    flex: 1,
    width: '100%',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-light)',
    borderRadius: 10,
    padding: '9px 11px',
    fontSize: 13.5,
    fontWeight: 500,
  };

  return (
    <div
      style={{
        background: '#fff',
        border: item.include ? '1.5px solid var(--brand)' : '1px solid var(--border)',
        borderRadius: 18,
        padding: 14,
        opacity: item.include ? 1 : 0.6,
        transition: 'border-color .15s, opacity .15s',
      }}
    >
      {/* 헤더: 포함 체크 + 제목 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <button
          onClick={() => onChange({ include: !item.include })}
          aria-label="담기"
          style={{
            width: 24,
            height: 24,
            borderRadius: 7,
            flex: 'none',
            background: item.include ? 'var(--brand)' : 'var(--ios-material)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 800,
          }}
        >
          {item.include ? '✓' : ''}
        </button>
        <input
          value={item.title}
          onChange={(e) => onChange({ title: e.target.value })}
          style={{ flex: 1, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}
        />
      </div>

      {/* 카테고리 칩 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {CATS.map((c) => {
          const active = item.category === c;
          return (
            <button
              key={c}
              onClick={() => onChange({ category: c })}
              style={{
                borderRadius: 8,
                padding: '5px 9px',
                fontSize: 11.5,
                fontWeight: 700,
                background: active ? category[c].bg : 'var(--ios-material)',
                color: active ? category[c].text : 'var(--text-tertiary)',
              }}
            >
              {category[c].emoji} {category[c].label}
            </button>
          );
        })}
      </div>

      {/* 필드들 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Row label="지역">
          <input value={item.region} onChange={(e) => onChange({ region: e.target.value })} placeholder="예: 서울 강남" style={fieldStyle} />
        </Row>
        <Row label="주소">
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={item.address} onChange={(e) => onChange({ address: e.target.value })} placeholder="주소 찾기를 눌러보세요" style={{ ...fieldStyle, flex: 1 }} />
              <button
                onClick={findAddress}
                disabled={searching}
                style={{ flex: 'none', borderRadius: 10, padding: '0 12px', fontSize: 12.5, fontWeight: 700, background: 'var(--ios-material)', color: 'var(--text-secondary)' }}
              >
                {searching ? '…' : '📍 찾기'}
              </button>
            </div>
            {candidates && (
              <div style={{ marginTop: 6, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                {candidates.length === 0 ? (
                  <div style={{ padding: 10, fontSize: 12.5, color: 'var(--text-tertiary)' }}>검색 결과가 없어요. 직접 입력해 주세요.</div>
                ) : (
                  candidates.map((k) => (
                    <button
                      key={k.id}
                      onClick={() => pick(k)}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 11px', borderBottom: '1px solid var(--border-light)', background: '#fff' }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{k.place_name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 1 }}>{k.road_address_name || k.address_name}</div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </Row>
        <Row label="대상">
          <input value={item.age_target ?? ''} onChange={(e) => onChange({ age_target: e.target.value })} placeholder="예: 3~7세" style={fieldStyle} />
        </Row>
        <Row label="기간">
          <input value={item.date_range ?? ''} onChange={(e) => onChange({ date_range: e.target.value })} placeholder="예: 2025.07.01~07.31" style={fieldStyle} />
        </Row>
        <Row label="메모">
          <textarea value={item.memo ?? ''} onChange={(e) => onChange({ memo: e.target.value })} placeholder="한 줄 메모" style={{ ...fieldStyle, minHeight: 50, resize: 'vertical' }} />
        </Row>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <div style={{ width: 38, flex: 'none', fontSize: 12.5, fontWeight: 600, color: 'var(--text-tertiary)', paddingTop: 9 }}>{label}</div>
      {children}
    </div>
  );
}
