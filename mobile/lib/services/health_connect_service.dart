import 'package:health/health.dart';
import 'api_service.dart';

class HealthConnectService {
  static final _health = Health();

  static const _types = [
    HealthDataType.HEART_RATE,
    HealthDataType.STEPS,
    HealthDataType.BLOOD_OXYGEN,
    HealthDataType.BLOOD_PRESSURE_SYSTOLIC,
    HealthDataType.BLOOD_PRESSURE_DIASTOLIC,
    HealthDataType.BODY_TEMPERATURE,
    HealthDataType.SLEEP_ASLEEP,
  ];

  static Future<void> configure() async {
    await _health.configure();
  }

  /// Returns true if the user granted all permissions.
  static Future<bool> requestPermissions() async {
    try {
      await configure();
      final perms = _types.map((_) => HealthDataAccess.READ).toList();
      return await _health.requestAuthorization(_types, permissions: perms);
    } catch (_) {
      return false;
    }
  }

  /// Reads the latest 24 h of data, posts it to the backend, and returns
  /// the payload that was sent (or null if nothing was available).
  static Future<Map<String, dynamic>?> syncNow() async {
    await configure();

    final now = DateTime.now();
    final since = now.subtract(const Duration(hours: 24));

    List<HealthDataPoint> points;
    try {
      points = await _health.getHealthDataFromTypes(
        startTime: since,
        endTime: now,
        types: _types,
      );
      points = _health.removeDuplicates(points);
    } catch (_) {
      return null;
    }

    if (points.isEmpty) return null;

    // Pick the most recent reading for each metric
    double? heartRate, spO2, steps, temperature, systolic, diastolic, sleepHours;

    for (final p in points.reversed) {
      final raw = p.value;
      if (raw is! NumericHealthValue) continue;
      final v = raw.numericValue.toDouble();

      switch (p.type) {
        case HealthDataType.HEART_RATE:
          heartRate ??= v;
        case HealthDataType.BLOOD_OXYGEN:
          spO2 ??= v;
        case HealthDataType.STEPS:
          steps ??= v;
        case HealthDataType.BODY_TEMPERATURE:
          temperature ??= v;
        case HealthDataType.BLOOD_PRESSURE_SYSTOLIC:
          systolic ??= v;
        case HealthDataType.BLOOD_PRESSURE_DIASTOLIC:
          diastolic ??= v;
        case HealthDataType.SLEEP_ASLEEP:
          sleepHours ??= v / 60; // stored in minutes → convert to hours
        default:
          break;
      }
    }

    final payload = <String, dynamic>{};
    if (heartRate != null) payload['heartRate'] = heartRate;
    if (spO2 != null) payload['spO2'] = spO2;
    if (steps != null) payload['steps'] = steps;
    if (temperature != null) payload['temperature'] = temperature;
    if (systolic != null) payload['systolic'] = systolic;
    if (diastolic != null) payload['diastolic'] = diastolic;
    if (sleepHours != null) payload['sleepHours'] = sleepHours;

    if (payload.isEmpty) return null;

    await ApiService.syncHealthConnect(payload);
    return payload;
  }
}
