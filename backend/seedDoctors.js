require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const connectDB = require('./config/db')
const User = require('./models/User')
const Doctor = require('./models/Doctor')
const DoctorAvailability = require('./models/DoctorAvailability')

const DOCTORS = [
  {
    name: 'Dr. Amara Nkosi',
    email: 'amara.nkosi@chipatara.health',
    specialization: 'Cardiologist',
    hospital: 'Mater Hospital, Harare',
    consultationFee: 2500,
    bio: 'Board-certified cardiologist with 12 years of experience in interventional cardiology and heart failure management. Trained at UCT Medical School.',
    availability: [
      { day: 'Monday', startTime: '08:00', endTime: '16:00' },
      { day: 'Wednesday', startTime: '08:00', endTime: '16:00' },
      { day: 'Friday', startTime: '08:00', endTime: '13:00' },
    ],
  },
  {
    name: 'Dr. Tendai Moyo',
    email: 'tendai.moyo@chipatara.health',
    specialization: 'General Practitioner',
    hospital: 'Parirenyatwa Hospital, Harare',
    consultationFee: 800,
    bio: 'General practitioner focused on preventive care, chronic disease management, and family medicine. Sees patients of all ages.',
    availability: [
      { day: 'Monday', startTime: '07:30', endTime: '17:00' },
      { day: 'Tuesday', startTime: '07:30', endTime: '17:00' },
      { day: 'Wednesday', startTime: '07:30', endTime: '17:00' },
      { day: 'Thursday', startTime: '07:30', endTime: '17:00' },
      { day: 'Friday', startTime: '07:30', endTime: '13:00' },
    ],
  },
  {
    name: 'Dr. Chipo Dube',
    email: 'chipo.dube@chipatara.health',
    specialization: 'Pediatrician',
    hospital: 'Harare Central Hospital, Harare',
    consultationFee: 1200,
    bio: 'Specialist in child and adolescent medicine with a focus on developmental disorders and vaccination programs. 8 years in practice.',
    availability: [
      { day: 'Tuesday', startTime: '09:00', endTime: '17:00' },
      { day: 'Thursday', startTime: '09:00', endTime: '17:00' },
      { day: 'Saturday', startTime: '09:00', endTime: '13:00' },
    ],
  },
  {
    name: 'Dr. Farai Mutasa',
    email: 'farai.mutasa@chipatara.health',
    specialization: 'Dermatologist',
    hospital: 'Avenues Clinic, Harare',
    consultationFee: 1800,
    bio: 'Dermatologist specialising in skin cancer screening, acne, eczema, and cosmetic dermatology. Fellow of the African Dermatology Association.',
    availability: [
      { day: 'Monday', startTime: '10:00', endTime: '18:00' },
      { day: 'Wednesday', startTime: '10:00', endTime: '18:00' },
      { day: 'Friday', startTime: '10:00', endTime: '15:00' },
    ],
  },
  {
    name: 'Dr. Rutendo Chirwa',
    email: 'rutendo.chirwa@chipatara.health',
    specialization: 'Obstetrician & Gynaecologist',
    hospital: 'Borrowdale Medical Centre, Harare',
    consultationFee: 2000,
    bio: 'OB/GYN with 10 years of experience in high-risk pregnancies, laparoscopic surgery, and reproductive health. Dedicated to compassionate womens healthcare.',
    availability: [
      { day: 'Tuesday', startTime: '08:00', endTime: '16:00' },
      { day: 'Thursday', startTime: '08:00', endTime: '16:00' },
      { day: 'Saturday', startTime: '08:00', endTime: '12:00' },
    ],
  },
  {
    name: 'Dr. Blessing Ncube',
    email: 'blessing.ncube@chipatara.health',
    specialization: 'Psychiatrist',
    hospital: 'Parirenyatwa Hospital, Harare',
    consultationFee: 1500,
    bio: 'Psychiatrist specialising in anxiety, depression, PTSD, and substance use disorders. Provides evidence-based therapy and medication management.',
    availability: [
      { day: 'Monday', startTime: '09:00', endTime: '17:00' },
      { day: 'Wednesday', startTime: '09:00', endTime: '17:00' },
      { day: 'Friday', startTime: '09:00', endTime: '14:00' },
    ],
  },
  {
    name: 'Dr. Takudzwa Sibanda',
    email: 'takudzwa.sibanda@chipatara.health',
    specialization: 'Orthopaedic Surgeon',
    hospital: 'Mater Hospital, Harare',
    consultationFee: 2200,
    bio: 'Orthopaedic surgeon specialising in sports injuries, joint replacement, and spine disorders. Over 500 successful surgeries performed.',
    availability: [
      { day: 'Tuesday', startTime: '08:00', endTime: '16:00' },
      { day: 'Thursday', startTime: '08:00', endTime: '16:00' },
    ],
  },
  {
    name: 'Dr. Simba Mhuru',
    email: 'simba.mhuru@chipatara.health',
    specialization: 'Ophthalmologist',
    hospital: 'Avenues Clinic, Harare',
    consultationFee: 1600,
    bio: 'Eye specialist offering comprehensive eye exams, cataract surgery, LASIK consultations, and diabetic eye disease management.',
    availability: [
      { day: 'Monday', startTime: '08:00', endTime: '15:00' },
      { day: 'Thursday', startTime: '08:00', endTime: '15:00' },
      { day: 'Saturday', startTime: '09:00', endTime: '12:00' },
    ],
  },
  {
    name: 'Dr. Nyasha Zvobgo',
    email: 'nyasha.zvobgo@chipatara.health',
    specialization: 'Endocrinologist',
    hospital: 'Harare Central Hospital, Harare',
    consultationFee: 1900,
    bio: 'Endocrinologist managing diabetes, thyroid disorders, and hormonal imbalances. Strong focus on lifestyle medicine and long-term metabolic health.',
    availability: [
      { day: 'Wednesday', startTime: '09:00', endTime: '17:00' },
      { day: 'Friday', startTime: '09:00', endTime: '17:00' },
    ],
  },
  {
    name: 'Dr. Anesu Maponga',
    email: 'anesu.maponga@chipatara.health',
    specialization: 'Neurologist',
    hospital: 'Borrowdale Medical Centre, Harare',
    consultationFee: 2300,
    bio: 'Neurologist with expertise in migraines, epilepsy, stroke rehabilitation, and multiple sclerosis. Published researcher in neuro-inflammatory conditions.',
    availability: [
      { day: 'Monday', startTime: '09:00', endTime: '16:00' },
      { day: 'Wednesday', startTime: '09:00', endTime: '16:00' },
      { day: 'Friday', startTime: '09:00', endTime: '13:00' },
    ],
  },
]

async function seed() {
  await connectDB()

  const hash = await bcrypt.hash('Doctor@1234', 10)
  let created = 0
  let skipped = 0

  for (const d of DOCTORS) {
    const existing = await User.findOne({ email: d.email })
    if (existing) {
      console.log(`  skip  ${d.name} (already exists)`)
      skipped++
      continue
    }

    // Create the user account
    const user = await User.create({ name: d.name, email: d.email, password: hash, role: 'doctor' })

    // Create verified doctor profile
    await Doctor.create({
      user: user._id,
      specialization: d.specialization,
      hospital: d.hospital,
      consultationFee: d.consultationFee,
      bio: d.bio,
      verified: true,
    })

    // Create availability slots
    for (const slot of d.availability) {
      await DoctorAvailability.create({ doctor: user._id, ...slot })
    }

    console.log(`  added  ${d.name} — ${d.specialization}`)
    created++
  }

  console.log(`\nDone. ${created} doctors added, ${skipped} already existed.`)
  await mongoose.disconnect()
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})
