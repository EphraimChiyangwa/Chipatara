'use strict'

const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const Anthropic = require('@anthropic-ai/sdk')

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYMPTOMS_SYSTEM = `You are a medical AI assistant for Chipatara, a telemedicine platform in Malawi.
Analyze the patient's described symptoms and respond ONLY with valid JSON — no markdown fences, no extra text.
Use this exact structure:
{
  "conditions": [
    { "name": "string", "likelihood": "high|medium|low", "description": "string (1–2 sentences)" }
  ],
  "recommendedSpecialists": ["string"],
  "urgency": "low|medium|high|emergency",
  "advice": "string (actionable, 2–3 sentences)",
  "disclaimer": "This is not a medical diagnosis. Please consult a qualified healthcare professional."
}
Rules:
- List 2–4 possible conditions ordered by likelihood (most likely first).
- recommendedSpecialists: use common specialist names (e.g. General Practitioner, Cardiologist, Dermatologist).
- urgency "emergency" means the patient should seek immediate emergency care.
- Keep all text concise and plain (no markdown inside JSON values).`

const RECOMMEND_SYSTEM = `You are a medical AI assistant. Based on the described symptoms, recommend the single most appropriate medical specialist.
Respond ONLY with valid JSON — no markdown, no extra text:
{
  "specialization": "string",
  "reason": "string (1 sentence)"
}
Use standard specialist names: General Practitioner, Cardiologist, Dermatologist, Neurologist, Orthopedist,
Gastroenterologist, Pulmonologist, Endocrinologist, Psychiatrist, ENT Specialist, Ophthalmologist, Urologist.`

function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('AI returned an unexpected response format')
  return JSON.parse(match[0])
}

app.post('/api/ai/symptoms', async (req, res) => {
  const { symptoms, patientHistory } = req.body
  if (!symptoms || !symptoms.trim()) {
    return res.status(400).json({ message: 'symptoms is required' })
  }

  const userContent = patientHistory?.trim()
    ? `Patient symptoms: ${symptoms.trim()}\n\nPatient history: ${patientHistory.trim()}`
    : `Patient symptoms: ${symptoms.trim()}`

  try {
    const stream = client.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 2000,
      thinking: { type: 'adaptive' },
      system: SYMPTOMS_SYSTEM,
      messages: [{ role: 'user', content: userContent }]
    })

    const msg = await stream.finalMessage()
    const textBlock = msg.content.find(b => b.type === 'text')
    if (!textBlock) throw new Error('No text response from AI')

    res.json(extractJSON(textBlock.text))
  } catch (err) {
    console.error('[/api/ai/symptoms]', err.message)
    res.status(500).json({ message: err.message || 'AI service error' })
  }
})

app.post('/api/ai/recommend-doctor', async (req, res) => {
  const { symptoms } = req.body
  if (!symptoms || !symptoms.trim()) {
    return res.status(400).json({ message: 'symptoms is required' })
  }

  try {
    const stream = client.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 500,
      thinking: { type: 'adaptive' },
      system: RECOMMEND_SYSTEM,
      messages: [{ role: 'user', content: `Patient symptoms: ${symptoms.trim()}` }]
    })

    const msg = await stream.finalMessage()
    const textBlock = msg.content.find(b => b.type === 'text')
    if (!textBlock) throw new Error('No text response from AI')

    res.json(extractJSON(textBlock.text))
  } catch (err) {
    console.error('[/api/ai/recommend-doctor]', err.message)
    res.status(500).json({ message: err.message || 'AI service error' })
  }
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'chipatara-ai', model: 'claude-opus-4-8' })
})

const PORT = process.env.PORT || 5001
app.listen(PORT, () => console.log(`Chipatara AI service running on http://localhost:${PORT}`))
