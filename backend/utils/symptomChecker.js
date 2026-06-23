'use strict'

// Rule-based symptom checker — no external API needed

const CONDITIONS = [
  {
    name: 'Malaria',
    keywords: ['fever','chills','sweating','headache','muscle ache','fatigue','vomiting','shivering','cold','hot'],
    specialists: ['General Practitioner','Infectious Disease Specialist'],
    urgency: 'high',
    description: 'A mosquito-borne disease common in sub-Saharan Africa causing cyclical fever and flu-like symptoms.',
    advice: 'Seek medical attention promptly for a malaria rapid test. Avoid self-medicating. Stay hydrated and rest.',
  },
  {
    name: 'Typhoid Fever',
    keywords: ['fever','stomach','abdominal','weakness','constipation','diarrhea','rash','loss of appetite','nausea'],
    specialists: ['General Practitioner','Infectious Disease Specialist'],
    urgency: 'high',
    description: 'A bacterial infection causing sustained fever, abdominal pain, and weakness.',
    advice: 'Get tested immediately. Drink only boiled or bottled water. Strict bed rest is recommended.',
  },
  {
    name: 'Upper Respiratory Infection',
    keywords: ['cough','cold','runny nose','sore throat','sneeze','congestion','flu','blocked nose','phlegm','mucus'],
    specialists: ['General Practitioner','ENT Specialist'],
    urgency: 'low',
    description: 'A viral infection affecting the nose, throat, and airways, typically lasting 7–10 days.',
    advice: 'Rest, drink plenty of fluids, and use saline nasal drops. See a doctor if symptoms worsen after 5 days.',
  },
  {
    name: 'Pneumonia',
    keywords: ['cough','breathing','shortness of breath','chest pain','fever','mucus','wheeze','breathless','lungs'],
    specialists: ['Pulmonologist','General Practitioner'],
    urgency: 'high',
    description: 'A lung infection causing inflammation in the air sacs, difficulty breathing, and chest pain.',
    advice: 'Seek medical care urgently. Do not delay — pneumonia can worsen quickly, especially in children and the elderly.',
  },
  {
    name: 'Migraine / Severe Headache',
    keywords: ['headache','migraine','head pain','throbbing','nausea','light sensitivity','dizziness','vomit'],
    specialists: ['Neurologist','General Practitioner'],
    urgency: 'medium',
    description: 'Recurring severe headache often accompanied by nausea, light sensitivity, and visual disturbances.',
    advice: 'Rest in a quiet, dark room. Stay hydrated. See a neurologist if headaches are frequent or very severe.',
  },
  {
    name: 'Hypertension (High Blood Pressure)',
    keywords: ['blood pressure','hypertension','headache','dizziness','blurred vision','chest','heart','palpitation'],
    specialists: ['Cardiologist','General Practitioner'],
    urgency: 'medium',
    description: 'Elevated blood pressure that can lead to stroke or heart disease if left untreated.',
    advice: 'Reduce salt intake, exercise regularly, and take any prescribed medication consistently. Monitor your BP.',
  },
  {
    name: 'Cardiac Emergency',
    keywords: ['chest pain','heart attack','left arm','jaw pain','crushing','pressure chest','heart pain','cardiac'],
    specialists: ['Cardiologist'],
    urgency: 'emergency',
    description: 'Possible heart attack or acute cardiac event requiring immediate emergency care.',
    advice: 'CALL EMERGENCY SERVICES IMMEDIATELY. Chew an aspirin if available and not allergic. Do not drive yourself.',
  },
  {
    name: 'Gastroenteritis',
    keywords: ['diarrhea','vomiting','stomach ache','stomach cramp','nausea','loose stool','dehydration','food poisoning'],
    specialists: ['Gastroenterologist','General Practitioner'],
    urgency: 'medium',
    description: 'Inflammation of the digestive tract causing diarrhoea and vomiting, often from a viral or bacterial source.',
    advice: 'Drink oral rehydration salts (ORS) frequently. Avoid solid food until vomiting stops. See a doctor if symptoms persist beyond 48 hours.',
  },
  {
    name: 'Urinary Tract Infection (UTI)',
    keywords: ['urination','burning','pee','urine','bladder','frequency','urinary','kidney','lower abdomen'],
    specialists: ['Urologist','General Practitioner'],
    urgency: 'medium',
    description: 'A bacterial infection in the urinary system causing painful or frequent urination.',
    advice: 'Drink plenty of water. See a doctor for antibiotics. Avoid holding urine for long periods.',
  },
  {
    name: 'Skin Infection / Dermatitis',
    keywords: ['rash','itch','skin','blisters','swelling','hives','allergy','red skin','scaly','wound','sore'],
    specialists: ['Dermatologist','General Practitioner'],
    urgency: 'low',
    description: 'Skin inflammation or infection that may be caused by bacteria, fungi, viruses, or allergens.',
    advice: 'Keep the affected area clean and dry. Avoid scratching. A dermatologist can prescribe appropriate treatment.',
  },
  {
    name: 'Diabetes',
    keywords: ['thirst','hunger','frequent urination','fatigue','blurred','weight loss','sugar','glucose','diabetes'],
    specialists: ['Endocrinologist','General Practitioner'],
    urgency: 'medium',
    description: 'A metabolic condition affecting blood sugar regulation, requiring long-term management.',
    advice: 'Monitor your blood glucose. Follow a low-sugar diet, exercise regularly, and take prescribed medication.',
  },
  {
    name: 'Anxiety / Stress Disorder',
    keywords: ['anxiety','stress','panic','worry','nervous','restless','racing heart','sweat','depression','mental','sad'],
    specialists: ['Psychiatrist','General Practitioner'],
    urgency: 'low',
    description: 'A mental health condition causing excessive worry, physical tension, and emotional distress.',
    advice: 'Practice deep breathing and mindfulness. Speak to a mental health professional. Reduce caffeine and screen time.',
  },
  {
    name: 'Eye Infection / Vision Problem',
    keywords: ['eye','vision','blurry','red eye','discharge','pain eye','conjunctivitis','itchy eye','watery eye'],
    specialists: ['Ophthalmologist','General Practitioner'],
    urgency: 'medium',
    description: 'Infection or irritation of the eye causing redness, discharge, or blurred vision.',
    advice: 'Avoid touching or rubbing your eyes. Do not share towels. See an eye specialist promptly.',
  },
  {
    name: 'Musculoskeletal Pain',
    keywords: ['back pain','joint','knee','shoulder','bone','muscle pain','arthritis','sprain','stiffness','neck pain'],
    specialists: ['Orthopedist','General Practitioner'],
    urgency: 'low',
    description: 'Pain in the bones, muscles, or joints that may result from injury, overuse, or inflammation.',
    advice: 'Rest the affected area. Apply ice for 20 minutes several times a day. See an orthopedist if pain persists.',
  },
  {
    name: 'Anemia',
    keywords: ['tired','fatigue','pale','weakness','dizzy','shortness of breath','cold hands','iron','blood'],
    specialists: ['General Practitioner','Hematologist'],
    urgency: 'medium',
    description: 'A condition where the blood lacks enough healthy red blood cells, causing fatigue and weakness.',
    advice: 'Eat iron-rich foods (leafy greens, red meat, legumes). Get a blood test to confirm. Take iron supplements if prescribed.',
  },
]

const EMERGENCY_KEYWORDS = ['chest pain','heart attack','cardiac','stroke','unconscious','not breathing','severe bleeding','seizure','crushing']

function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean)
}

function score(symptomText, condition) {
  const words = tokenize(symptomText)
  let hits = 0
  for (const kw of condition.keywords) {
    if (symptomText.toLowerCase().includes(kw)) hits++
  }
  return hits
}

function checkSymptoms(symptoms, patientHistory = '') {
  const fullText = `${symptoms} ${patientHistory}`

  // Emergency override
  const isEmergency = EMERGENCY_KEYWORDS.some(k => fullText.toLowerCase().includes(k))

  const scored = CONDITIONS.map(c => ({ ...c, score: score(fullText, c) }))
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)

  // If nothing matched, return a general fallback
  if (scored.length === 0) {
    return {
      conditions: [{
        name: 'General Illness',
        likelihood: 'medium',
        description: 'Your symptoms did not clearly match a specific condition. A general consultation is recommended.',
      }],
      recommendedSpecialists: ['General Practitioner'],
      urgency: 'medium',
      advice: 'Please consult a General Practitioner who can perform a physical examination and run appropriate tests.',
      disclaimer: 'This is not a medical diagnosis. Please consult a qualified healthcare professional.',
    }
  }

  const maxScore = scored[0].score
  const conditions = scored.map((c, i) => ({
    name: c.name,
    likelihood: i === 0 ? 'high' : c.score >= maxScore * 0.6 ? 'medium' : 'low',
    description: c.description,
  }))

  const specialists = [...new Set(scored.flatMap(c => c.specialists))].slice(0, 3)
  const urgency = isEmergency ? 'emergency' : scored[0].urgency
  const advice = scored[0].advice

  return {
    conditions,
    recommendedSpecialists: specialists,
    urgency,
    advice,
    disclaimer: 'This is not a medical diagnosis. Please consult a qualified healthcare professional.',
  }
}

function recommendDoctor(symptoms) {
  const scored = CONDITIONS.map(c => ({ ...c, score: score(symptoms, c) }))
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0) {
    return { specialization: 'General Practitioner', reason: 'A GP can assess your symptoms and refer you to the right specialist.' }
  }

  const top = scored[0]
  return {
    specialization: top.specialists[0],
    reason: `Based on your symptoms, a ${top.specialists[0]} is best suited to evaluate and treat ${top.name}.`,
  }
}

module.exports = { checkSymptoms, recommendDoctor }
