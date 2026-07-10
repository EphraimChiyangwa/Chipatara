import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/timezone.dart' as tz;
import '../models/models.dart';

class MedicineReminderService {
  static const _enabledKey = 'medicine_reminders_enabled';
  static const _channelId = 'medicine_reminders';
  static const _channelName = 'Medicine Reminders';

  static final _local = FlutterLocalNotificationsPlugin();

  static Future<void> _ensureChannel() async {
    const channel = AndroidNotificationChannel(
      _channelId, _channelName,
      description: 'Daily reminders to take your medications',
      importance: Importance.high,
    );
    await _local
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);
  }

  static Future<bool> isEnabled(String prescriptionId) async {
    final prefs = await SharedPreferences.getInstance();
    return (prefs.getStringList(_enabledKey) ?? []).contains(prescriptionId);
  }

  static Future<void> enable(Prescription rx) async {
    await _ensureChannel();

    for (int mIdx = 0; mIdx < rx.medications.length; mIdx++) {
      final med = rx.medications[mIdx];
      final times = _parseTimes(med.frequency);
      for (int tIdx = 0; tIdx < times.length; tIdx++) {
        final id = _notifId(rx.id, mIdx, tIdx);
        final (hour, minute) = times[tIdx];
        await _local.zonedSchedule(
          id,
          'Time for ${med.name}',
          med.dosage.isNotEmpty ? 'Take ${med.dosage}' : 'Take your dose',
          _nextOccurrence(hour, minute),
          const NotificationDetails(
            android: AndroidNotificationDetails(
              _channelId, _channelName,
              importance: Importance.high,
              priority: Priority.high,
              icon: '@mipmap/ic_launcher',
            ),
          ),
          androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
          uiLocalNotificationDateInterpretation:
              UILocalNotificationDateInterpretation.absoluteTime,
          matchDateTimeComponents: DateTimeComponents.time,
        );
      }
    }

    final prefs = await SharedPreferences.getInstance();
    final list = (prefs.getStringList(_enabledKey) ?? []).toList();
    if (!list.contains(rx.id)) list.add(rx.id);
    await prefs.setStringList(_enabledKey, list);
  }

  static Future<void> disable(Prescription rx) async {
    for (int mIdx = 0; mIdx < rx.medications.length; mIdx++) {
      final times = _parseTimes(rx.medications[mIdx].frequency);
      for (int tIdx = 0; tIdx < times.length; tIdx++) {
        await _local.cancel(_notifId(rx.id, mIdx, tIdx));
      }
    }

    final prefs = await SharedPreferences.getInstance();
    final list = (prefs.getStringList(_enabledKey) ?? []).toList();
    list.remove(rx.id);
    await prefs.setStringList(_enabledKey, list);
  }

  // Parses a human-readable frequency string into (hour, minute) pairs
  static List<(int, int)> _parseTimes(String frequency) {
    final f = frequency.toLowerCase();

    if (f.contains('three') || f.contains('3x') ||
        f.contains('3 time') || f.contains('thrice') ||
        f.contains('every 8')) {
      return [(8, 0), (14, 0), (20, 0)];
    }
    if (f.contains('four') || f.contains('4x') ||
        f.contains('4 time') || f.contains('every 6')) {
      return [(7, 0), (12, 0), (17, 0), (22, 0)];
    }
    if (f.contains('twice') || f.contains('2x') ||
        f.contains('2 time') || f.contains('every 12')) {
      return [(8, 0), (20, 0)];
    }
    if (f.contains('meal') || f.contains('food') || f.contains('eating')) {
      return [(7, 30), (13, 0), (19, 0)];
    }
    if (f.contains('night') || f.contains('bed') || f.contains('sleep')) {
      return [(21, 0)];
    }
    if (f.contains('morning')) {
      return [(8, 0)];
    }
    if (f.contains('afternoon') || f.contains('noon')) {
      return [(13, 0)];
    }
    if (f.contains('evening')) {
      return [(18, 0)];
    }
    // Default: once daily at 8am
    return [(8, 0)];
  }

  static tz.TZDateTime _nextOccurrence(int hour, int minute) {
    final now = tz.TZDateTime.now(tz.local);
    var scheduled = tz.TZDateTime(tz.local, now.year, now.month, now.day, hour, minute);
    if (scheduled.isBefore(now)) {
      scheduled = scheduled.add(const Duration(days: 1));
    }
    return scheduled;
  }

  // Deterministic notification ID from prescription ID + indices
  static int _notifId(String prescriptionId, int medIdx, int timeIdx) {
    final base = prescriptionId.hashCode.abs() % 1000000;
    return (base + medIdx * 100 + timeIdx) % 2000000000;
  }

  // Human-readable summary of reminder times for a medication
  static String describeSchedule(String frequency) {
    final times = _parseTimes(frequency);
    if (times.length == 1) {
      final (h, m) = times[0];
      return 'Daily at ${_fmt(h, m)}';
    }
    return 'Daily at ${times.map((t) => _fmt(t.$1, t.$2)).join(', ')}';
  }

  static String _fmt(int h, int m) {
    final suffix = h < 12 ? 'AM' : 'PM';
    final displayH = h % 12 == 0 ? 12 : h % 12;
    final displayM = m.toString().padLeft(2, '0');
    return '$displayH:$displayM $suffix';
  }
}
