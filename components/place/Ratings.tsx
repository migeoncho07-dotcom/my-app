'use client';

// 장소 상세의 "엄마들의 평점" 섹션 + 별점 시트 + 후기 작성 + 토스트
// 디자인 핸드오프: 놀잇터 평점·후기 플로우
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { submitRatingApi } from '@/lib/group-client';
import { computeAggregate, fmtAvg, RATING_TAGS, SCORE_LABELS } from '@/lib/ratings';
import { timeAgo } from '@/lib/age';
import Stars from '@/components/ui/Stars';
import type { Rating } from '@/types';

export default function RatingSection({
  placeId,
  placeName,
  ratings,
  myRating,
  onChanged,
}: {
  placeId: string;
  placeName: string;
  ratings: Rating[];
  myRating: Rating | null;
  onChanged: () => void;
}) {
  const router = useRouter();
  const agg = useMemo(() => computeAggregate(ratings), [ratings]);
  const previews = ratings.slice(0, 3);

  // 시트/작성 오버레이 상태
  const [mode, setMode] = useState<null | 'sheet' | 'write'>(null);
  const [score, setScore] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(false);

  function openSheet() {
    setScore(myRating?.score ?? 0);
    setTags(myRating?.tags ?? []);
    setComment(myRating?.comment ?? '');
    setMode('sheet');
  }
  function toggleTag(t: string) {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }
  async function submit() {
    if (score < 1) return;
    setSubmitting(true);
    try {
      await submitRatingApi(placeId, { score, tags, comment });
      setMode(null);
      setToast(true);
      setTimeout(() => setToast(false), 3000);
      onChanged();
    } catch {
      /* 유지 */
    } finally {
      setSubmitting(false);
    }
  }

  const max = Math.max(1, ...agg.dist);

  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12 }}>엄마들의 평점</div>

      {/* 내 평점 카드 (작성함) 또는 다녀왔어요 배너 (미작성) */}
      {myRating ? (
        <div style={{ background: '#FFF3EE', border: '1.5px solid #FFD4C2', borderRadius: 14, padding: 14, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Stars value={myRating.score} size={16} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#E85C2E' }}>내 평점</span>
            </div>
            <button onClick={openSheet} style={{ fontSize: 13, fontWeight: 700, color: '#E85C2E', background: 'none', border: 'none' }}>평점 수정</button>
          </div>
          {myRating.comment && (
            <div style={{ fontSize: 13, color: '#5b544a', fontWeight: 500, lineHeight: 1.55, marginTop: 8, whiteSpace: 'pre-wrap' }}>{myRating.comment}</div>
          )}
        </div>
      ) : (
        <div style={{ background: '#FFF3EE', border: '1.5px dashed #FFBEA8', borderRadius: 14, padding: '16px', marginBottom: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1D1D1F', marginBottom: 3 }}>다녀오셨나요?</div>
          <div style={{ fontSize: 12.5, color: '#8E8E93', fontWeight: 500, marginBottom: 12 }}>평점과 한마디로 다른 엄마들을 도와주세요</div>
          <button
            onClick={openSheet}
            style={{ width: '100%', background: '#fff', border: '1.5px solid #FF6B4A', color: '#FF6B4A', borderRadius: 12, padding: '13px', fontSize: 14.5, fontWeight: 700 }}
          >
            ✓ 다녀왔어요
          </button>
        </div>
      )}

      {/* 평점 요약 또는 빈 상태 */}
      {agg.count > 0 ? (
        <div style={{ background: '#fff', border: '1px solid #ECECF0', borderRadius: 14, padding: 16, display: 'flex', gap: 18, alignItems: 'center' }}>
          {/* 왼쪽: 큰 숫자 + 별 + 인원 */}
          <div style={{ textAlign: 'center', flex: 'none' }}>
            <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>{fmtAvg(agg.avg)}</div>
            <div style={{ margin: '6px 0 4px' }}><Stars value={agg.avg ?? 0} size={14} /></div>
            <div style={{ fontSize: 11.5, color: '#8E8E93', fontWeight: 500 }}>{agg.count}명 참여</div>
          </div>
          {/* 오른쪽: 분포 바 */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[5, 4, 3, 2, 1].map((s) => {
              const cnt = agg.dist[s - 1];
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#8E8E93', fontWeight: 600, width: 8 }}>{s}</span>
                  <div style={{ flex: 1, height: 6, background: '#F0F0F2', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${(cnt / max) * 100}%`, height: '100%', background: '#FF6B4A', borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 11, color: '#AEAEB2', fontWeight: 500, width: 14, textAlign: 'right' }}>{cnt}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #ECECF0', borderRadius: 14, padding: '24px 16px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><Stars value={0} size={26} gap={4} /></div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1D1D1F' }}>아직 평점이 없어요</div>
          <div style={{ fontSize: 12.5, color: '#8E8E93', fontWeight: 500, marginTop: 4 }}>다녀온 엄마가 첫 번째 평점을 남겨주실 수 있어요</div>
        </div>
      )}

      {/* 후기 미리보기 (최대 3개) */}
      {previews.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
          {previews.map((r) => (
            <ReviewItem key={r.id} r={r} clamp />
          ))}
        </div>
      )}

      {/* 전체 후기 보기 */}
      {agg.count > 0 && (
        <button
          onClick={() => router.push(`/place/${placeId}/reviews`)}
          style={{ width: '100%', marginTop: 12, background: '#F5F5F7', border: 'none', borderRadius: 12, padding: '13px', fontSize: 13.5, fontWeight: 700, color: '#1D1D1F' }}
        >
          전체 후기 {agg.count}개 보기
        </button>
      )}

      {/* ── 별점 시트 ── */}
      {mode === 'sheet' && (
        <Overlay onClose={() => setMode(null)} align="end">
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '10px 22px calc(env(safe-area-inset-bottom, 0px) + 24px)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 42, height: 5, borderRadius: 5, background: '#DDDDE0', margin: '0 auto 16px' }} />
            <div style={{ fontSize: 13, color: '#8E8E93', fontWeight: 500 }}>{placeName}</div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 18 }}>어떠셨나요?</div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <Stars value={score} size={44} gap={6} interactive onChange={setScore} />
            </div>
            <div style={{ textAlign: 'center', height: 20, fontSize: 14, fontWeight: 700, color: '#FF6B4A', marginBottom: 18 }}>
              {score >= 1 ? SCORE_LABELS[score] : ''}
            </div>

            <div style={{ height: 1, background: '#ECECF0', margin: '0 0 16px' }} />
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#636366', marginBottom: 10 }}>한마디 <span style={{ color: '#AEAEB2', fontWeight: 500 }}>(선택)</span></div>
            <TagChips selected={tags} onToggle={toggleTag} />

            <button
              onClick={submit}
              disabled={score < 1 || submitting}
              style={{ width: '100%', marginTop: 20, background: score < 1 ? '#FFC4B4' : '#FF6B4A', color: '#fff', border: 'none', borderRadius: 14, padding: 16, fontSize: 15.5, fontWeight: 700 }}
            >
              {submitting ? '남기는 중…' : '평점 남기기'}
            </button>
            <button
              onClick={() => setMode('write')}
              disabled={score < 1}
              style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', color: score < 1 ? '#C7C7CC' : '#636366', fontSize: 13.5, fontWeight: 600, padding: 6 }}
            >
              자세한 글 남기기
            </button>
          </div>
        </Overlay>
      )}

      {/* ── 후기 작성 (전체 화면) ── */}
      {mode === 'write' && (
        <FullOverlay>
          <WriteScreen
            placeName={placeName}
            score={score}
            tags={tags}
            comment={comment}
            onScore={() => setMode('sheet')}
            onToggleTag={toggleTag}
            onComment={setComment}
            onBack={() => setMode('sheet')}
            onSubmit={submit}
            submitting={submitting}
          />
        </FullOverlay>
      )}

      {/* ── 토스트 ── */}
      {toast && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)', display: 'flex', justifyContent: 'center', zIndex: 2000, pointerEvents: 'none' }}>
          <div style={{ background: '#1D1D1F', color: '#fff', fontSize: 13.5, fontWeight: 600, padding: '12px 20px', borderRadius: 12, boxShadow: '0 10px 30px -8px rgba(0,0,0,.4)' }}>
            ✓ 평점이 등록됐어요!
          </div>
        </div>
      )}
    </div>
  );
}

// 후기 한 건 (미리보기 = clamp, 전체후기 = 전문)
export function ReviewItem({ r, clamp }: { r: Rating; clamp?: boolean }) {
  const [open, setOpen] = useState(false);
  const long = (r.comment ?? '').length > 60;
  const expanded = !clamp || open;
  return (
    <div style={{ background: expanded && long ? '#FFF8F6' : '#fff', border: `1px solid ${expanded && long ? '#FFD4C2' : '#ECECF0'}`, borderRadius: 13, padding: 13 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', flex: 'none', background: r.avatar_color || '#FF6B4A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
          {r.user_nickname?.[0] ?? '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{r.user_nickname || '멤버'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
            <Stars value={r.score} size={11} gap={1} />
            <span style={{ fontSize: 11, color: '#AEAEB2', fontWeight: 500 }}>{r.created_at ? timeAgo(r.created_at as any) : ''}</span>
          </div>
        </div>
      </div>

      {r.comment && (
        <div style={{ marginTop: 9 }}>
          <div
            style={{
              fontSize: 13, color: '#3c372f', fontWeight: 500, lineHeight: 1.6, whiteSpace: 'pre-wrap',
              ...(clamp && !open
                ? { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }
                : {}),
            }}
          >
            {r.comment}
          </div>
          {clamp && long && (
            <button onClick={() => setOpen((v) => !v)} style={{ background: 'none', border: 'none', color: '#FF6B4A', fontSize: 11.5, fontWeight: 600, marginTop: 3, padding: 0 }}>
              {open ? '접기' : '...더보기'}
            </button>
          )}
        </div>
      )}

      {r.tags?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>
          {r.tags.map((t) => (
            <span key={t} style={{ background: '#FFF3EE', color: '#C85A36', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600 }}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function TagChips({ selected, onToggle }: { selected: string[]; onToggle: (t: string) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {RATING_TAGS.map((t) => {
        const on = selected.includes(t);
        return (
          <button
            key={t}
            onClick={() => onToggle(t)}
            style={{
              background: on ? '#FF6B4A' : '#F5F5F7',
              color: on ? '#fff' : '#636366',
              border: on ? '1px solid #FF6B4A' : '1px solid #E5E5EA',
              borderRadius: 20,
              padding: '8px 13px',
              fontSize: 13,
              fontWeight: on ? 700 : 500,
            }}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

function WriteScreen({
  placeName, score, tags, comment, onScore, onToggleTag, onComment, onBack, onSubmit, submitting,
}: {
  placeName: string; score: number; tags: string[]; comment: string;
  onScore: () => void; onToggleTag: (t: string) => void; onComment: (v: string) => void;
  onBack: () => void; onSubmit: () => void; submitting: boolean;
}) {
  const { profile } = useAuth();
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* 헤더 */}
      <div style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: 15, color: '#636366', fontWeight: 600 }}>← 뒤로</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.03em' }}>후기 작성</div>
          <div style={{ fontSize: 11.5, color: '#8E8E93', fontWeight: 500 }}>{placeName}</div>
        </div>
        <button onClick={onSubmit} disabled={submitting || score < 1} style={{ background: 'none', border: 'none', fontSize: 15, fontWeight: 700, color: score < 1 ? '#C7C7CC' : '#FF6B4A' }}>완료</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 20px 0' }}>
        {/* 내 별점 카드 */}
        <div style={{ background: '#FFF3EE', border: '1.5px solid #FFD4C2', borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', flex: 'none', background: profile?.avatar_color || '#FF6B4A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700 }}>
            {profile?.nickname?.[0] ?? ''}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{profile?.nickname || '나'}</div>
            <div style={{ marginTop: 2 }}><Stars value={score} size={14} /></div>
          </div>
          <button onClick={onScore} style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 700, color: '#E85C2E' }}>수정</button>
        </div>

        {/* 빠른 한마디 */}
        <div style={{ fontSize: 13.5, fontWeight: 700, margin: '22px 2px 11px' }}>빠른 한마디 <span style={{ color: '#AEAEB2', fontWeight: 500, fontSize: 12 }}>(중복 선택)</span></div>
        <TagChips selected={tags} onToggle={onToggleTag} />

        {/* 자세한 후기 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '22px 2px 11px' }}>
          <span style={{ fontSize: 13.5, fontWeight: 700 }}>자세한 후기 <span style={{ color: '#AEAEB2', fontWeight: 500, fontSize: 12 }}>(선택)</span></span>
          <span style={{ fontSize: 12, color: '#AEAEB2', fontWeight: 500 }}>{comment.length} / 200</span>
        </div>
        <textarea
          value={comment}
          onChange={(e) => onComment(e.target.value.slice(0, 200))}
          placeholder="아이와 다녀온 솔직한 후기를 남겨주세요"
          style={{ width: '100%', minHeight: 130, background: '#fff', border: '1.5px solid #FF6B4A', borderRadius: 14, padding: 15, fontSize: 14, fontWeight: 500, lineHeight: 1.6, resize: 'vertical' }}
        />
      </div>

      {/* 하단 등록 */}
      <div style={{ padding: '12px 20px calc(env(safe-area-inset-bottom, 0px) + 20px)' }}>
        <button onClick={onSubmit} disabled={submitting || score < 1} style={{ width: '100%', background: score < 1 ? '#FFC4B4' : '#FF6B4A', color: '#fff', border: 'none', borderRadius: 14, padding: 16, fontSize: 15.5, fontWeight: 700 }}>
          {submitting ? '등록 중…' : '등록하기'}
        </button>
      </div>
    </div>
  );
}

// 딤 + 바텀시트 컨테이너 (앱 칼럼 폭에 맞춤)
function Overlay({ children, onClose, align = 'center' }: { children: React.ReactNode; onClose: () => void; align?: 'center' | 'end' }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1500, background: 'rgba(0,0,0,.45)', display: 'flex', justifyContent: 'center', alignItems: align === 'end' ? 'flex-end' : 'center' }}>
      <div style={{ width: '100%', maxWidth: 430 }}>{children}</div>
    </div>
  );
}

// 전체 화면 오버레이 (앱 칼럼 폭)
function FullOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1500, background: 'rgba(0,0,0,.45)', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 430, background: '#F5F5F7', display: 'flex', flexDirection: 'column' }}>{children}</div>
    </div>
  );
}
