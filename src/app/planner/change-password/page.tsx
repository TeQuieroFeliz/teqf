'use client';

import { setPlannerMustChangePassword } from '@/actions/planner/planner-auth';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import { useI18n } from '@/hooks/useI18n';
import { LanguageSelector } from '@/components/LanguageSelector';
import { auth } from '@/firebase/client';
import { updatePassword } from 'firebase/auth';
import { Eye, EyeOff, KeyRound, Loader2, LogOut } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ChangePasswordPage() {
  const { plannerUser, logout, refreshPlannerUser } = usePlannerAuth();
  const { t } = useI18n();
  const router = useRouter();

  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [saving, setSaving]                   = useState(false);

  if (!plannerUser) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error(t('changePwd_tooShort')); return; }
    if (newPassword !== confirmPassword) { toast.error(t('changePwd_mismatch')); return; }
    setSaving(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error(t('changePwd_expired'));
      await updatePassword(currentUser, newPassword);
      await setPlannerMustChangePassword(plannerUser!.email, false);
      await refreshPlannerUser();
      toast.success(t('changePwd_success'));
      router.replace('/planner');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      const message = (err as Error).message;
      const msg = code === 'auth/requires-recent-login'
        ? t('changePwd_expired2')
        : message ?? t('changePwd_error');
      toast.error(msg);
    }
    setSaving(false);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.625rem 2.5rem 0.625rem 0.875rem',
    borderRadius: '0.625rem',
    border: '1px solid var(--tqf-beige-border)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.875rem',
    color: 'var(--tqf-dark)',
    background: 'white',
    outline: 'none',
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--tqf-beige)' }}>
      <div className="fixed top-4 right-4 z-10">
        <LanguageSelector />
      </div>

      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 gap-2">
          <Image
            src="/logo.png"
            alt="Te Quiero Feliz"
            width={56}
            height={56}
            className="object-contain"
            style={{ filter: 'invert(9%) sepia(80%) saturate(900%) hue-rotate(308deg) brightness(145%)' }}
          />
          <div className="text-center">
            <p style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontSize: '1.4rem', fontWeight: 300, lineHeight: 1.1 }}>
              Te Quiero Feliz
            </p>
            <p style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-muted)', fontSize: '0.65rem', letterSpacing: '0.18em', marginTop: '4px' }}>
              {t('plannerArea')}
            </p>
          </div>
        </div>

        <div className="rounded-2xl p-7" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <KeyRound className="size-5" style={{ color: 'var(--tqf-bordeaux)' }} />
            <h1 className="text-xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 300 }}>
              {t('changePwd_title')}
            </h1>
          </div>
          <p className="text-xs mb-6" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            {t('changePwd_instructions', { name: plannerUser.name ?? '' })}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {t('changePwd_new')}
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoFocus
                  placeholder="••••••••"
                  style={inputStyle}
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--tqf-muted)' }}>
                  {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {t('changePwd_minLength')}
              </p>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {t('changePwd_confirm')}
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={inputStyle}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--tqf-muted)' }}>
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {confirmPassword.length > 0 && (
              <p className="text-xs" style={{ color: newPassword === confirmPassword ? '#15803d' : '#991b1b', fontFamily: 'var(--font-body)' }}>
                {newPassword === confirmPassword ? t('changePwd_match') : t('changePwd_noMatch')}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-opacity hover:opacity-80 disabled:opacity-50 mt-2"
              style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {t('changePwd_save')}
            </button>
          </form>
        </div>

        <button
          onClick={logout}
          className="mx-auto mt-4 flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
          style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
        >
          <LogOut className="size-3.5" />
          {t('logout')}
        </button>
      </div>
    </div>
  );
}
