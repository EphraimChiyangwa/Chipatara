import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/constants.dart';
import '../models/models.dart';

class ApiService {
  static Future<String?> _token() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  static Future<Map<String, String>> _headers({bool auth = true}) async {
    final h = {'Content-Type': 'application/json'};
    if (auth) {
      final t = await _token();
      if (t != null) h['Authorization'] = 'Bearer $t';
    }
    return h;
  }

  static Future<Map<String, dynamic>> _post(String path, Map<String, dynamic> body, {bool auth = false}) async {
    final res = await http.post(
      Uri.parse('$kBaseUrl$path'),
      headers: await _headers(auth: auth),
      body: jsonEncode(body),
    );
    final data = jsonDecode(res.body);
    if (res.statusCode >= 400) throw Exception(data['message'] ?? 'Request failed');
    return data;
  }

  static Future<dynamic> _get(String path) async {
    final res = await http.get(Uri.parse('$kBaseUrl$path'), headers: await _headers());
    final data = jsonDecode(res.body);
    if (res.statusCode >= 400) throw Exception(data['message'] ?? 'Request failed');
    return data;
  }

  static Future<dynamic> _put(String path, Map<String, dynamic> body) async {
    final res = await http.put(
      Uri.parse('$kBaseUrl$path'),
      headers: await _headers(),
      body: jsonEncode(body),
    );
    final data = jsonDecode(res.body);
    if (res.statusCode >= 400) throw Exception(data['message'] ?? 'Request failed');
    return data;
  }

  static Future<dynamic> _delete(String path) async {
    final res = await http.delete(Uri.parse('$kBaseUrl$path'), headers: await _headers());
    if (res.statusCode >= 400) {
      final data = jsonDecode(res.body);
      throw Exception(data['message'] ?? 'Request failed');
    }
    return jsonDecode(res.body);
  }

  // ── Auth ──────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> login(String email, String password) =>
      _post('/auth/login', {'email': email, 'password': password});

  static Future<Map<String, dynamic>> register(String name, String email, String password, String role) =>
      _post('/auth/register', {'name': name, 'email': email, 'password': password, 'role': role});

  static Future<void> changePassword(String current, String next) =>
      _put('/auth/change-password', {'currentPassword': current, 'newPassword': next});

  static Future<Map<String, dynamic>> updateProfile(String name) async =>
      await _put('/auth/profile', {'name': name}) as Map<String, dynamic>;

  static Future<void> forgotPassword(String email) =>
      _post('/auth/forgot-password', {'email': email});

  // ── Doctors ───────────────────────────────────────────────────
  static Future<List<Doctor>> getDoctors({String search = '', String specialization = ''}) async {
    var url = '/doctors?';
    if (search.isNotEmpty) url += 'search=${Uri.encodeComponent(search)}&';
    if (specialization.isNotEmpty) url += 'specialization=${Uri.encodeComponent(specialization)}';
    final data = await _get(url) as List;
    return data.map((d) => Doctor.fromJson(d)).toList();
  }

  static Future<List<Map<String, dynamic>>> getDoctorReviews(String doctorId) async {
    final data = await _get('/doctors/$doctorId/reviews') as List;
    return data.cast<Map<String, dynamic>>();
  }

  static Future<List<String>> getSpecializations() async {
    final data = await _get('/doctors/specializations') as List;
    return data.cast<String>();
  }

  static Future<List<AvailabilitySlot>> getAvailability(String doctorId) async {
    final data = await _get('/availability/$doctorId') as List;
    return data.map((s) => AvailabilitySlot.fromJson(s)).toList();
  }

  static Future<AvailabilitySlot> addAvailabilitySlot(String day, String start, String end) async {
    final data = await _post('/availability', {'day': day, 'startTime': start, 'endTime': end}, auth: true);
    return AvailabilitySlot.fromJson(data['availability'] as Map<String, dynamic>);
  }

  static Future<void> deleteAvailabilitySlot(String id) => _delete('/availability/$id');

  // ── Appointments ──────────────────────────────────────────────
  static Future<Appointment> getAppointmentById(String id) async {
    final data = await _get('/appointments/$id') as Map<String, dynamic>;
    return Appointment.fromJson(data);
  }

  static Future<List<Appointment>> getPatientAppointments() async {
    final data = await _get('/appointments/patient') as List;
    return data.map((a) => Appointment.fromJson(a)).toList();
  }

  static Future<List<Appointment>> getDoctorAppointments() async {
    final data = await _get('/appointments/doctor') as List;
    return data.map((a) => Appointment.fromJson(a)).toList();
  }

  static Future<Map<String, dynamic>> bookAppointment({
    required String doctorId,
    required String date,
    required String reason,
    required String slotId,
  }) => _post('/appointments', {
    'doctorId': doctorId,
    'date': date,
    'reason': reason,
    'availabilitySlotId': slotId,
  }, auth: true);

  static Future<void> cancelAppointment(String id) =>
      _put('/appointments/$id/cancel', {});

  static Future<void> rescheduleAppointment(String id, DateTime date) =>
      _put('/appointments/$id/reschedule', {'date': date.toIso8601String()});

  static Future<void> updateAppointmentStatus(String id, String status) =>
      _put('/appointments/$id/status', {'status': status});

  static Future<void> rateAppointment(String id, double rating, String review) =>
      _put('/appointments/$id/rating', {'rating': rating, 'review': review});

  // ── Health metrics ────────────────────────────────────────────
  static Future<List<HealthMetric>> getMyHealthMetrics() async {
    final data = await _get('/devices/metrics') as List;
    return data.map((m) => HealthMetric.fromJson(m)).toList();
  }

  // ── Messages ──────────────────────────────────────────────────
  static Future<List<ChatMessage>> getMessages(String appointmentId) async {
    final data = await _get('/messages/$appointmentId') as List;
    return data.map((m) => ChatMessage.fromJson(m)).toList();
  }

  // ── AI ────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> checkSymptoms(String symptoms) =>
      _post('/ai/symptoms', {'symptoms': symptoms});

  // ── Medical profile ───────────────────────────────────────────
  static Future<Map<String, dynamic>?> getMyMedicalProfile() async {
    try {
      return await _get('/medical-profile') as Map<String, dynamic>?;
    } catch (_) { return null; }
  }

  static Future<void> saveMedicalProfile(Map<String, dynamic> data) =>
      _put('/medical-profile', data);

  // ── Doctor profile ────────────────────────────────────────────
  static Future<Map<String, dynamic>> getDoctorStats() async =>
      await _get('/doctors/stats') as Map<String, dynamic>;

  static Future<DoctorProfile?> getMyDoctorProfile() async {
    try {
      final data = await _get('/doctors/me');
      if (data == null) return null;
      return DoctorProfile.fromJson(data as Map<String, dynamic>);
    } catch (_) { return null; }
  }

  static Future<void> saveDoctorProfile(Map<String, dynamic> data) =>
      _post('/doctors/profile', data, auth: true);

  static Future<void> updateDoctorProfile(Map<String, dynamic> data) =>
      _put('/doctors/profile', data);

  static Future<void> saveConsultationNotes(String appointmentId, String notes) =>
      _put('/appointments/$appointmentId/notes', {'notes': notes});

  // ── Prescriptions ─────────────────────────────────────────────
  static Future<void> savePrescription(
    String appointmentId,
    List<Map<String, dynamic>> medications,
    String notes,
  ) => _post('/prescriptions', {
    'appointmentId': appointmentId,
    'medications': medications,
    'notes': notes,
  }, auth: true);

  // ── Payments ──────────────────────────────────────────────────
  static Future<Map<String, dynamic>> initializePayment({
    required String doctorId,
    required String date,
    required String reason,
  }) => _post('/payments/initialize', {'doctorId': doctorId, 'date': date, 'reason': reason}, auth: true);

  static Future<Map<String, dynamic>> verifyPayment({
    required String reference,
    required String doctorId,
    required String date,
    required String reason,
  }) => _post('/payments/verify', {'reference': reference, 'doctorId': doctorId, 'date': date, 'reason': reason}, auth: true);

  static Future<void> registerFcmToken(String token) =>
      _post('/devices/fcm-token', {'token': token}, auth: true);

  static Future<void> syncHealthConnect(Map<String, dynamic> data) =>
      _post('/devices/health-connect/sync', data, auth: true);

  static Future<Prescription?> getPrescription(String appointmentId) async {
    try {
      final data = await _get('/prescriptions/appointment/$appointmentId');
      if (data == null) return null;
      return Prescription.fromJson(data as Map<String, dynamic>);
    } catch (_) { return null; }
  }

  static Future<List<Prescription>> getMyPrescriptions() async {
    final data = await _get('/prescriptions/my') as List;
    return data.map((p) => Prescription.fromJson(p as Map<String, dynamic>)).toList();
  }
}
