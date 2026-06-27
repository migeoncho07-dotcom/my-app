'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { parseInput, searchKakao } from '@/lib/parse-client';
import { savePlaceApi } from '@/lib/group-client';
import { category } from '@/styles/tokens';
import Button from '@/components/ui/Button';
import ScreenHeader from '@/components/ui/ScreenHeader';
import CategoryIcon from '@/components/ui/CategoryIcon';
import type { ParsedPlace, Category, KakaoPlace } from '@/types';

type Step = 'input' | 'loading' | 'select' | 'edit' | 'done';
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
interface SavedSummary {
  title: string;
  category: Category;
  region: string;
  age_target: string;
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
  const [editIdx, setEditIdx] = useState(0);
  const [direct, setDirect] = useState<DirectDraft>(emptyDirect);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<SavedSummary[]>([]);

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
      setStep('select');
    } catch (e: any) {
      setError(e?.message || '정리에 실패했어요.');
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
      setSaved([{ title: direct.title, category: direct.category, region: direct.region, age_target: direct.age_target }]);
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
      setSaved(chosen.map((it) => ({ title: it.title, category: it.category, region: it.region, age_target: it.age_target ?? '' })));
      setStep('done');
    } catch {
      setError('저장 중 문제가 생겼어요. 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  }

  function continueAdd() {
    setText(''); setUrl(''); setImage(''); setItems([]); setDirect(emptyDirect());
    setError(''); setTab('text'); setEditIdx(0); setStep('input');
  }
  function update(i: number, patch: Partial<EditablePlace>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function toggleAll() {
    const allOn = items.every((it) => it.include);
    setItems((prev) => prev.map((it) => ({ ...it, include: !allOn })));
  }
  function proceedToEdit() {
    if (items.filter((it) => it.include).length === 0) return setError('담을 장소를 한 개 이상 골라주세요.');
    setError(''); setEditIdx(0); setStep('edit');
  }

  // 하단 고정 바에서 쓰는 값
  const chosenCount = items.filter((it) => it.include).length;
  const editTotal = chosenCount;
  const editSafeIdx = Math.min(editIdx, Math.max(0, editTotal - 1));

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {step === 'input' && <ScreenHeader title="정보 추가" />}

      {/* 스크롤 영역 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 20px', minHeight: 0, overflowY: 'auto' }}>
        {step === 'input' && (
          <InputStep
            tab={tab} setTab={setTab} text={text} setText={setText} url={url} setUrl={setUrl}
            image={image} setImage={setImage} direct={direct} setDirect={setDirect}
            error={error} onParse={handleParse} onDirectSave={handleDirectSave} saving={saving}
          />
        )}
        {step === 'loading' && <LoadingStep />}
        {step === 'select' && (
          <SelectStep items={items} update={update} toggleAll={toggleAll} error={error}
            onProceed={proceedToEdit} onBack={() => { setStep('input'); setError(''); }} />
        )}
        {step === 'edit' && (
          <EditStep items={items} update={update} editIdx={editIdx} setEditIdx={setEditIdx}
            saving={saving} error={error} onSave={handleSave} onBack={() => { setStep('select'); setError(''); }} />
        )}
        {step === 'done' && <DoneStep saved={saved} onHome={() => router.push('/home')} onMore={continueAdd} />}
      </div>

      {/* 고정 하단 액션 바 (스크롤·탭바 위) */}
      {step === 'input' && (
        <div style={{ padding: '12px 20px 14px' }}>
          {tab === 'direct'
            ? <Button onClick={handleDirectSave} disabled={saving}>{saving ? '저장하는 중…' : '추가하기'}</Button>
            : <Button onClick={handleParse}>＋ 장소 추가하기</Button>}
        </div>
      )}
      {step === 'select' && (
        <div style={{ padding: '12px 20px 14px' }}>
          <Button onClick={proceedToEdit} disabled={chosenCount === 0}>선택한 {chosenCount}곳 정리하기</Button>
        </div>
      )}
      {step === 'edit' && (
        <div style={{ padding: '12px 20px 14px', display: 'flex', gap: 9 }}>
          {editTotal > 1 && (
            <button onClick={() => setEditIdx((n) => Math.min(n + 1, editTotal - 1))} disabled={editSafeIdx >= editTotal - 1}
              style={{ flex: 'none', minWidth: 92, textAlign: 'center', background: '#fff', border: '1px solid var(--border)', color: '#636366', borderRadius: 14, padding: 16, fontSize: 14, fontWeight: 600, opacity: editSafeIdx >= editTotal - 1 ? 0.4 : 1 }}>
              다음 장소 ›
            </button>
          )}
          <div style={{ flex: 1 }}>
            <Button onClick={handleSave} disabled={saving}>{saving ? '저장하는 중…' : `${editTotal}곳 저장`}</Button>
          </div>
        </div>
      )}
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
                flex: 1, height: 40, borderRadius: 12, fontSize: 12.5, fontWeight: on ? 600 : 500,
                background: on ? '#1D1D1F' : 'var(--surface)', color: on ? '#fff' : '#8E8E93',
                border: on ? 'none' : '1px solid var(--border)',
              }}>
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'text' && (
        <>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 2px 9px' }}>인스타·노션·DM 내용을 그대로 붙여넣어요</div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="여기에 붙여넣어 주세요"
            style={{ width: '100%', minHeight: 210, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: 15, fontSize: 14, fontWeight: 500, lineHeight: 1.7, resize: 'vertical' }} />
          <div style={{ background: '#FFF3EE', borderRadius: 13, padding: '12px 14px', marginTop: 14, display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 12, color: '#b3603e', lineHeight: 1.55, fontWeight: 500 }}>
            <span style={{ fontSize: 14 }}>💡</span>여러 곳이 섞여 있어도 괜찮아요. 하나씩 카드로 정리해 드려요.
          </div>
        </>
      )}
      {tab === 'link' && (
        <input value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" placeholder="https://..."
          style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '15px 16px', fontSize: 15, fontWeight: 500 }} />
      )}
      {tab === 'photo' && (
        <label style={{ display: 'block', cursor: 'pointer' }}>
          <input type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
          {image ? (
            <img src={image} alt="선택한 사진" style={{ width: '100%', borderRadius: 13, border: '1px solid var(--border)', maxHeight: 320, objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', minHeight: 180, background: 'var(--surface)', border: '1.5px dashed var(--border)', borderRadius: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-tertiary)' }}>
              <div style={{ fontSize: 36 }}>🖼️</div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>사진/스크린샷 선택</div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>인스타 캡처도 OK</div>
            </div>
          )}
        </label>
      )}
      {tab === 'direct' && <DirectForm draft={direct} setDraft={setDirect} />}

      {error && <div style={{ color: 'var(--brand-strong)', fontSize: 13, fontWeight: 600, marginTop: 12 }}>{error}</div>}
      <div style={{ height: 12 }} />
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
            return <button key={c} onClick={() => up({ category: c })} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, background: on ? category[c].bg : 'var(--ios-material)', color: on ? category[c].text : 'var(--text-tertiary)' }}><CategoryIcon type={c} size={12} /> {category[c].label}</button>;
          })}
        </div>
      </Lbl>
      <Lbl t="지역"><input value={draft.region} onChange={(e) => up({ region: e.target.value })} placeholder="예: 서울 강남" style={f} /></Lbl>
      <Lbl t="주소">
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={draft.address} onChange={(e) => up({ address: e.target.value })} placeholder="탭하여 카카오로 주소 검색" style={{ ...f, flex: 1 }} />
          <button onClick={findAddr} disabled={searching} style={{ flex: 'none', borderRadius: 12, padding: '0 13px', fontSize: 13, fontWeight: 700, background: 'var(--ios-material)', color: 'var(--text-secondary)' }}>{searching ? '…' : '찾기'}</button>
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
      <div style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', margin: '0 2px 7px' }}>{t}</div>
      {children}
    </div>
  );
}

/* ② 자동 정리 중 — 링 스피너 + 4단계 체크리스트 (시안 v4) */
const LOAD_STEPS = ['장소 이름 찾기', '카테고리 분류', '카카오 주소 검색 중…', '대상 연령·메모 정리'];
function LoadingStep() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setActive((a) => (a < LOAD_STEPS.length - 1 ? a + 1 : a)), 850);
    return () => clearInterval(iv);
  }, []);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: 40 }}>
      {/* 링 스피너 */}
      <div style={{ position: 'relative', width: 96, height: 96, marginBottom: 30 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid #FFD9CC' }} />
        <div className="airang-ring" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid transparent', borderTopColor: '#FF6B4A' }} />
        <div style={{ position: 'absolute', inset: 22, borderRadius: 16, background: '#FF6B4A', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 22px -8px rgba(255,107,74,.6)' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
        </div>
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', textAlign: 'center', marginBottom: 10, lineHeight: 1.3 }}>붙여넣은 글을<br />정리하고 있어요</div>
      <div style={{ fontSize: 14, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 28 }}>잠깐이면 돼요 · 보통 3초</div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {LOAD_STEPS.map((label, i) => {
          const done = i < active;
          const now = i === active;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, background: now ? '#FFF3EE' : 'var(--surface)', border: now ? '1.5px solid #FF6B4A' : '1px solid #ECECF0', borderRadius: 13, padding: '12px 14px' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? '#1F9E57' : now ? '#FF6B4A' : 'transparent', border: done || now ? 'none' : '2px solid #E0E0E5' }}>
                {done ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                ) : now ? (
                  <span className="airang-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
                ) : null}
              </div>
              <span style={{ fontSize: 13.5, fontWeight: now ? 700 : 600, color: now ? '#E85C2E' : done ? '#1D1D1F' : '#8E8E93' }}>{label}</span>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes airang-ring-kf{to{transform:rotate(360deg)}}.airang-ring{animation:airang-ring-kf .9s linear infinite}@keyframes airang-dot-kf{0%,100%{opacity:.3}50%{opacity:1}}.airang-dot{animation:airang-dot-kf 1s ease-in-out infinite}`}</style>
    </div>
  );
}

/* 작은 뒤로 버튼 */
function BackChevron({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="뒤로" style={{ width: 36, height: 36, marginLeft: -6, display: 'flex', alignItems: 'center' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#636366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 5l-7 7 7 7" /></svg>
    </button>
  );
}

/* ③ 여러 곳 발견 → 골라 담기 (컴팩트 선택) */
function SelectStep({
  items, update, toggleAll, error, onProceed, onBack,
}: {
  items: EditablePlace[];
  update: (i: number, patch: Partial<EditablePlace>) => void;
  toggleAll: () => void;
  error: string; onProceed: () => void; onBack: () => void;
}) {
  const chosen = items.filter((it) => it.include).length;
  const allOn = items.every((it) => it.include);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: 14 }}>
      <BackChevron onClick={onBack} />
      <span style={{ alignSelf: 'flex-start', background: '#FFEAE2', color: '#E85C2E', borderRadius: 7, padding: '3px 9px', fontSize: 11, fontWeight: 700, marginTop: 6 }}>✦ {items.length}곳 발견</span>
      <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', margin: '6px 0 14px', lineHeight: 1 }}>담을 곳을 골라요</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 12.5, color: '#8E8E93', fontWeight: 500 }}>{chosen}곳 선택됨</span>
        <button onClick={toggleAll} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--brand)' }}>{allOn ? '전체 해제' : '전체 선택'}</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((it, i) => {
          const c = category[it.category] ?? category.etc;
          return (
            <button key={i} onClick={() => update(i, { include: !it.include })}
              style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', width: '100%', background: 'var(--surface)', border: it.include ? '2px solid var(--brand)' : '2px solid var(--border)', borderRadius: 14, padding: 13, opacity: it.include ? 1 : 0.7, transition: 'border-color .15s, opacity .15s' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', flex: 'none', background: it.include ? 'var(--brand)' : 'transparent', border: it.include ? 'none' : '2px solid var(--border)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {it.include && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: c.bg, color: c.text, borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700 }}>
                  <CategoryIcon type={it.category} size={12} /> {c.label}
                </span>
                <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</div>
                <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 2, fontWeight: 500 }}>{[it.region, it.age_target].filter(Boolean).join(' · ') || '정보 없음'}</div>
              </div>
            </button>
          );
        })}
      </div>

      {error && <div style={{ color: 'var(--brand-strong)', fontSize: 13, fontWeight: 600, marginTop: 12 }}>{error}</div>}
      <div style={{ height: 12 }} />
    </div>
  );
}

/* ④ 카드 확인·편집 (선택 항목 순차 편집) */
function EditStep({
  items, update, editIdx, setEditIdx, saving, error, onSave, onBack,
}: {
  items: EditablePlace[];
  update: (i: number, patch: Partial<EditablePlace>) => void;
  editIdx: number; setEditIdx: (f: (n: number) => number) => void;
  saving: boolean; error: string; onSave: () => void; onBack: () => void;
}) {
  const chosen = items.map((it, i) => ({ it, i })).filter((x) => x.it.include);
  const total = chosen.length;
  const safeIdx = Math.min(editIdx, total - 1);
  const cur = chosen[safeIdx];
  if (!cur) return null;
  const oi = cur.i;
  const item = cur.it;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <BackChevron onClick={onBack} />
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em' }}>확인하고 저장</div>
        </div>
        {total > 1 && <div style={{ fontSize: 13, color: '#8E8E93', fontWeight: 600 }}>{safeIdx + 1}/{total}</div>}
      </div>

      <div style={{ marginTop: 16 }}>
        <EditFields item={item} onChange={(patch) => update(oi, patch)} />
      </div>

      {error && <div style={{ color: 'var(--brand-strong)', fontSize: 13, fontWeight: 600, marginTop: 12 }}>{error}</div>}
      <div style={{ height: 12 }} />
    </div>
  );
}

function EditFields({ item, onChange }: { item: EditablePlace; onChange: (patch: Partial<EditablePlace>) => void }) {
  const [candidates, setCandidates] = useState<KakaoPlace[] | null>(null);
  const [searching, setSearching] = useState(false);
  const f: React.CSSProperties = { width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '13px 14px', fontSize: 14, fontWeight: 600 };

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Lbl t="제목"><input value={item.title} onChange={(e) => onChange({ title: e.target.value })} style={{ ...f, fontWeight: 700, fontSize: 15.5 }} /></Lbl>
      <Lbl t="카테고리">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CATS.map((c) => {
            const on = item.category === c;
            return <button key={c} onClick={() => onChange({ category: c })} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 10, padding: '8px 12px', fontSize: 12.5, fontWeight: 700, background: on ? category[c].bg : 'var(--ios-material)', color: on ? category[c].text : 'var(--text-tertiary)' }}><CategoryIcon type={c} size={12} /> {category[c].label}</button>;
          })}
        </div>
      </Lbl>
      <Lbl t="주소">
        <button onClick={findAddress} disabled={searching}
          style={{ width: '100%', textAlign: 'left', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 11 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#FF6B4A" strokeWidth="2" style={{ flex: 'none' }}><path d="M12 21s-6-5.3-6-10a6 6 0 1112 0c0 4.7-6 10-6 10z" /><circle cx="12" cy="11" r="2" /></svg>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: item.address ? '#1D1D1F' : '#C7C7CC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.address || '탭하여 카카오로 주소 검색'}</div>
            {item.address && <div style={{ fontSize: 11, color: '#3B72DD', marginTop: 2, fontWeight: 600 }}>✓ 카카오 검색됨 · 탭하여 변경</div>}
          </div>
          <span style={{ flex: 'none', fontSize: 12, color: '#8E8E93', fontWeight: 600 }}>{searching ? '…' : ''}</span>
        </button>
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
        <Lbl t="날짜/기간"><input value={item.date_range ?? ''} onChange={(e) => onChange({ date_range: e.target.value })} placeholder="예: 상시" style={f} /></Lbl>
        <Lbl t="대상 연령"><input value={item.age_target ?? ''} onChange={(e) => onChange({ age_target: e.target.value })} placeholder="예: 3~7세" style={f} /></Lbl>
      </div>
      <Lbl t="메모"><textarea value={item.memo ?? ''} onChange={(e) => onChange({ memo: e.target.value })} placeholder="주차·예약·추천 포인트 등" style={{ ...f, minHeight: 64, resize: 'vertical' }} /></Lbl>
    </div>
  );
}

/* ⑥ 저장 완료 — 요약 카드 */
function DoneStep({ saved, onHome, onMore }: { saved: SavedSummary[]; onHome: () => void; onMore: () => void }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px 4px' }}>
      <div style={{ width: 88, height: 88, borderRadius: '50%', background: '#1F9E57', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 18px 40px -12px rgba(31,158,87,.55)' }}>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6" /></svg>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 20 }}>{saved.length}곳 저장 완료!</div>
      <div style={{ fontSize: 14.5, color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.6, marginTop: 10 }}>
        저장했어요!<br />함께 쓰는 분들 모두가 볼 수 있어요
      </div>

      {/* 저장한 곳 요약 */}
      <div style={{ width: '100%', marginTop: 24, background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 16, padding: 6, display: 'flex', flexDirection: 'column' }}>
        {saved.map((s, i) => {
          const c = category[s.category] ?? category.etc;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 10px', borderTop: i === 0 ? 'none' : '1px solid var(--border-light)', textAlign: 'left' }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, flex: 'none', background: c.bg, color: c.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CategoryIcon type={s.category} size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                <div style={{ fontSize: 11.5, color: '#8E8E93', fontWeight: 500, marginTop: 1 }}>{[s.region, s.age_target].filter(Boolean).join(' · ')}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ width: '100%', marginTop: 28, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Button onClick={onHome}>홈에서 보기</Button>
        <button onClick={onMore} style={{ marginTop: 8, fontSize: 14, fontWeight: 700, color: 'var(--brand)', padding: 6 }}>＋ 계속 추가하기</button>
      </div>
    </div>
  );
}
