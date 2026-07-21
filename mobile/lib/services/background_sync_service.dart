import 'package:flutter/widgets.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:workmanager/workmanager.dart';
import 'package:timezone/data/latest_all.dart' as tz;
import 'health_connect_service.dart';

const _kTaskUniqueName = 'chipatara.healthSync';
const _kTaskName       = 'healthSync';
const _kEnabledKey     = 'autoSyncEnabled';
const _kLastSyncKey    = 'lastHealthSync';

// ── Background callback — must be a top-level function ────────────────────────
@pragma('vm:entry-point')
void backgroundCallbackDispatcher() {
  Workmanager().executeTask((task, _) async {
    try {
      WidgetsFlutterBinding.ensureInitialized();
      tz.initializeTimeZones();

      final prefs = await SharedPreferences.getInstance();
      if (prefs.getString('token') == null) return true;
      if (!(prefs.getBool(_kEnabledKey) ?? false)) return true;

      final payload = await HealthConnectService.syncNow();
      if (payload != null) {
        await prefs.setString(_kLastSyncKey, DateTime.now().toIso8601String());
        await _notifyIfAbnormal(payload);
      }
    } catch (_) {}
    return true;
  });
}

// ── Abnormal vitals push alert ─────────────────────────────────────────────────
Future<void> _notifyIfAbnormal(Map<String, dynamic> payload) async {
  final alerts = <String>[];

  final hr  = (payload['heartRate']  as num?)?.toDouble();
  final spo = (payload['spO2']       as num?)?.toDouble();
  final tmp = (payload['temperature']as num?)?.toDouble();
  final sys = (payload['systolic']   as num?)?.toDouble();

  if (hr  != null && (hr  > 120 || hr  < 40)) alerts.add('Heart rate ${hr.round()} bpm');
  if (spo != null && spo < 94)                 alerts.add('SpO₂ ${spo.round()}%');
  if (tmp != null && tmp > 38.5)               alerts.add('Temp ${tmp.toStringAsFixed(1)} °C');
  if (sys != null && sys > 140)                alerts.add('BP ${sys.round()} mmHg');

  if (alerts.isEmpty) return;

  const channel = AndroidNotificationChannel(
    'health_alerts', 'Health Alerts',
    description: 'Alerts for abnormal health readings',
    importance: Importance.high,
  );

  final local = FlutterLocalNotificationsPlugin();
  await local.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
      ?.createNotificationChannel(channel);

  await local.initialize(const InitializationSettings(
    android: AndroidInitializationSettings('@mipmap/ic_launcher'),
  ));

  await local.show(
    88888,
    'Health Alert',
    '${alerts.join(' · ')} — please consult your doctor.',
    const NotificationDetails(
      android: AndroidNotificationDetails(
        'health_alerts', 'Health Alerts',
        importance: Importance.high,
        priority: Priority.high,
      ),
    ),
  );
}

// ── Public API ────────────────────────────────────────────────────────────────
class BackgroundSyncService {
  static Future<void> init() async {
    await Workmanager().initialize(
      backgroundCallbackDispatcher,
      isInDebugMode: false,
    );
  }

  static Future<void> enable() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_kEnabledKey, true);
    await Workmanager().registerPeriodicTask(
      _kTaskUniqueName,
      _kTaskName,
      frequency: const Duration(minutes: 15),
      existingWorkPolicy: ExistingPeriodicWorkPolicy.replace,
      constraints: Constraints(networkType: NetworkType.connected),
    );
  }

  static Future<void> disable() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_kEnabledKey, false);
    await Workmanager().cancelByUniqueName(_kTaskUniqueName);
  }

  static Future<bool> isEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_kEnabledKey) ?? false;
  }

  static Future<DateTime?> lastSyncTime() async {
    final prefs = await SharedPreferences.getInstance();
    final s = prefs.getString(_kLastSyncKey);
    return s != null ? DateTime.tryParse(s) : null;
  }

  static Future<void> recordSync() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kLastSyncKey, DateTime.now().toIso8601String());
  }
}
