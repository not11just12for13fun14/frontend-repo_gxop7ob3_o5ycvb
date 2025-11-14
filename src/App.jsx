import { useEffect, useMemo, useRef, useState } from 'react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || ''

function App() {
  const [question, setQuestion] = useState('Solve: 2x + 6 = 14')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [autoSpeak, setAutoSpeak] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [voices, setVoices] = useState([])
  const [voiceIndex, setVoiceIndex] = useState(0)
  const utterRef = useRef(null)
  const base = useMemo(() => BACKEND_URL || window.location.origin.replace('3000', '8000'), [])

  // Load available voices
  useEffect(() => {
    const synth = window.speechSynthesis
    const load = () => {
      const v = synth.getVoices()
      setVoices(v)
    }
    load()
    if (typeof window !== 'undefined') {
      window.speechSynthesis.onvoiceschanged = load
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.speechSynthesis.onvoiceschanged = null
      }
    }
  }, [])

  const speak = (text) => {
    if (!('speechSynthesis' in window)) return
    cancelSpeech()
    const utter = new SpeechSynthesisUtterance(text)
    const voice = voices[voiceIndex] || voices.find(v => /en/i.test(v.lang))
    if (voice) utter.voice = voice
    utter.rate = 1
    utter.pitch = 1
    utter.onstart = () => setSpeaking(true)
    utter.onend = () => setSpeaking(false)
    utter.onerror = () => setSpeaking(false)
    utterRef.current = utter
    window.speechSynthesis.speak(utter)
  }

  const cancelSpeech = () => {
    try {
      window.speechSynthesis.cancel()
    } catch {}
    setSpeaking(false)
  }

  const ask = async () => {
    if (!question.trim()) return
    setLoading(true)
    setResult(null)
    cancelSpeech()
    try {
      const r = await fetch(`${base}/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      })
      const data = await r.json()
      setResult(data)
      // refresh history
      fetch(`${base}/history`).then(res => res.json()).then(h => setHistory(h.items || [])).catch(()=>{})
    } catch (e) {
      setResult({ answer: 'Error contacting solver', explanation: String(e) })
    } finally {
      setLoading(false)
    }
  }

  // Auto-speak when result changes
  useEffect(() => {
    if (autoSpeak && result && result.answer) {
      const text = `${result.answer}. ${result.explanation || ''}`.trim()
      if (text) speak(text)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, autoSpeak, voiceIndex])

  useEffect(() => {
    fetch(`${base}/history`).then(res => res.json()).then(h => setHistory(h.items || [])).catch(()=>{})
  }, [base])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-sky-50 text-gray-800">
      <header className="px-6 py-4 border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">Homework Solver</h1>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={autoSpeak} onChange={e => setAutoSpeak(e.target.checked)} />
              Auto voice
            </label>
            <select
              className="border rounded px-2 py-1 bg-white"
              value={voiceIndex}
              onChange={(e) => setVoiceIndex(Number(e.target.value))}
            >
              {voices.length === 0 ? (
                <option value={0}>System voice</option>
              ) : (
                voices.map((v, i) => (
                  <option key={i} value={i}>{v.name} ({v.lang})</option>
                ))
              )}
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow p-4 sm:p-6 mb-6">
          <label className="block text-sm font-medium mb-2">Ask a question</label>
          <textarea
            className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[90px]"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Type any homework question..."
          />
          <div className="mt-3 flex flex-wrap gap-3 items-center">
            <button
              onClick={ask}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >{loading ? 'Solving…' : 'Solve'}</button>

            <button onClick={() => setQuestion('What is photosynthesis?')} className="px-3 py-2 rounded-lg border">Try a science fact</button>
            <button onClick={() => setQuestion('Evaluate (2^3 + 4) * 5')} className="px-3 py-2 rounded-lg border">Try a math eval</button>

            {result && (
              <div className="ml-auto flex gap-2">
                {!speaking ? (
                  <button onClick={() => speak(`${result.answer}. ${result.explanation || ''}`)} className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50">Speak</button>
                ) : (
                  <button onClick={cancelSpeech} className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50">Stop</button>
                )}
              </div>
            )}
          </div>
        </div>

        {result && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-2">Answer</h2>
            <p className="text-gray-900 whitespace-pre-wrap">{result.answer}</p>
            {result.explanation && (
              <p className="mt-3 text-gray-700 whitespace-pre-wrap">{result.explanation}</p>
            )}
            {Array.isArray(result.sources) && result.sources.length > 0 && (
              <div className="mt-3 text-sm text-gray-600">
                Sources: {result.sources.map((s, i) => (
                  <a key={i} href={s} target="_blank" rel="noreferrer" className="text-indigo-600 underline mr-2">[{i+1}]</a>
                ))}
              </div>
            )}
            {result.qtype === 'general' && (
              <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                Tip: If you want a more direct answer, try adding specific keywords, dates, or an explicit math expression.
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Recent questions</h2>
          <div className="space-y-4">
            {history.map((h) => (
              <div key={h._id} className="border rounded-lg p-3">
                <div className="text-sm text-gray-500">{new Date(h.created_at || h.updated_at || Date.now()).toLocaleString()}</div>
                <div className="font-medium mt-1">Q: {h.question}</div>
                <div className="text-gray-700 mt-1">A: {h.answer}</div>
              </div>
            ))}
            {history.length === 0 && (
              <div className="text-sm text-gray-500">No history yet.</div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
