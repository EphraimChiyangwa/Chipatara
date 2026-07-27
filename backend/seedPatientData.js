require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const connectDB = require('./config/db')
const User = require('./models/User')
const Doctor = require('./models/Doctor')
const Appointment = require('./models/Appointment')
const Prescription = require('./models/Prescription')
const HealthJournal = require('./models/HealthJournal')
const HealthMetric = require('./models/HealthMetric')
const Message = require('./models/Message')
const MedicalProfile = require('./models/MedicalProfile')
const Document = require('./models/Document')

const PATIENT_EMAIL = process.argv[2] || 'patient@chipatara.health'
const PATIENT_NAME  = 'Takunda Chiweshe'
const PATIENT_PASS  = 'Patient@1234'

const ago  = (days, h = 10, m = 0) => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(h, m, 0, 0); return d }
const soon = (days, h = 10, m = 0) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d }
const jitter = (n, spread) => n + Math.round((Math.random() - 0.5) * spread)

async function seed() {
  await connectDB()

  // ── 1. Patient account ───────────────────────────────────────────────────────
  let patient = await User.findOne({ email: PATIENT_EMAIL })
  if (!patient) {
    const hash = await bcrypt.hash(PATIENT_PASS, 10)
    patient = await User.create({ name: PATIENT_NAME, email: PATIENT_EMAIL, password: hash, role: 'patient' })
    console.log(`✓ Created patient: ${PATIENT_EMAIL} / ${PATIENT_PASS}`)
  } else {
    console.log(`✓ Found patient: ${patient.name} (${PATIENT_EMAIL})`)
  }

  // Clean up previous seed data for this patient
  const oldAppts = await Appointment.find({ patient: patient._id }).select('_id')
  const oldIds   = oldAppts.map(a => a._id)
  await Promise.all([
    Message.deleteMany({ appointment: { $in: oldIds } }),
    Prescription.deleteMany({ appointment: { $in: oldIds } }),
    Appointment.deleteMany({ patient: patient._id }),
    HealthJournal.deleteMany({ user: patient._id }),
    HealthMetric.deleteMany({ user: patient._id }),
    MedicalProfile.deleteMany({ user: patient._id }),
    Document.deleteMany({ user: patient._id }),
  ])
  console.log('✓ Old seed data cleared')

  // ── 2. Doctors ───────────────────────────────────────────────────────────────
  const dr = async (email) => {
    const u = await User.findOne({ email })
    if (!u) throw new Error(`Doctor not found: ${email} — run seedDoctors.js first`)
    return u
  }
  const drTendai  = await dr('tendai.moyo@chipatara.health')       // GP
  const drAmara   = await dr('amara.nkosi@chipatara.health')        // Cardiologist
  const drNyasha  = await dr('nyasha.zvobgo@chipatara.health')      // Endocrinologist
  const drNcube   = await dr('blessing.ncube@chipatara.health')     // Psychiatrist
  const drFarai   = await dr('farai.mutasa@chipatara.health')       // Dermatologist

  // ── 3. Medical profile ───────────────────────────────────────────────────────
  await MedicalProfile.create({
    user: patient._id,
    bloodType: 'O+',
    allergies: 'Penicillin, Sulfa drugs',
    chronicConditions: 'Hypertension (managed), Pre-diabetes',
    currentMedications: 'Amlodipine 5mg once daily, Metformin 500mg twice daily',
    emergencyContactName: 'Rudo Chiweshe',
    emergencyContactPhone: '+263 77 123 4567',
  })
  console.log('✓ Medical profile created')

  // ── 4. Appointments ──────────────────────────────────────────────────────────
  const appt1 = await Appointment.create({
    patient: patient._id, doctor: drTendai._id,
    date: ago(70, 9, 0),
    reason: 'General checkup and blood pressure monitoring',
    status: 'completed',
    notes: 'BP 138/88. Recommended lifestyle changes and 6-week follow-up. Prescribed Amlodipine 5mg once daily.',
    rating: 5, review: 'Very thorough and professional. Dr. Moyo explained everything clearly.',
    paid: true, paystackReference: 'PSK_DEMO_REF_001',
  })

  const appt2 = await Appointment.create({
    patient: patient._id, doctor: drAmara._id,
    date: ago(55, 10, 0),
    reason: 'Chest tightness and shortness of breath during exercise',
    status: 'completed',
    notes: 'ECG normal sinus rhythm. Symptoms attributed to mild deconditioning and elevated BP. Advised gradual aerobic activity increase. Lipid panel ordered.',
    rating: 4, review: 'Excellent specialist. Very detailed examination and clear explanations.',
    paid: true, paystackReference: 'PSK_DEMO_REF_002',
  })

  const appt3 = await Appointment.create({
    patient: patient._id, doctor: drNyasha._id,
    date: ago(42, 9, 30),
    reason: 'Blood sugar monitoring and diabetes prevention screening',
    status: 'completed',
    notes: 'Fasting glucose 6.1 mmol/L — pre-diabetic range. Started Metformin 500mg BD. Dietary counselling given. HbA1c follow-up in 3 months.',
    rating: 5, review: 'Dr. Zvobgo is knowledgeable and very patient-centered. Great visit.',
    paid: true, paystackReference: 'PSK_DEMO_REF_003',
  })

  const appt4 = await Appointment.create({
    patient: patient._id, doctor: drNcube._id,
    date: ago(25, 11, 0),
    reason: 'Anxiety, poor sleep quality, and work-related stress',
    status: 'completed',
    notes: 'GAD-7 score 11 (moderate anxiety). Initiated CBT-based counselling. Sleep hygiene advice given. No pharmacotherapy at this stage. Review in 4 weeks.',
    rating: 4, review: 'Felt very heard and understood. A transformative session.',
    paid: true, paystackReference: 'PSK_DEMO_REF_004',
  })

  const appt5 = await Appointment.create({
    patient: patient._id, doctor: drFarai._id,
    date: ago(12, 10, 30),
    reason: 'Persistent skin rash on left forearm spreading to neck',
    status: 'completed',
    notes: 'Contact dermatitis, likely triggered by new laundry detergent. Prescribed Hydrocortisone 1% cream and Cetirizine. Advised fragrance-free products.',
    rating: 5, review: 'Quick diagnosis and a very clear, actionable treatment plan.',
    paid: false,
  })

  // Upcoming
  const appt6 = await Appointment.create({
    patient: patient._id, doctor: drTendai._id,
    date: soon(12, 9, 0),
    reason: 'Follow-up: blood pressure medication review and blood work results',
    status: 'confirmed',
    notes: 'Please bring your home BP readings log and fast for 8 hours before the visit.',
    paid: true, paystackReference: 'PSK_DEMO_REF_005',
  })

  const appt7 = await Appointment.create({
    patient: patient._id, doctor: drAmara._id,
    date: soon(27, 10, 0),
    reason: '3-month cardiac follow-up and lipid panel review',
    status: 'pending',
    paid: true, paystackReference: 'PSK_DEMO_REF_006',
  })

  console.log('✓ 7 appointments created (5 completed, 1 confirmed, 1 pending)')

  // ── 5. Prescriptions ─────────────────────────────────────────────────────────
  await Prescription.create({
    appointment: appt1._id, doctor: drTendai._id, patient: patient._id,
    medications: [
      { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily (morning)', duration: '3 months', instructions: 'Take with or without food. Watch for ankle swelling — report if severe.' },
      { name: 'Aspirin', dosage: '75mg', frequency: 'Once daily', duration: '1 month', instructions: 'Take after meals to reduce stomach irritation. Do not crush.' },
    ],
    notes: 'Recheck BP in 6 weeks. Target <130/80 mmHg. Reduce salt, increase physical activity. Keep a daily BP log.',
  })

  await Prescription.create({
    appointment: appt2._id, doctor: drAmara._id, patient: patient._id,
    medications: [
      { name: 'Atorvastatin', dosage: '20mg', frequency: 'Once nightly', duration: '3 months', instructions: 'Take at bedtime. Report any unexplained muscle pain or weakness immediately.' },
    ],
    notes: 'Repeat lipid panel in 3 months. Exercise 30 mins × 5 days/week at moderate intensity. Reduce saturated fats.',
  })

  await Prescription.create({
    appointment: appt3._id, doctor: drNyasha._id, patient: patient._id,
    medications: [
      { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily with meals', duration: '3 months', instructions: 'Always take with food to reduce GI side effects. Do not crush or chew.' },
      { name: 'Vitamin D3', dosage: '1000 IU', frequency: 'Once daily', duration: '3 months', instructions: 'Take with a fatty meal for best absorption.' },
    ],
    notes: 'Strict low-GI diet. HbA1c in 3 months. Fasting glucose target: 4.0–5.4 mmol/L. Log glucose readings weekly.',
  })

  await Prescription.create({
    appointment: appt4._id, doctor: drNcube._id, patient: patient._id,
    medications: [
      { name: 'Melatonin', dosage: '5mg', frequency: 'Once nightly (30 min before bed)', duration: '4 weeks', instructions: 'Avoid screens for 1 hour before taking. Do not drive after use.' },
      { name: 'Magnesium Glycinate', dosage: '400mg', frequency: 'Once nightly', duration: '4 weeks', instructions: 'Take with water. May cause loose stools — reduce dose if needed.' },
    ],
    notes: 'CBT exercises: daily worry journal + progressive muscle relaxation before sleep. Avoid caffeine after 14:00. No screen time after 21:00.',
  })

  await Prescription.create({
    appointment: appt5._id, doctor: drFarai._id, patient: patient._id,
    medications: [
      { name: 'Hydrocortisone 1% cream', dosage: 'Thin layer', frequency: 'Twice daily', duration: '2 weeks', instructions: 'Apply to affected area only. Avoid contact with eyes. Do not use on broken skin.' },
      { name: 'Cetirizine', dosage: '10mg', frequency: 'Once daily', duration: '2 weeks', instructions: 'May cause mild drowsiness. Avoid alcohol while taking.' },
    ],
    notes: 'Switch to fragrance-free, hypoallergenic detergent and soap immediately. Return if rash spreads or persists beyond 2 weeks.',
  })

  console.log('✓ 5 prescriptions created')

  // ── 6. Messages ──────────────────────────────────────────────────────────────
  const insertMessages = async (apptId, exchange, startDate) => {
    const docs = []
    let t = new Date(startDate)
    for (const msg of exchange) {
      t = new Date(t.getTime() + jitter(10, 6) * 60 * 1000)
      docs.push({ appointment: apptId, sender: msg.sender, text: msg.text, createdAt: t, updatedAt: t })
    }
    await Message.collection.insertMany(docs)
  }

  // GP follow-up chat (after appt1)
  await insertMessages(appt1._id, [
    { sender: patient._id,  text: 'Good morning Dr. Moyo. I have been getting headaches in the morning — could it be my blood pressure?' },
    { sender: drTendai._id, text: 'Good morning! Morning headaches can definitely be a sign of elevated BP. Are you taking your Amlodipine consistently?' },
    { sender: patient._id,  text: 'I missed 2 doses this week. I forgot a couple of mornings.' },
    { sender: drTendai._id, text: 'Try setting a daily phone alarm. Missing doses can cause BP spikes. Please measure your BP now and send me the reading.' },
    { sender: patient._id,  text: 'Just checked — it shows 142/90. Is that bad?' },
    { sender: drTendai._id, text: "It's above target. Take today's dose, rest 30 minutes, and re-check. If it stays above 155/95 please go to the nearest clinic. We'll review fully at your next appointment." },
    { sender: patient._id,  text: 'Re-checked after resting: 137/85. Much better. I will set the alarm from now on. Thank you Doctor.' },
    { sender: drTendai._id, text: "Great improvement! Consistency is everything. See you on the 5th — remember to fast 8 hours beforehand for the blood draw." },
  ], ago(67, 8, 30))

  // Psychiatrist follow-up chat (after appt4)
  await insertMessages(appt4._id, [
    { sender: patient._id,  text: 'Hi Dr. Ncube. I tried the progressive muscle relaxation last night. It actually helped more than I expected.' },
    { sender: drNcube._id,  text: "That's wonderful to hear! Consistency is key — practice it every night even when you feel fine. How has your sleep been?" },
    { sender: patient._id,  text: 'Better overall — getting about 6 hours. Still waking up around 3am sometimes though.' },
    { sender: drNcube._id,  text: 'Good progress. The 3am waking is likely anxiety-driven. When it happens, try the 4-7-8 breathing technique instead of reaching for your phone.' },
    { sender: patient._id,  text: 'Will do. The worry journal is also helping — writing things down before bed really does clear the mind.' },
    { sender: drNcube._id,  text: "Excellent! That's exactly how it works. Keep the journal going and I look forward to reviewing your progress at our next session." },
  ], ago(22, 19, 0))

  // Upcoming appointment pre-visit chat (appt6 confirmed)
  await insertMessages(appt6._id, [
    { sender: drTendai._id, text: "Hello Takunda, confirming your appointment next week. Please fast for 8 hours beforehand — we'll be doing a full blood panel." },
    { sender: patient._id,  text: 'Thank you Doctor. Should I skip my Metformin the morning of the test?' },
    { sender: drTendai._id, text: 'Yes — hold your morning Metformin until after the blood draw. Take it with your breakfast immediately after the test.' },
    { sender: patient._id,  text: 'Understood. I have 2 weeks of home BP readings logged. Should I bring that?' },
    { sender: drTendai._id, text: "Absolutely, please bring it — the more data the better. See you then!" },
  ], ago(2, 9, 0))

  console.log('✓ Messages created')

  // ── 7. Health journal ────────────────────────────────────────────────────────
  const journalData = [
    { n: 70, h: 20, entry: 'Had my first consultation with Dr. Moyo today. A little anxious about the BP readings but he was very reassuring and gave me a clear action plan. Starting Amlodipine tomorrow morning.', tags: ['Headache', 'Dizziness'] },
    { n: 64, h: 7,  entry: 'Day 6 on Amlodipine. Mild ankle swelling as the doctor warned — not painful. Morning BP reading 135/85 already, down from 138/88. Seeing early progress.', tags: ['Dizziness'] },
    { n: 55, h: 21, entry: 'Saw Dr. Nkosi the cardiologist today. ECG completely normal — what a relief! Shortness of breath is mostly deconditioning. Time to get moving. Starting gentle morning walks tomorrow.', tags: ['Shortness of breath', 'Chest pain'] },
    { n: 51, h: 7,  entry: 'Day 4 of morning walks. First two days were rough but I am finding my rhythm. Feeling surprisingly energetic afterwards. BP this morning: 132/83.', tags: [] },
    { n: 47, h: 20, entry: 'One week of walking without missing a day. Sleep quality is noticeably better. BP averaging 131/82 this week. Small wins matter.', tags: ['Fatigue'] },
    { n: 42, h: 21, entry: 'Endocrinologist appointment today. Pre-diabetes diagnosis was a shock but Dr. Zvobgo said we caught it early and it is very manageable. Starting Metformin and completely overhauling my diet from today. Cut out sugary drinks.', tags: ['Fatigue'] },
    { n: 39, h: 7,  entry: 'Day 3 on Metformin. Nausea is quite bad in the mornings. Called the clinic and they said to take it strictly with food. Will try with breakfast tomorrow.', tags: ['Nausea', 'Fatigue'] },
    { n: 36, h: 21, entry: 'Taking Metformin with meals is a game-changer — nausea almost gone. Switched to low-GI foods: oats for breakfast, brown rice, more vegetables. Not as hard as I expected.', tags: ['Nausea'] },
    { n: 30, h: 20, entry: 'One month into this journey. Morning glucose 5.4 mmol/L — almost in normal range! Exercise streak at 26 days. Weight down 2kg. Genuinely proud of myself.', tags: [] },
    { n: 26, h: 22, entry: 'Psychiatric consultation with Dr. Ncube today. Opening up about anxiety was harder than I expected but she made me feel completely safe. I have been carrying this stress silently for too long.', tags: ['Fatigue'] },
    { n: 22, h: 21, entry: 'Started the worry journal Dr. Ncube recommended — writing down concerns before bed really does quiet the mind. Falling asleep in 30 minutes instead of over an hour.', tags: ['Fatigue'] },
    { n: 18, h: 20, entry: 'Progressive muscle relaxation is becoming my nightly ritual. Woke up only once at 3am last night instead of the usual multiple times. Sleep is improving gradually.', tags: [] },
    { n: 14, h: 19, entry: 'Noticed the rash on my forearm spreading to my neck. Itchy and getting worse. Booked a dermatology appointment. Hoping it is nothing serious.', tags: ['Cough', 'Fever'] },
    { n: 12, h: 21, entry: 'Dr. Mutasa confirmed contact dermatitis — just a reaction to my new laundry detergent. Such a relief! Switched detergent immediately and started hydrocortisone cream today.', tags: [] },
    { n: 9,  h: 19, entry: 'Rash already 70% better after 3 days on the cream. Morning BP: 128/80 — my best reading ever. Small celebrations for all of this progress.', tags: [] },
    { n: 6,  h: 20, entry: 'Feeling genuinely good. 6 weeks of consistent healthy habits: BP averaging 128/79, glucose 5.1 mmol/L, weight down 2.5kg, sleep better, anxiety lower. This app has helped me stay accountable.', tags: [] },
    { n: 4,  h: 19, entry: 'Follow-up appointment coming in 8 days. Have faithfully logged my BP readings every morning. Excited to show Dr. Moyo the data. Numbers have never been this good.', tags: [] },
    { n: 2,  h: 21, entry: 'Slight headache this evening — probably dehydration. Did not drink enough water today. Taking paracetamol and going to bed early. Reminder: hydration is medicine too.', tags: ['Headache'] },
    { n: 1,  h: 20, entry: 'Good day overall. Went for a 35-minute run — longest session yet. Glucose 5.0 mmol/L after fasting overnight. BP 126/78. Feeling optimistic ahead of my appointment.', tags: [] },
  ]

  for (const { n, h, entry, tags } of journalData) {
    const ts = ago(n, h, 30)
    await HealthJournal.collection.insertOne({ user: patient._id, entry, tags, createdAt: ts, updatedAt: ts })
  }
  console.log(`✓ ${journalData.length} journal entries created`)

  // ── 8. Health metrics (31 days) ──────────────────────────────────────────────
  const now = new Date()
  const metrics = []
  for (let i = 30; i >= 0; i--) {
    const ts = new Date(now)
    ts.setDate(now.getDate() - i)
    ts.setHours(7, 0, 0, 0)
    const improvement = (30 - i) / 30 // 0→1 over the month
    metrics.push({
      user: patient._id,
      heartRate:   jitter(74 - Math.round(improvement * 6), 12),     // 74→68 bpm
      spO2:        Math.min(100, jitter(97, 2)),                      // 96–99%
      steps:       jitter(i < 27 ? 8500 : 5200, 2000),               // increases after starting exercise
      temperature: parseFloat((36.5 + (Math.random() - 0.5) * 0.6).toFixed(1)),
      systolic:    jitter(138 - Math.round(improvement * 11), 6),    // 138→127 mmHg
      diastolic:   jitter(88  - Math.round(improvement * 9),  4),    // 88→79 mmHg
      sleepHours:  parseFloat((6.0 + improvement * 1.2 + (Math.random() - 0.5) * 0.8).toFixed(1)),
      timestamp:   ts,
    })
  }
  await HealthMetric.collection.insertMany(metrics)
  console.log('✓ 31 days of health metrics created')

  // ── 9. Medical documents ─────────────────────────────────────────────────────
  const labText = [
    'CHIPATARA HEALTH SERVICES — Laboratory Report',
    `Patient: ${PATIENT_NAME}   |   Date: ${ago(42).toDateString()}`,
    `Ordered by: Dr. Nyasha Zvobgo (Endocrinologist)`,
    '',
    'GLUCOSE / DIABETES PANEL',
    'Fasting Glucose   6.1 mmol/L    Ref: 3.9–5.5   *** HIGH ***',
    'HbA1c             6.0%           Ref: <5.7%     *** HIGH ***',
    'Fasting Insulin   12.4 µU/mL    Ref: 2.6–24.9  NORMAL',
    '',
    'LIPID PANEL',
    'Total Cholesterol 5.2 mmol/L    Ref: <5.2      BORDERLINE',
    'LDL Cholesterol   3.1 mmol/L    Ref: <3.4      NORMAL',
    'HDL Cholesterol   1.2 mmol/L    Ref: >1.0      NORMAL',
    'Triglycerides     1.8 mmol/L    Ref: <1.7      BORDERLINE HIGH',
    '',
    'HAEMATOLOGY',
    'Haemoglobin       14.2 g/dL     Ref: 13–17     NORMAL',
    'WBC               6.8 x10⁹/L   Ref: 4–11      NORMAL',
    'Platelets         245 x10⁹/L   Ref: 150–400   NORMAL',
    '',
    'RENAL FUNCTION',
    'Creatinine        82 µmol/L     Ref: 62–106    NORMAL',
    'eGFR              91 mL/min     Ref: >60       NORMAL',
    '',
    'Reported by: MLT T. Mhondoro   |   Chipatara Reference Lab',
  ].join('\n')

  await Document.create({
    user: patient._id,
    name: 'Blood Panel Results — June 2026.txt',
    docType: 'lab_result',
    mimeType: 'text/plain',
    sizeKb: 2,
    data: Buffer.from(labText).toString('base64'),
  })

  const rxText = [
    'CHIPATARA HEALTH SERVICES — Prescription',
    `Patient: ${PATIENT_NAME}   |   Date: ${ago(70).toDateString()}`,
    'Prescriber: Dr. Tendai Moyo (General Practitioner)',
    'Reg No: ZMC-2014-5521',
    '',
    'MEDICATIONS:',
    '1. Amlodipine 5mg — one tablet daily in the morning',
    '2. Aspirin 75mg — one tablet daily after meals',
    '',
    'INSTRUCTIONS:',
    '• Monitor blood pressure daily and log all readings',
    '• Reduce dietary sodium to <6g per day',
    '• 30 minutes moderate exercise daily (walking, cycling)',
    '• Return in 6 weeks or immediately if BP >155/95',
    '',
    'Signature: Dr. T. Moyo',
  ].join('\n')

  await Document.create({
    user: patient._id,
    name: 'Prescription — Dr. Moyo May 2026.txt',
    docType: 'prescription',
    mimeType: 'text/plain',
    sizeKb: 1,
    data: Buffer.from(rxText).toString('base64'),
  })

  console.log('✓ 2 documents created')

  // ── Done ─────────────────────────────────────────────────────────────────────
  console.log(`
✅  Patient data seeded successfully
    Email   : ${PATIENT_EMAIL}
    Password: ${PATIENT_PASS}
    Name    : ${patient.name}

    What was created:
    • Medical profile (blood type O+, allergies, conditions, emergency contact)
    • 7 appointments  (5 completed · 1 confirmed · 1 pending)
    • 5 prescriptions (one per completed appointment)
    • 19 chat messages across 3 appointment threads
    • 19 symptom journal entries spanning 70 days
    • 31 days of health metrics (BP, HR, SpO2, steps, sleep, temp)
    • 2 medical documents (lab results + prescription PDF)
  `)

  await mongoose.disconnect()
}

seed().catch(err => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
