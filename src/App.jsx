import { useEffect, useMemo, useState } from 'react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || ''

function App() {
  const [question, setQuestion] = useState('Solve: 2x + 6 = 14')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const base = useMemo(() => BACKEND_URL || window.location.origin.replace('3000', '8000'), [])

  const ask = async () => {
    if (!question.trim()) return
    setLoading(true)
    setResult(null)
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

  useEffect(() => {
    fetch(`${base}/history`).then(res => res.json()).then(h => setHistory(h.items || [])).catch(()=>{})
  }, [base])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-sky-50 text-gray-800">
      <header className="px-6 py-4 border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">Homework Solver</h1>
          <span className="text-sm text-gray-500">Math, facts, and quick explanations</span>
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
          <div className="mt-3 flex gap-3">
            <button
              onClick={ask}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >{loading ? 'Solving…' : 'Solve'}</button>
            <button onClick={() => setQuestion('What is photosynthesis?')} className="px-3 py-2 rounded-lg border">Try a science fact</button>
            <button onClick={() => setQuestion('Evaluate (2^3 + 4) * 5')} className="px-3 py-2 rounded-lg border">Try a math eval</button>
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
