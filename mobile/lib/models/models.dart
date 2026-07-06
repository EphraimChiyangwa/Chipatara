class User {
  final String id;
  final String name;
  final String email;
  final String role;

  User({required this.id, required this.name, required this.email, required this.role});

  factory User.fromJson(Map<String, dynamic> j) => User(
    id: j['id'] ?? j['_id'] ?? '',
    name: j['name'] ?? '',
    email: j['email'] ?? '',
    role: j['role'] ?? 'patient',
  );
}

class DoctorProfile {
  final String specialization;
  final String hospital;
  final double consultationFee;
  final String? bio;
  final bool verified;
  final String licenseNumber;
  final int yearsOfExperience;

  DoctorProfile({
    required this.specialization,
    required this.hospital,
    required this.consultationFee,
    this.bio,
    required this.verified,
    this.licenseNumber = '',
    this.yearsOfExperience = 0,
  });

  factory DoctorProfile.fromJson(Map<String, dynamic> j) => DoctorProfile(
    specialization: j['specialization'] ?? '',
    hospital: j['hospital'] ?? '',
    consultationFee: (j['consultationFee'] ?? 0).toDouble(),
    bio: j['bio'],
    verified: j['verified'] ?? false,
    licenseNumber: j['licenseNumber'] ?? '',
    yearsOfExperience: j['yearsOfExperience'] ?? 0,
  );
}

class Doctor {
  final String id;
  final String name;
  final String email;
  final DoctorProfile? profile;
  final double averageRating;
  final int totalRatings;

  Doctor({
    required this.id,
    required this.name,
    required this.email,
    this.profile,
    this.averageRating = 0,
    this.totalRatings = 0,
  });

  factory Doctor.fromJson(Map<String, dynamic> j) => Doctor(
    id: j['_id'] ?? j['id'] ?? '',
    name: j['name'] ?? '',
    email: j['email'] ?? '',
    profile: j['profile'] != null ? DoctorProfile.fromJson(j['profile']) : null,
    averageRating: (j['averageRating'] ?? 0).toDouble(),
    totalRatings: j['totalRatings'] ?? 0,
  );
}

class AvailabilitySlot {
  final String id;
  final String day;
  final String startTime;
  final String endTime;

  AvailabilitySlot({required this.id, required this.day, required this.startTime, required this.endTime});

  factory AvailabilitySlot.fromJson(Map<String, dynamic> j) => AvailabilitySlot(
    id: j['_id'] ?? '',
    day: j['day'] ?? '',
    startTime: j['startTime'] ?? '',
    endTime: j['endTime'] ?? '',
  );

  String get label => '$day  $startTime – $endTime';
}

class Appointment {
  final String id;
  final dynamic doctor;
  final dynamic patient;
  final String date;
  final String reason;
  final String status;
  final String? notes;
  final double? rating;
  final String? review;

  Appointment({
    required this.id,
    required this.doctor,
    required this.patient,
    required this.date,
    required this.reason,
    required this.status,
    this.notes,
    this.rating,
    this.review,
  });

  String get doctorName {
    if (doctor is Map) return doctor['name'] ?? 'Doctor';
    return 'Doctor';
  }

  String get doctorId {
    if (doctor is Map) return doctor['_id'] ?? doctor['id'] ?? '';
    return doctor?.toString() ?? '';
  }

  String get patientName {
    if (patient is Map) return patient['name'] ?? 'Patient';
    return 'Patient';
  }

  factory Appointment.fromJson(Map<String, dynamic> j) => Appointment(
    id: j['_id'] ?? '',
    doctor: j['doctor'],
    patient: j['patient'],
    date: j['date'] ?? '',
    reason: j['reason'] ?? '',
    status: j['status'] ?? 'pending',
    notes: j['notes'],
    rating: j['rating']?.toDouble(),
    review: j['review'],
  );
}

class HealthMetric {
  final String id;
  final double? heartRate;
  final double? spO2;
  final double? steps;
  final double? temperature;
  final double? systolic;
  final double? diastolic;
  final double? sleepHours;
  final DateTime timestamp;
  final Map<String, dynamic>? device;

  HealthMetric({
    required this.id,
    this.heartRate,
    this.spO2,
    this.steps,
    this.temperature,
    this.systolic,
    this.diastolic,
    this.sleepHours,
    required this.timestamp,
    this.device,
  });

  factory HealthMetric.fromJson(Map<String, dynamic> j) => HealthMetric(
    id: j['_id'] ?? '',
    heartRate: j['heartRate']?.toDouble(),
    spO2: j['spO2']?.toDouble(),
    steps: j['steps']?.toDouble(),
    temperature: j['temperature']?.toDouble(),
    systolic: j['systolic']?.toDouble(),
    diastolic: j['diastolic']?.toDouble(),
    sleepHours: j['sleepHours']?.toDouble(),
    timestamp: DateTime.tryParse(j['timestamp'] ?? '') ?? DateTime.now(),
    device: j['device'],
  );
}

class Medication {
  final String name;
  final String dosage;
  final String frequency;
  final String duration;
  final String instructions;

  Medication({
    required this.name, required this.dosage,
    required this.frequency, required this.duration,
    this.instructions = '',
  });

  factory Medication.fromJson(Map<String, dynamic> j) => Medication(
    name: j['name'] ?? '',
    dosage: j['dosage'] ?? '',
    frequency: j['frequency'] ?? '',
    duration: j['duration'] ?? '',
    instructions: j['instructions'] ?? '',
  );

  Map<String, dynamic> toJson() => {
    'name': name, 'dosage': dosage,
    'frequency': frequency, 'duration': duration,
    'instructions': instructions,
  };
}

class Prescription {
  final String id;
  final dynamic doctor;
  final List<Medication> medications;
  final String notes;
  final DateTime createdAt;

  Prescription({
    required this.id, required this.doctor,
    required this.medications, required this.notes,
    required this.createdAt,
  });

  String get doctorName => doctor is Map ? (doctor['name'] ?? 'Doctor') : 'Doctor';

  factory Prescription.fromJson(Map<String, dynamic> j) => Prescription(
    id: j['_id'] ?? '',
    doctor: j['doctor'],
    medications: (j['medications'] as List? ?? [])
        .map((m) => Medication.fromJson(m as Map<String, dynamic>))
        .toList(),
    notes: j['notes'] ?? '',
    createdAt: DateTime.tryParse(j['createdAt'] ?? '') ?? DateTime.now(),
  );
}

class ChatMessage {
  final String id;
  final String text;
  final String senderId;
  final String senderName;
  final String senderRole;
  final String appointmentId;
  final DateTime createdAt;

  ChatMessage({
    required this.id,
    required this.text,
    required this.senderId,
    required this.senderName,
    required this.senderRole,
    this.appointmentId = '',
    required this.createdAt,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> j) {

    final sender = j['sender'];
    return ChatMessage(
      id: j['_id'] ?? '',
      text: j['text'] ?? j['message'] ?? '',
      senderId: sender is Map ? (sender['_id'] ?? '') : (sender ?? ''),
      senderName: sender is Map ? (sender['name'] ?? '') : '',
      senderRole: sender is Map ? (sender['role'] ?? '') : '',
      appointmentId: j['appointment']?.toString() ?? j['appointmentId']?.toString() ?? '',
      createdAt: DateTime.tryParse(j['createdAt'] ?? '') ?? DateTime.now(),
    );
  }
}
