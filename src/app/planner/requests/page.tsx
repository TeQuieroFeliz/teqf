'use client';

import { approveRegistration, approvePlannerRequest, rejectPlannerRequest } from '@/actions/planner/planner-requests';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import { db } from '@/firebase/client';
import { TeamRole, PlannerRequest } from '@/lib/planner-types';
import {
  ArrowLeft,
  Check,
  ClipboardList,
  Loader2,
  Phone,
  UserCheck,
  UserX,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const TEAM_ROLE_OPTIONS: { value: TeamRole; label: string; description: string }[] = [
  {
    value: 'xb_planner',
    label: 'XB Team (Planner)',
    description: 'Crea progetti, vede/modifica cash control e nomina dei propri eventi',
  },
  {
    value: 'teqf_user',
    label: 'TeQF Team (Utente)',
    description: 'Vede tutti i progetti, modifica cash control e nomina per qualsiasi evento, modifica cataloghi',
  },
  {
    value: 'both',
    label: 'Entrambi',
    description: 'Accesso completo a tutte le funzionalità di entrambi i ruoli',
  },
];

export default function PlannerRequestsPage() {
  const { isSuperAdmin } = usePlannerAuth();
  const [requests, setRequests] = useState<PlannerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingReq, setProcessingReq] = useState<string | null>(null);
  const [reqError,      setReqError]      = useState<string | null>(null);

  // Approval modal state
  const [approvalReq, setApprovalReq] = useState<PlannerRequest | null>(null);
  const [teamRole, setTeamRole] = useState<TeamRole>('xb_planner');
  const [approving, setApproving] = useState(false);

  // Real-time listener for pending requests
  useEffect(() => {
    const q = query(
      collection(db, 'plannerRequests'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        // orderBy('createdAt','desc') in the query handles ordering server-side
        setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PlannerRequest)));
        setLoading(false);
        setReqError(null);
      },
      (err) => {
        console.error('[requests] snapshot error:', err);
        setReqError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
          Accesso non autorizzato.
        </p>
      </div>
    );
  }

  if (reqError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <div className="text-center px-6 max-w-sm">
          <p className="text-base mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)' }}>
            Errore di connessione
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            {reqError}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm px-4 py-2 rounded-lg"
            style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
          >
            Ricarica
          </button>
        </div>
      </div>
    );
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.65rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.12em',
    marginBottom: '0.375rem',
    color: 'var(--tqf-muted)',
    fontFamily: 'var(--font-body)',
  };

  function openApproveModal(req: PlannerRequest) {
    setApprovalReq(req);
    setTeamRole('xb_planner');
  }

  async function handleConfirmApprove() {
    if (!approvalReq) return;
    setApproving(true);
    const req = approvalReq;

    // Use new flow (self-registered users have req.uid); fall back to legacy for old requests
    const result = req.uid
      ? await approveRegistration(req.id, req.email, req.name, teamRole, req.uid)
      : await approvePlannerRequest(req.id, req.email, req.name, teamRole, '', req.phone);

    if (!result.success) {
      toast.error(result.error ?? 'Errore approvazione.');
      setApproving(false);
      return;
    }

    setApprovalReq(null);
    setApproving(false);

    if (result.emailSent) {
      toast.success(`${req.name} approvata/o. Email di conferma inviata.`);
    } else {
      toast.success(`${req.name} approvata/o.`);
      if (result.emailError) {
        toast.warning(`Email non inviata: ${result.emailError}.`);
      }
    }
  }

  async function handleReject(req: PlannerRequest) {
    if (!confirm(`Rifiutare la richiesta di "${req.name}"?`)) return;
    setProcessingReq(req.id);
    const result = await rejectPlannerRequest(req.id, req.email, req.name);
    if (result.success) {
      toast.success(`Richiesta di ${req.name} rifiutata.`);
      if (!result.emailSent && result.emailError) {
        toast.warning(`Email non inviata: ${result.emailError}.`);
      }
    } else {
      toast.error(result.error ?? 'Errore rifiuto.');
    }
    setProcessingReq(null);
  }

  const selectedRoleInfo = TEAM_ROLE_OPTIONS.find((r) => r.value === teamRole);

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      {/* Header */}
      <header
        className="border-b px-4 sm:px-6 py-4 flex items-center justify-between"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}
      >
        <div className="flex items-center gap-4">
          <Link
            href="/planner"
            className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <div className="h-4 w-px" style={{ background: 'var(--tqf-beige-border)' }} />
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg" style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
              <ClipboardList className="size-4" />
            </div>
            <h1 className="text-xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              Richieste di Accesso
            </h1>
          </div>
        </div>

        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-75">
          <Image
            src="/logo.png"
            alt="Te Quiero Feliz"
            width={28}
            height={28}
            className="object-contain"
            style={{ filter: 'invert(9%) sepia(80%) saturate(900%) hue-rotate(308deg) brightness(145%)' }}
          />
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

        {/* Approval Modal */}
        {approvalReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ background: 'rgba(26,15,10,0.6)' }}>
            <div
              className="rounded-2xl p-6 w-full max-w-lg my-4"
              style={{ background: 'white' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-1">
                <UserCheck className="size-5" style={{ color: '#15803d' }} />
                <h2 className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
                  Approva richiesta
                </h2>
              </div>
              <p className="text-sm mb-5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                Stai approvando <strong>{approvalReq.name}</strong> ({approvalReq.email}).
                Assegna un ruolo e imposta la password temporanea.
              </p>

              {/* Role selection */}
              <div className="mb-5">
                <label style={labelStyle}>Ruolo *</label>
                <div className="space-y-2">
                  {TEAM_ROLE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-start gap-3 rounded-xl p-3 cursor-pointer transition-colors"
                      style={{
                        border: `1px solid ${teamRole === opt.value ? 'var(--tqf-bordeaux)' : 'var(--tqf-beige-border)'}`,
                        background: teamRole === opt.value ? 'var(--tqf-cipria-light)' : 'white',
                      }}
                    >
                      <input
                        type="radio"
                        name="teamRole"
                        value={opt.value}
                        checked={teamRole === opt.value}
                        onChange={() => setTeamRole(opt.value)}
                        className="mt-0.5 flex-shrink-0"
                        style={{ accentColor: 'var(--tqf-bordeaux)' }}
                      />
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                          {opt.label}
                        </p>
                        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                          {opt.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleConfirmApprove}
                  disabled={approving}
                  className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ background: '#15803d', color: 'white', fontFamily: 'var(--font-body)' }}
                >
                  {approving ? <Loader2 className="size-4 animate-spin" /> : <UserCheck className="size-4" />}
                  Approva e assegna team
                </button>
                <button
                  onClick={() => setApprovalReq(null)}
                  disabled={approving}
                  className="text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-70"
                  style={{ color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)' }}
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Requests list */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-6 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <div
              className="mx-auto mb-4 size-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}
            >
              <UserCheck className="size-7" />
            </div>
            <h2 className="text-xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              Nessuna richiesta in attesa
            </h2>
            <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              Tutte le richieste sono state gestite.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <span
                className="size-2 rounded-full flex-shrink-0"
                style={{ background: '#d97706' }}
              />
              <p className="text-sm" style={{ color: '#92400e', fontFamily: 'var(--font-body)' }}>
                {requests.length} {requests.length === 1 ? 'richiesta in attesa' : 'richieste in attesa'}
              </p>
            </div>

            {requests.map((req) => (
              <div
                key={req.id}
                className="rounded-2xl overflow-hidden"
                style={{ background: 'white', border: '2px solid #fbbf24' }}
              >
                <div className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="size-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium"
                      style={{ background: '#fef9ee', color: '#b45309', fontFamily: 'var(--font-body)' }}
                    >
                      {req.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                        {req.name}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                        {req.email}
                      </p>
                      {req.phone && (
                        <p className="flex items-center gap-1 text-xs mt-0.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                          <Phone className="size-3" />
                          {req.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="hidden sm:block text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                      {req.createdAt ? new Date(req.createdAt).toLocaleDateString('it-IT') : '—'}
                    </span>
                    <button
                      onClick={() => openApproveModal(req)}
                      disabled={processingReq === req.id}
                      className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
                      style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontFamily: 'var(--font-body)' }}
                    >
                      {processingReq === req.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Check className="size-3.5" />
                      )}
                      Approva
                    </button>
                    <button
                      onClick={() => handleReject(req)}
                      disabled={processingReq === req.id}
                      className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
                      style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', fontFamily: 'var(--font-body)' }}
                    >
                      <UserX className="size-3.5" />
                      Rifiuta
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
