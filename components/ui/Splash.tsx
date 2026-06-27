'use client';

// 스플래시 / 초기 로딩 화면 (디자인: 코랄 그라데이션 + 로고 + 놀잇터 + 부제/점)
import BrandMark from '@/components/ui/BrandMark';

export default function Splash({ subtitle, dots }: { subtitle?: string; dots?: boolean }) {
  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100dvh',
        width: '100%',
        overflow: 'hidden',
        background: 'linear-gradient(165deg, #FF7E5F 0%, #FF6B4A 48%, #F0562E 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 22,
      }}
    >
      {/* 장식용 원 */}
      <div style={{ position: 'absolute', top: '-12%', right: '-18%', width: '70%', aspectRatio: '1', borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }} />
      <div style={{ position: 'absolute', bottom: '-14%', left: '-16%', width: '55%', aspectRatio: '1', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <BrandMark size={92} variant="splash" />
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.04em', color: '#fff' }}>놀잇터</div>

        {dots && (
          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} className="splash-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.85)', animationDelay: `${i * 0.16}s` }} />
            ))}
          </div>
        )}

        {subtitle && (
          <div style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.9)', fontWeight: 500, marginTop: dots ? 6 : 0 }}>{subtitle}</div>
        )}
      </div>

      <style>{`@keyframes splash-bounce{0%,80%,100%{transform:translateY(0);opacity:.5}40%{transform:translateY(-7px);opacity:1}}.splash-dot{animation:splash-bounce 1.1s ease-in-out infinite}`}</style>
    </div>
  );
}
