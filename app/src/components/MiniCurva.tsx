/**
 * Minicurva para os cartões do paciente: só a forma da evolução, sem eixos nem números.
 * Faixa ideal ao fundo (quando houver) e o último ponto em destaque. SVG puro, renderizado no servidor.
 */
export function MiniCurva({
  valores, faixa, destaqueFora = false, cor = "var(--marca)", altura = 56, largura = 300,
}: {
  valores: number[];
  faixa?: { min: number | null; max: number | null };
  destaqueFora?: boolean;
  cor?: string;
  altura?: number;
  /** largura do desenho em unidades: menor = curva mais "alta" no mesmo espaço */
  largura?: number;
}) {
  if (valores.length < 2) return null;
  const L = largura;
  const pad = 6;
  const refs = [faixa?.min, faixa?.max].filter((v): v is number => v !== null && v !== undefined);
  const lo = Math.min(...valores, ...refs);
  const hi = Math.max(...valores, ...refs);
  const folga = (hi - lo) * 0.12 || 1;
  const y0 = lo - folga;
  const y1 = hi + folga;
  const y = (v: number) => pad + (1 - (v - y0) / (y1 - y0)) * (altura - 2 * pad);
  const x = (k: number) => pad + (k / (valores.length - 1)) * (L - 2 * pad);
  const pts = valores.map((v, k) => `${x(k).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const ultimo = valores.length - 1;

  let banda: { topo: number; base: number } | null = null;
  if (faixa && (faixa.min !== null || faixa.max !== null)) {
    banda = { topo: faixa.max !== null ? y(faixa.max) : 0, base: faixa.min !== null ? y(faixa.min) : altura };
  }

  return (
    <svg viewBox={`0 0 ${L} ${altura}`} className="block h-auto w-full" aria-hidden>
      {banda && <rect x="0" y={banda.topo} width={L} height={Math.max(0, banda.base - banda.topo)} fill="var(--faixa)" rx="4" />}
      <polyline points={pts} fill="none" stroke={cor} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(ultimo)} cy={y(valores[ultimo])} r="4.5" fill={destaqueFora ? "var(--fora)" : cor} stroke="var(--cartao)" strokeWidth="2" />
    </svg>
  );
}
