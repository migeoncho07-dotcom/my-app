'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { parseInput, searchKakao } from '@/lib/parse-client';
import { savePlaceApi } from '@/lib/group-client';
import { category } from '@/styles/tokens';
import Button from '@/components/ui/Button';
import ScreenHeader from '@/components/ui/ScreenHeader';
import type { ParsedPlace, Category, KakaoPlace } from '@/types';

type Step = 'input' | 'loading' | 'review' | 'done';
type Tab = 'text' | 'photo' | 'link' | 'direct';

interface EditablePlace extends ParsedPlace {
  include: boolean;
  address: string;
  lat: number;
  lng: number;
  kakao_place_id: string;
}
interface DirectDraft {
  title: string;
  category: Category;
  region: string;
  address: string;
  lat: number;
  lng: number;
  date_range: string;
  age_target: string;
  memo: string;
  kakao_place_id: string;
}

const CATS = Object.keys(category) as Category[];
const TABS: { key: Tab; label: string }[] = [
  { key: 'text', label: '텍스트' },
  { key: 'photo', label: '사진' },
  { key: 'link', label: '링크' },
  { key: 'direct', label: '직접' },
];
const emptyDirect = (): DirectDraft => ({
  title: '', category: 'etc', region: '', address: '', lat: 0, lng: 0,
  date_range: '', age_target: '', memo: '', kakao_place_id: '',
});

// 제목+지역으로 카카오 주소 자동 검색해 좌표/주소 채움
async function enrich(p: ParsedPlace): Promise<EditablePlace> {
  let address = '', lat = 0, lng = 0, kakao_place_id = '', region = p.region;
  try {
    const cands = await searchKakao(p.title, p.region);
    if (cands.length > 0) {
      const k = cands[0];
      address = k.road_address_name || k.address_name;
      lat = parseFloat(k.y) || 0;
      lng = parseFloat(k.x) || 0;
      kakao_place_id = k.id;
      if (!region && k.address_name) region = k.address_name.split(' ').slice(0, 2).join(' ');
    }
  } catch {
    /* 무시 */
  }
  return { ...p, region, include: true, address, lat, lng, kakao_place_id };
}

export default function AddPage() {
  const router = useRouter();
  const { firebaseUser } = useAuth();

  const [step, setStep] = useState<Step>('input');
  const [tab, setTab] = useState<Tab>('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [image, setImage] = useState('');
  const [items, setItems] = useState<EditablePlace[]>([]);
  const [direct, setDirect] = useState<DirectDraft>(emptyDirect);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  async function handleParse() {
    setError('');
    let payload: { text?: string; url?: string; image?: string };
    if (tab === 'text') {
      if (!text.trim()) return setError('내용을 붙여넣어 주세요.');
      payload = { text };
    } else if (tab === 'link') {
      if (!url.trim()) return setError('링크를 입력해 주세요.');
      payload = { url };
    } else if (tab === 'photo') {
      if (!image) return setError('사진을 선택해 주세요.');
      payload = { image };
    } else return;

    setStep('loading');
    try {
      const places = await parseInput(payload);
      if (places.length === 0) {
        setError('장소를 찾지 못했어요. 내용을 더 자세히 / 선명한 사진으로 시도해보세요.');
        setStep('input');
        return;
      }
      setItems(await Promise.all(places.map(enrich)));
      setStep('review');
    } catch (e: any) {
      setError(e?.message || 'AI 정리에 실패했어요.');
      setStep('input');
    }
  }

  async function handleDirectSave() {
    if (!firebaseUser) return;
    if (!direct.title.trim()) return setError('장소 이름을 입력해 주세요.');
    setError('');
    setSaving(true);
    try {
      await savePlaceApi({ ...direct, source_text: '직접 입력', ai_confidence: 1 });
      setSavedCount(1);
      setStep('done');
    } catch {
      setError('저장 중 문제가 생겼어요. 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!firebaseUser) return;
    const chosen = items.filter((it) => it.include);
    if (chosen.length === 0) return setError('담을 장소를 한 개 이상 골라주세요.');
    setError('');
    setSaving(true);
    try {
      const sourceText = tab === 'text' ? text : tab === 'link' ? url : '사진';
      for (const it of chosen) {
        await savePlaceApi({
          title: it.title, category: it.category, region: it.region, address: it.address,
          lat: it.lat, lng: it.lng, date_range: it.date_range ?? '', age_target: it.age_target ?? '',
          memo: it.memo ?? '', source_text: sourceText.slice(0, 2000), ai_confidence: it.confidence,
          kakao_place_id: it.kakao_place_id,
        });
      }
      setSavedCount(chosen.length);
      setStep('done');
    } catch {
      setError('저장 중 문제가 생겼어요. 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  }

  function continueAdd() {
    setText(''); setUrl(''); setImage(''); setItems([]); setDirect(emptyDirect());
    setError(''); setTab('text'); setStep('input');
  }
  function update(i: number, patch: Partial<EditablePlace>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function toggleAll() {
    const allOn = items.every((it) => it.include);
    setItems((prev) => prev.map((it) => ({ ...it, include: !allOn })));
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {step !== 'done' && <ScreenHeader title="정보 추가" />}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 20px', minHeight: 0 }}>
        {step === 'input' && (
          <InputStep
            tab={tab} setTab={setTab} text={text} setText={setText} url={url} setUrl={setUrl}
            image={image} setImage={setImage} direct={direct} setDirect={setDirect}
            error={error} onParse={handleParse} onDirectSave={handleDirectSave} saving={saving}
          />
        )}
        {step === 'loading' && <LoadingStep />}
        {step === 'review' && (
          <ReviewStep
            items={items} update={update} toggleAll={toggleAll} error={error} saving={saving}
            onSave={handleSave} onBack={() => { setStep('input'); setError(''); }}
          />
        )}
        {step === 'done' && <DoneStep count={savedCount} onHome={() => router.push('/home')} onMore={continueAdd} />}
      </div>
    </div>
  );
}

/* ── ① 입력 ── */
function InputStep({
  tab, setTab, text, setText, url, setUrl, image, setImage, direct, setDirect, error, onParse, onDirectSave, saving,
}: {
  tab: Tab; setTab: (t: Tab) => void;
  text: string; setText: (v: string) => void;
  url: string; setUrl: (v: string) => void;
  image: string; setImage: (v: string) => void;
  direct: DirectDraft; setDirect: (d: DirectDraft) => void;
  error: string; onParse: () => void; onDirectSave: () => void; saving: boolean;
}) {
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginTop: 16 }}>
      {/* 4탭 세그먼트 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {TABS.map((t) => {
          const on = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                flex: 1, height: 40, borderRadius: 12, fontSize: 13, fontWeight: on ? 700 : 500,
                background: on ? '#1D1D1F' : 'var(--surface)', color: on ? '#fff' : 'var(--text-secondary)',
                border: on ? 'none' : '1px solid var(--border)',
              }}>
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'text' && (
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="인스타·DM·노션 등에서 복사한 글을 붙여넣어 주세요"
          style={{ width: '100%', minHeight: 200, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, fontSize: 14, fontWeight: 500, lineHeight: 1.6, resize: 'vertical' }} />
      )}
      {tab === 'link' && (
        <input value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" placeholder="https://..."
          style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '15px 16px', fontSize: 15, fontWeight: 500 }} />
      )}
      {tab === 'photo' && (
        <label style={{ display: 'block', cursor: 'pointer' }}>
          <input type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
          {image ? (
            <img src={image} alt="선택한 사진" style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)', maxHeight: 320, objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', minHeight: 180, background: 'var(--surface)', border: '1.5px dashed var(--border)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-tertiary)' }}>
              <div style={{ fontSize: 36 }}>🖼️</div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>사진/스크린샷 선택</div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>인스타 캡처도 OK</div>
            </div>
          )}
        </label>
      )}
      {tab === 'direct' && <DirectForm draft={direct} setDraft={setDirect} />}

      {error && <div style={{ color: 'var(--brand-strong)', fontSize: 13, fontWeight: 600, marginTop: 12 }}>{error}</div>}

      <div style={{ marginTop: 'auto', paddingTop: 24, paddingBottom: 24 }}>
        {tab === 'direct' ? (
          <Button onClick={onDirectSave} disabled={saving}>{saving ? '저장하는 중…' : '추가하기'}</Button>
        ) : (
          <Button onClick={onParse}>✨ AI로 정리하기</Button>
        )}
      </div>
    </div>
  );
}

/* ①′ 직접 입력 폼 */
function DirectForm({ draft, setDraft }: { draft: DirectDraft; setDraft: (d: DirectDraft) => void }) {
  const [candidates, setCandidates] = useState<KakaoPlace[] | null>(null);
  const [searching, setSearching] = useState(false);
  const up = (patch: Partial<DirectDraft>) => setDraft({ ...draft, ...patch });
  const f: React.CSSProperties = { width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 13px', fontSize: 14.5, fontWeight: 500 };

  async function findAddr() {
    setSearching(true);
    try { setCandidates(await searchKakao(draft.title, draft.region)); }
    catch { setCandidates([]); }
    finally { setSearching(false); }
  }
  function pick(k: KakaoPlace) {
    up({ address: k.road_address_name || k.address_name, lat: parseFloat(k.y) || 0, lng: parseFloat(k.x) || 0, kakao_place_id: k.id });
    setCandidates(null);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Lbl t="장소 이름"><input value={draft.title} onChange={(e) => up({ title: e.target.value })} placeholder="예: 반짝반짝 키즈카페" style={f} /></Lbl>
      <Lbl t="카테고리">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CATS.map((c) => {
            const on = draft.category === c;
            return <button key={c} onClick={() => up({ category: c })} style={{ borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, background: on ? category[c].bg : 'var(--ios-material)', color: on ? category[c].text : 'var(--text-tertiary)' }}>{category[c].emoji} {category[c].label}</button>;
          })}
        </div>
      </Lbl>
      <Lbl t="지역"><input value={draft.region} onChange={(e) => up({ region: e.target.value })} placeholder="예: 서울 강남" style={f} /></Lbl>
      <Lbl t="주소">
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={draft.address} onChange={(e) => up({ address: e.target.value })} placeholder="탭하여 카카오로 검색" style={{ ...f, flex: 1 }} />
          <button onClick={findAddr} disabled={searching} style={{ flex: 'none', borderRadius: 12, padding: '0 13px', fontSize: 13, fontWeight: 700, background: 'var(--ios-material)', color: 'var(--text-secondary)' }}>{searching ? '…' : '📍 찾기'}</button>
        </div>
        {candidates && (
          <div style={{ marginTop: 6, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            {candidates.length === 0 ? <div style={{ padding: 10, fontSize: 12.5, color: 'var(--text-tertiary)' }}>검색 결과가 없어요.</div> :
              candidates.map((k) => (
                <button key={k.id} onClick={() => pick(k)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 11px', borderBottom: '1px solid var(--border-light)', background: 'var(--surface)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{k.place_name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 1 }}>{k.road_address_name || k.address_name}</div>
                </button>
              ))}
          </div>
        )}
      </Lbl>
      <div style={{ display: 'flex', gap: 10 }}>
        <Lbl t="날짜/기간"><input value={draft.date_range} onChange={(e) => up({ date_range: e.target.value })} placeholder="예: 상시" style={f} /></Lbl>
        <Lbl t="대상 연령"><input value={draft.age_target} onChange={(e) => up({ age_target: e.target.value })} placeholder="예: 3~7세" style={f} /></Lbl>
      </div>
      <Lbl t="메모"><textarea value={draft.memo} onChange={(e) => up({ memo: e.target.value })} placeholder="주차·예약·추천 포인트 등 자유롭게" style={{ ...f, minHeight: 64, resize: 'vertical' }} /></Lbl>
    </div>
  );
}

function Lbl({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 2px 7px' }}>{t}</div>
      {children}
    </div>
  );
}

/* ② 로딩 */
function LoadingStep() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, paddingBottom: 60 }}>
      <div className="airang-spin" style={{ fontSize: 44 }}>✨</div>
      <div style={{ fontSize: 16, fontWeight: 700 }}>AI가 정리하고 있어요…</div>
      <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>장소 찾기 · 카테고리 분류 · 주소 검색 중</div>
      <style>{`@keyframes airang-spin-kf{0%{transform:scale(1) rotate(0)}50%{transform:scale(1.25) rotate(12deg)}100%{transform:scale(1) rotate(0)}}.airang-spin{animation:airang-spin-kf 1.1s ease-in-out infinite}`}</style>
    </div>
  );
}

/* ③ 골라 담기 + 편집 */
function ReviewStep({
  items, update, toggleAll, error, saving, onSave, onBack,
}: {
  items: EditablePlace[];
  update: (i: number, patch: Partial<EditablePlace>) => void;
  toggleAll: () => void;
  error: string; saving: boolean; onSave: () => void; onBack: () => void;
}) {
  const chosen = items.filter((it) => it.include).length;
  const allOn = items.every((it) => it.include);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginTop: 16 }}>
      <span style={{ alignSelf: 'flex-start', background: '#FFEAE2', color: '#E85C2E', borderRadius: 7, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>✦ {items.length}곳 발견</span>
      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', margin: '12px 0 14px' }}>담을 곳을 골라요</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>{chosen}곳 선택됨</span>
        <button onClick={toggleAll} style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand)' }}>{allOn ? '전체 해제' : '전체 선택'}</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16 }}>
        {items.map((it, i) => <PlaceEditCard key={i} item={it} onChange={(patch) => update(i, patch)} />)}
      </div>

      {error && <div style={{ color: 'var(--brand-strong)', fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 24 }}>
        <Button onClick={onSave} disabled={saving || chosen === 0}>{saving ? '저장하는 중…' : `선택한 ${chosen}곳 저장하기`}</Button>
        <button onClick={onBack} style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-tertiary)', padding: 8 }}>다시 입력</button>
      </div>
    </div>
  );
}

/* ⑥ 저장 완료 */
function DoneStep({ count, onHome, onMore }: { count: number; onHome: () => void; onMore: () => void }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 8px' }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#E2F5E8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>✅</div>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 20 }}>{count}곳 저장 완료!</div>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.6, marginTop: 12 }}>
        함께 쓰는 분들에게도 바로 공유됐어요.
      </div>
      <div style={{ width: '100%', marginTop: 36, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Button onClick={onHome}>홈에서 보기</Button>
        <button onClick={onMore} style={{ marginTop: 8, fontSize: 14, fontWeight: 700, color: 'var(--brand)', padding: 6 }}>＋ 계속 추가하기</button>
      </div>
    </div>
  );
}

function PlaceEditCard({ item, onChange }: { item: EditablePlace; onChange: (patch: Partial<EditablePlace>) => void }) {
  const [candidates, setCandidates] = useState<KakaoPlace[] | null>(null);
  const [searching, setSearching] = useState(false);

  async function findAddress() {
    setSearching(true);
    try { setCandidates(await searchKakao(item.title, item.region)); }
    catch { setCandidates([]); }
    finally { setSearching(false); }
  }
  function pick(k: KakaoPlace) {
    onChange({ address: k.road_address_name || k.address_name, lat: parseFloat(k.y), lng: parseFloat(k.x), kakao_place_id: k.id });
    setCandidates(null);
  }
  const fieldStyle: React.CSSProperties = { flex: 1, width: '100%', background: 'var(--bg)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '9px 11px', fontSize: 13.5, fontWeight: 500 };

  return (
    <div style={{ background: 'var(--surface)', border: item.include ? '2px solid var(--brand)' : '2px solid var(--border)', borderRadius: 16, padding: 14, opacity: item.include ? 1 : 0.72, transition: 'border-color .15s, opacity .15s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <button onClick={() => onChange({ include: !item.include })} aria-label="담기"
          style={{ width: 24, height: 24, borderRadius: '50%', flex: 'none', background: item.include ? 'var(--brand)' : 'transparent', border: item.include ? 'none' : '2px solid var(--border)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>
          {item.include ? '✓' : ''}
        </button>
        <input value={item.title} onChange={(e) => onChange({ title: e.target.value })} style={{ flex: 1, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {CATS.map((c) => {
          const active = item.category === c;
          return <button key={c} onClick={() => onChange({ category: c })} style={{ borderRadius: 8, padding: '5px 9px', fontSize: 11.5, fontWeight: 700, background: active ? category[c].bg : 'var(--ios-material)', color: active ? category[c].text : 'var(--text-tertiary)' }}>{category[c].emoji} {category[c].label}</button>;
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Row label="지역"><input value={item.region} onChange={(e) => onChange({ region: e.target.value })} placeholder="예: 서울 강남" style={fieldStyle} /></Row>
        <Row label="주소">
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={item.address} onChange={(e) => onChange({ address: e.target.value })} placeholder="주소 찾기를 눌러보세요" style={{ ...fieldStyle, flex: 1 }} />
              <button onClick={findAddress} disabled={searching} style={{ flex: 'none', borderRadius: 10, padding: '0 12px', fontSize: 12.5, fontWeight: 700, background: 'var(--ios-material)', color: 'var(--text-secondary)' }}>{searching ? '…' : '📍 찾기'}</button>
            </div>
            {candidates && (
              <div style={{ marginTop: 6, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                {candidates.length === 0 ? <div style={{ padding: 10, fontSize: 12.5, color: 'var(--text-tertiary)' }}>검색 결과가 없어요. 직접 입력해 주세요.</div> :
                  candidates.map((k) => (
                    <button key={k.id} onClick={() => pick(k)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 11px', borderBottom: '1px solid var(--border-light)', background: 'var(--surface)' }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{k.place_name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 1 }}>{k.road_address_name || k.address_name}</div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </Row>
        <Row label="대상"><input value={item.age_target ?? ''} onChange={(e) => onChange({ age_target: e.target.value })} placeholder="예: 3~7세" style={fieldStyle} /></Row>
        <Row label="기간"><input value={item.date_range ?? ''} onChange={(e) => onChange({ date_range: e.target.value })} placeholder="예: 상시" style={fieldStyle} /></Row>
        <Row label="메모"><textarea value={item.memo ?? ''} onChange={(e) => onChange({ memo: e.target.value })} placeholder="한 줄 메모" style={{ ...fieldStyle, minHeight: 50, resize: 'vertical' }} /></Row>
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
