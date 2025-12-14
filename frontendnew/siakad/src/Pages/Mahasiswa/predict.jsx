import React, { useEffect, useState, useRef } from 'react';

// Use the API base you specified
const API_BASE = "http://localhost:5000/api";

function sigmoid(z){ return 1 / (1 + Math.exp(-z)); }
const DEFAULT_MODEL = { w: 4.0, b: -12.0, note: 'default synthetic (sigmoid(4*(ipk-3)))' };

const formatPct = (p) => (p == null ? '-' : `${Math.round(p * 100)}%`);

const PredictChance = ({ ipk, auto = true }) => {
  const [prob, setProb] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modelNote, setModelNote] = useState(null);
  const [modelInfo, setModelInfo] = useState(null); // server model object
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!auto) return;
    if (ipk == null) return;
    fetchModelThenPredict(ipk);
    // eslint-disable-next-line
  }, [ipk, auto]);

  async function fetchModelThenPredict(ipkVal) {
    setLoading(true);
    setError(null);
    setProb(null);
    setModelNote(null);
    setModelInfo(null);

    try {
      // Try get latest model metadata from server
      const rm = await fetch(`${API_BASE}/ml/model`, { credentials: 'include' });
      const jm = await rm.json().catch(()=>null);

      // If server returns model metadata, save it
      if (rm.ok && jm && jm.model) {
        if (!mounted.current) return;
        setModelInfo(jm.model);

        // Try server-side predict (server will apply scaler if saved)
        const rp = await fetch(`${API_BASE}/ml/predict?ipk=${encodeURIComponent(ipkVal)}`, { credentials: 'include' });
        const jp = await rp.json().catch(()=>null);

        if (rp.ok && jp && typeof jp.probability === 'number') {
          if (!mounted.current) return;
          setProb(jp.probability);
          // display threshold info if available
          const thr = jm.model?.metrics?.bestThreshold?.threshold;
          setModelNote(`trained model (server) — id=${jm.model.id}${thr ? ` • threshold ${(thr*100).toFixed(1)}%` : ''}`);
          setLoading(false);
          return;
        }

        // fallback: compute locally using returned model params (apply scaler if present)
        if (jm.model && typeof jm.model.w === 'number' && typeof jm.model.b === 'number') {
          let scaledIpk = Number(ipkVal);
          try {
            const scaler = jm.model.scaler && typeof jm.model.scaler === 'object' ? jm.model.scaler : (jm.model.scaler ? JSON.parse(jm.model.scaler) : null);
            if (scaler && typeof scaler.mean === 'number' && typeof scaler.std === 'number') {
              scaledIpk = (Number(ipkVal) - scaler.mean) / (scaler.std || 1);
            }
          } catch (e) {
            // ignore parse errors
          }
          const pLocal = sigmoid(jm.model.b + jm.model.w * scaledIpk);
          if (!mounted.current) return;
          setProb(pLocal);
          const thr = jm.model?.metrics?.bestThreshold?.threshold;
          setModelNote(`trained model (client) — id=${jm.model.id}${thr ? ` • threshold ${(thr*100).toFixed(1)}%` : ''}`);
          setLoading(false);
          return;
        }
      }

      // no server model -> fallback to default synthetic model
      const p = sigmoid(DEFAULT_MODEL.b + DEFAULT_MODEL.w * Number(ipkVal));
      if (!mounted.current) return;
      setProb(p);
      setModelNote(DEFAULT_MODEL.note);
    } catch (e) {
      console.error('PredictChance error', e);
      // fallback to default model on error
      const p = sigmoid(DEFAULT_MODEL.b + DEFAULT_MODEL.w * Number(ipkVal));
      if (!mounted.current) return;
      setProb(p);
      setModelNote(DEFAULT_MODEL.note + ' (fallback)');
      setError('Terjadi kesalahan saat menghubungi server. Menampilkan perkiraan default.');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }

  const handleManual = () => {
    if (ipk == null) return setError('IPK belum tersedia');
    fetchModelThenPredict(ipk);
  };

  if (ipk == null) return <div className="message-box">IPK belum tersedia</div>;

  // decide threshold and label
  const threshold = modelInfo?.metrics?.bestThreshold?.threshold ?? modelInfo?.metrics?.bestThreshold?.threshold ?? 0.5;
  const pct = prob != null ? Math.round(prob * 100) : null;
  const color = prob == null ? '#ddd' : (prob >= 0.85 ? '#16a34a' : prob >= 0.7 ? '#059669' : prob >= 0.5 ? '#f59e0b' : prob >= 0.3 ? '#f97316' : '#ef4444');
  const willPass = prob != null ? (prob >= (threshold ?? 0.5)) : null;

  return (
    <div className="card" style={{padding:12}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <strong>Prediksi Peluang Lulus</strong>
        <div style={{fontSize:13,color:'#6b7280'}}>IPK: {ipk}</div>
      </div>

      {modelInfo && (
        <div style={{fontSize:12, color:'#374151', marginTop:8}}>
          Model server: id={modelInfo.id} w={Number(modelInfo.w).toFixed(4)} b={Number(modelInfo.b).toFixed(4)} trained_at={new Date(modelInfo.trained_at).toLocaleString()}
          {modelInfo.metrics?.bestThreshold?.threshold != null && (
            <span style={{marginLeft:8, color:'#6b7280'}}>threshold={(modelInfo.metrics.bestThreshold.threshold*100).toFixed(1)}%</span>
          )}
        </div>
      )}

      {error && <div style={{color:'#b91c1c', marginTop:8}}>{error}</div>}

      {loading ? (
        <div style={{marginTop:8}}>Menghitung... ⏳</div>
      ) : (
        <>
          <div style={{display:'flex', alignItems:'center', gap:12, marginTop:8}}>
            <div style={{fontSize:28,fontWeight:700}}>{formatPct(prob)}</div>
            <div style={{flex:1}}>
              <div style={{height:10, background:'#f3f4f6', borderRadius:8, overflow:'hidden'}}>
                <div style={{width: `${pct || 0}%`, height:'100%', background: color}} />
              </div>
              <div style={{fontSize:13, color:'#374151', marginTop:6}}>{modelNote}</div>
              {willPass != null && (
                <div style={{marginTop:8, fontWeight:700, color: willPass ? '#166534' : '#991b1b'}}>
                  {willPass ? 'Diprediksi: Lulus' : 'Diprediksi: Tidak Lulus'}
                </div>
              )}
            </div>
          </div>

          <div style={{marginTop:10, display:'flex', gap:8}}>
            <button
              onClick={handleManual}
              disabled={loading}
              style={{padding:'6px 10px', borderRadius:6, border:'1px solid #d1d5db', background:'#fff'}}
            >
              Hitung Ulang
            </button>

            <button
              onClick={() => { window.open(`${API_BASE}/ml/model`, '_blank'); }}
              style={{padding:'6px 10px', borderRadius:6, border:'1px solid #d1d5db', background:'#fff'}}
            >
              Lihat Model
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PredictChance;