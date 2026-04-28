import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { candidatesApi } from '../utils/api'
import toast from 'react-hot-toast'
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react'

const ACCEPTED = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'text/plain': ['.txt'],
}

export default function UploadPage() {
  const [fitxers, setFitxers] = useState([])
  const [processing, setProcessing] = useState(false)
  const [resultats, setResultats] = useState(null)

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

    try {
      if (fitxers.length === 1) {
        const { data } = await candidatesApi.upload(fitxers[0])
        setResultats({ processats: 1, duplicats: 0, errors: [] })
        toast.success(`CV de ${data.nom} processat correctament`)
      } else {
        const { data } = await candidatesApi.uploadMassiu(fitxers)
        setResultats(data)
        toast.success(
          `${data.processats} CV processats · ${data.duplicats} duplicats · ${data.errors?.length || 0} errors`
        )
      }
      setFitxers([])
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error en processar els fitxers')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Pujar CV</h1>
        <p className="text-gray-500 mt-1">
          Puja CV en PDF, Word o text pla. La IA els analitza i extreu tota la informació automàticament.
        </p>
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
          {isDragActive ? 'Deixa anar els fitxers aquí' : 'Arrossega els CV aquí o clica per seleccionar'}
        </p>
        <p className="text-sm text-gray-400 mt-1">PDF, Word, TXT · Fins a 50 fitxers · Màx. 10MB per fitxer</p>
      </div>

      {/* Llista de fitxers */}
      {fitxers.length > 0 && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-gray-700">
              {fitxers.length} fitxer{fitxers.length !== 1 ? 's' : ''} seleccionat{fitxers.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setFitxers([])}
              className="text-sm text-gray-400 hover:text-red-500"
            >
              Netejar tot
            </button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {fitxers.map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <FileText size={16} className="text-primary-600 flex-shrink-0" />
                <span className="flex-1 truncate text-gray-700">{f.name}</span>
                <span className="text-gray-400 text-xs">
                  {(f.size / 1024).toFixed(0)} KB
                </span>
                <button
                  onClick={() => eliminarFitxer(i)}
                  className="text-gray-300 hover:text-red-500"
                >
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
              <>
                <Loader2 size={16} className="animate-spin" />
                Processant amb IA...
              </>
            ) : (
              <>
                <Upload size={16} />
                Processar {fitxers.length} CV
              </>
            )}
          </button>
        </div>
      )}

      {/* Resultats */}
      {resultats && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Resultat del processament</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-black text-green-600">{resultats.processats}</div>
              <div className="text-sm text-gray-500">processats</div>
            </div>
            <div>
              <div className="text-3xl font-black text-yellow-500">{resultats.duplicats}</div>
              <div className="text-sm text-gray-500">duplicats</div>
            </div>
            <div>
              <div className="text-3xl font-black text-red-500">{resultats.errors?.length || 0}</div>
              <div className="text-sm text-gray-500">errors</div>
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
        </div>
      )}
    </div>
  )
}
