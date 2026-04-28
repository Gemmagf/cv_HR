import {
  RadarChart as ReRadar, PolarGrid, PolarAngleAxis,
  Radar, ResponsiveContainer, Legend, Tooltip
} from 'recharts'

const COLORS = ['#3949AB', '#00ACC1', '#43A047', '#FB8C00', '#E53935']

/**
 * Gràfica radar per a comparació de candidats (fins a 5)
 * candidats: [{ nom, habilitats, experiencia, formacio, idiomes, ubicacio }]
 */
export default function RadarChart({ candidats = [] }) {
  const dimensions = ['Habilitats', 'Experiència', 'Formació', 'Idiomes', 'Ubicació']
  const keys = ['puntuacio_habilitats', 'puntuacio_experiencia', 'puntuacio_formacio', 'puntuacio_idiomes', 'puntuacio_ubicacio']

  const data = dimensions.map((dim, i) => {
    const entry = { dim }
    candidats.forEach((c) => {
      entry[c.nom] = c[keys[i]] ?? 0
    })
    return entry
  })

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ReRadar data={data} cx="50%" cy="50%" outerRadius={110}>
        <PolarGrid />
        <PolarAngleAxis dataKey="dim" tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v) => `${v?.toFixed(0)}%`} />
        {candidats.map((c, i) => (
          <Radar
            key={c.candidate_id}
            name={c.nom}
            dataKey={c.nom}
            stroke={COLORS[i % COLORS.length]}
            fill={COLORS[i % COLORS.length]}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        ))}
        <Legend />
      </ReRadar>
    </ResponsiveContainer>
  )
}
