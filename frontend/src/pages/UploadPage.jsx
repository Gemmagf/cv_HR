import { useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { useTranslation } from 'react-i18next'
import { candidatesApi } from '../utils/api'
import { recommendTestsForCandidate } from '../utils/skillsEngine'
import SkillTestRecommendations from '../components/modules/SkillTestRecommendations'
import toast from 'react-hot-toast'
import { Upload, FileText, XCircle, Loader2, ArrowRight } from 'lucide-react'

const ACCEPTED = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'text/plain': ['.txt'],
}

export default function UploadPage() {
  const { t } = useTranslation()
  const [fitxers, setFitxers] = useState([])
  const [processing, setProcessing] = useState(false)
  const [resultats, setResultats] = useState(null)
  const [nouCandidat, setNouCandidat] = useState(null)   // candidat retornat pel parser (pujada única)

  const onDrop = useCallback((acceptedFiles) => {
    setFitxers((prev) => [...prev, ...acceptedFiles.slice(0, 50 - prev.length)])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxFiles: 50,
  })

  const eliminarFitxer = (idx) => {
    setFitxers((prev) => prev.filter((_, i) => i !== idx))
  }

  const pujarTots = async () => {
    if (fitxers.length === 0) return

    setProcessing(true)
    setResultats(null)
    setNouCandidat(null)

    try {
      if (fitxers.length === 1) {
        const { data } = await candidatesApi.upload(fitxers[0])
        setResultats({ processats: 1, duplicats: 0, errors: [] })
        setNouCandidat(data)
        toast.success(t('upload.processedOk', { name: data.nom }))
      } else {
        const { data } = await candidatesApi.uploadMassiu(fitxers)
        setResultats(data)
        toast.success(
          `${data.processats} ${t('upload.results.processed')} · ${data.duplicats} ${t('upload.results.duplicates')} · ${data.errors?.length || 0} ${t('upload.results.errors')}`
        )
      }
      setFitxers([])
    } catch (err) {
      toast.error(err.response?.data?.detail || t('upload.error'))
    } finally {
      setProcessing(false)
    }
  }

  // Proactiu: proves que el candidat acabat de pujar pot fer per acreditar el CV
  const recomanacions = useMemo(() => recommendTestsForCandidate(nouCandidat), [nouCandidat])

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('upload.title')}</h1>
        <p className="text-gray-500 mt-1">{t('upload.subtitle')}</p>
      </div>

      {/* Zona de drag & drop */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors mb-6
          ${isDragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'}`}
      >
        <input {...getInputProps()} />
        <Upload size={40} className={`mx-auto mb-3 ${isDragActive ? 'text-primary-600' : 'text-gray-400'}`} />
        <p className="font-semibold text-gray-700">
          {isDragActive ? t('upload.dropping') : t('upload.dropzone')}
        </p>
        <p className="text-sm text-gray-400 mt-1">{t('upload.hint')}</p>
      </div>

      {/* Llista de fitxers */}
      {fitxers.length > 0 && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-gray-700">{t('upload.selected', { n: fitxers.length })}</span>
            <button onClick={() => setFitxers([])} className="text-sm text-gray-400 hover:text-red-500">
              {t('upload.clearAll')}
            </button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {fitxers.map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <FileText size={16} className="text-primary-600 flex-shrink-0" />
                <span className="flex-1 truncate text-gray-700">{f.name}</span>
                <span className="text-gray-400 text-xs">{(f.size / 1024).toFixed(0)} KB</span>
                <button onClick={() => eliminarFitxer(i)} className="text-gray-300 hover:text-red-500">
                  <XCircle size={16} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={pujarTots}
            disabled={processing}
            className="btn-primary w-full mt-4 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {processing ? (
              <><Loader2 size={16} className="animate-spin" /> {t('upload.processing')}</>
            ) : (
              <><Upload size={16} /> {t('upload.processBtn', { n: fitxers.length })}</>
            )}
          </button>
        </div>
      )}

      {/* Resultats */}
      {resultats && (
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">{t('upload.results.title')}</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-black text-green-600">{resultats.processats}</div>
              <div className="text-sm text-gray-500">{t('upload.results.processed')}</div>
            </div>
            <div>
              <div className="text-3xl font-black text-yellow-500">{resultats.duplicats}</div>
              <div className="text-sm text-gray-500">{t('upload.results.duplicates')}</div>
            </div>
            <div>
              <div className="text-3xl font-black text-red-500">{resultats.errors?.length || 0}</div>
              <div className="text-sm text-gray-500">{t('upload.results.errors')}</div>
            </div>
          </div>
          {resultats.errors?.length > 0 && (
            <div className="mt-4 space-y-1">
              {resultats.errors.map((e, i) => (
                <div key={i} className="text-xs text-red-500 flex items-center gap-1">
                  <XCircle size={12} />
                  {e.fitxer}: {e.error}
                </div>
              ))}
            </div>
          )}
          {/* Càrrega massiva: enllaç a cada candidat processat (el backend real els retorna) */}
          {resultats.candidats?.length > 0 && (
            <ul className="mt-4 divide-y divide-gray-100">
              {resultats.candidats.map((c) => (
                <li key={c.id} className="py-2 flex items-center justify-between text-sm">
                  <span className="text-gray-700">{c.nom}</span>
                  <Link to={`/candidats/${c.id}`} className="text-primary-700 font-medium hover:underline flex items-center gap-1">
                    {t('skills.recommended')} ({c.proves_recomanades?.length || 0}) <ArrowRight size={14} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Proactiu: després de pujar un CV, proposem les mini-proves per acreditar-lo */}
      {nouCandidat && (
        <>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="font-semibold text-gray-800">{t('skills.upload.title')}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{t('skills.upload.hint')}</p>
            </div>
            <Link to={`/candidats/${nouCandidat.id}`} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1 flex-shrink-0">
              {t('skills.upload.viewProfile')} <ArrowRight size={14} />
            </Link>
          </div>
          {nouCandidat.habilitats_tecniques?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {nouCandidat.habilitats_tecniques.map((h) => <span key={h} className="badge badge-blue">{h}</span>)}
            </div>
          )}
          <SkillTestRecommendations
            recommendations={recomanacions}
            candidateId={nouCandidat.id}
            candidateName={nouCandidat.nom}
            title={t('skills.recommended')}
            hint={null}
          />
        </>
      )}
    </div>
  )
}
