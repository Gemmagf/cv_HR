import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { analyticsApi, assignmentsApi } from '../utils/api'
import { useAuthStore } from '../store/authStore'
import { Users, Briefcase, CheckCircle, TrendingUp, Building2, AlertTriangle, ArrowRight } from 'lucide-react'

function KpiCard({ title, value, icon: Icon, color, subtitle }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className={`text-3xl font-black ${color}`}>{value ?? '—'}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-opacity-10 ${color.replace('text-', 'bg-').replace('-700', '-100').replace('-600', '-100')}`}>
          <Icon size={24} className={color} />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const user  = useAuthStore((s) => s.user)
  const { t } = useTranslation()
  const [kpis, setKpis]       = useState(null)
  const [alertes, setAlertes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([analyticsApi.dashboard(), assignmentsApi.alertes()])
      .then(([k, a]) => { setKpis(k.data); setAlertes(a.data.alertes || []) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-primary-800 border-t-transparent rounded-full" />
    </div>
  )

  const nom = user?.nom?.split(' ')[0] || ''

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('dashboard.greeting', { name: nom })} 👋
        </h1>
        <p className="text-gray-500 mt-1">{t('dashboard.greetingSub')}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <KpiCard title={t('dashboard.kpi.candidates')} value={kpis?.total_candidats}   icon={Users}        color="text-primary-700" subtitle={t('dashboard.kpi.candidatesSub')} />
        <KpiCard title={t('dashboard.kpi.open')}       value={kpis?.encarrecs_oberts}  icon={Briefcase}    color="text-orange-600" />
        <KpiCard title={t('dashboard.kpi.closed')}     value={kpis?.encarrecs_coberts} icon={CheckCircle}  color="text-green-600" />
        <KpiCard title={t('dashboard.kpi.hired')}      value={kpis?.candidats_contractats} icon={TrendingUp} color="text-accent-600" />
        <KpiCard title={t('dashboard.kpi.clients')}    value={kpis?.total_clients}     icon={Building2}    color="text-purple-700" />
        <KpiCard title={t('dashboard.kpi.successRate')} value={kpis?.taxa_exit_pct != null ? `${kpis.taxa_exit_pct}%` : null} icon={TrendingUp} color="text-green-700" subtitle={`${kpis?.total_proposats || 0} proposats`} />
      </div>

      {/* Alertes */}
      {alertes.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-orange-500" />
            {t('dashboard.alerts')}
          </h2>
          <div className="space-y-2">
            {alertes.map((a) => (
              <Link key={a.assignment_id} to={`/encarrecs/${a.assignment_id}/matching`}
                className="flex items-center justify-between card hover:shadow-md transition-shadow p-4">
                <div>
                  <span className="font-medium text-gray-900">{a.titol}</span>
                  <span className="text-sm text-orange-600 ml-3">
                    {t('dashboard.hoursOpen', { h: a.hores_obert })}
                  </span>
                </div>
                <ArrowRight size={16} className="text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Accions ràpides */}
      <h2 className="text-lg font-semibold text-gray-800 mb-3">{t('dashboard.quickActions')}</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { to: '/candidats/upload', label: t('dashboard.actions.upload'),         desc: t('dashboard.actions.uploadSub'),          color: 'bg-primary-800' },
          { to: '/encarrecs',        label: t('dashboard.actions.newAssignment'),   desc: t('dashboard.actions.newAssignmentSub'),   color: 'bg-accent-500' },
          { to: '/candidats',        label: t('dashboard.actions.viewCandidates'),  desc: `${kpis?.total_candidats || 0}`,           color: 'bg-purple-700' },
          { to: '/clients',          label: t('dashboard.actions.clients'),         desc: t('dashboard.actions.clientsSub'),         color: 'bg-green-700' },
        ].map(({ to, label, desc, color }) => (
          <Link key={to} to={to} className={`${color} rounded-xl p-5 text-white hover:opacity-90 transition-opacity`}>
            <div className="font-bold text-base">{label}</div>
            <div className="text-sm opacity-80 mt-1">{desc}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
