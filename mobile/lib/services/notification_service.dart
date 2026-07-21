import 'dart:convert';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../providers/badge_provider.dart';
import '../screens/chat_screen.dart';
import '../screens/patient/appointment_detail_screen.dart';
import 'api_service.dart';

// Handles background messages — must be a top-level function
@pragma('vm:entry-point')
Future<void> _firebaseBackgroundHandler(RemoteMessage message) async {}

class NotificationService {
  static final _messaging = FirebaseMessaging.instance;
  static final _local = FlutterLocalNotificationsPlugin();
  static GlobalKey<NavigatorState>? _navigatorKey;

  static const _channelId = 'chipatara_appts';
  static const _channelName = 'Appointment Updates';

  static Future<void> init(GlobalKey<NavigatorState> navigatorKey) async {
    _navigatorKey = navigatorKey;

    await _messaging.requestPermission(alert: true, badge: true, sound: true);

    const channel = AndroidNotificationChannel(
      _channelId, _channelName,
      description: 'Notifications for appointment status changes',
      importance: Importance.high,
    );
    await _local
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    await _local.initialize(
      const InitializationSettings(android: androidSettings),
      onDidReceiveNotificationResponse: (details) {
        // Foreground notification tapped — payload is JSON
        if (details.payload != null) {
          final data = jsonDecode(details.payload!) as Map<String, dynamic>;
          _navigate(data['type'] as String?, data['appointmentId'] as String?);
        }
      },
    );

    FirebaseMessaging.onBackgroundMessage(_firebaseBackgroundHandler);

    // Foreground: show in-app banner + update badge
    FirebaseMessaging.onMessage.listen((msg) {
      final n = msg.notification;
      if (n == null) return;
      _saveToInbox(n.title ?? '', n.body ?? '', msg.data);
      _showInAppBanner(n.title ?? '', n.body ?? '', msg.data);
    });

    // Background: notification tapped, app was running
    FirebaseMessaging.onMessageOpenedApp.listen((msg) {
      final n = msg.notification;
      if (n != null) _saveToInbox(n.title ?? '', n.body ?? '', msg.data);
      _navigate(msg.data['type'], msg.data['appointmentId']);
    });

    // Terminated: app launched from notification tap
    // Use post-frame callback so the widget tree is ready before navigating
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final initial = await _messaging.getInitialMessage();
      if (initial != null) {
        _navigate(initial.data['type'], initial.data['appointmentId']);
      }
    });

    await _registerToken();
    _messaging.onTokenRefresh.listen(_sendToken);
  }

  static const _inboxKey = 'notification_inbox';

  static Future<void> _saveToInbox(
      String title, String body, Map<String, dynamic> data) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getStringList(_inboxKey) ?? [];
      final entry = jsonEncode({
        'title': title,
        'body': body,
        'type': data['type'] ?? 'general',
        'appointmentId': data['appointmentId'],
        'time': DateTime.now().toIso8601String(),
      });
      raw.insert(0, entry);
      // keep last 50
      await prefs.setStringList(_inboxKey, raw.take(50).toList());
    } catch (_) {}
  }

  static Future<List<Map<String, dynamic>>> getInbox() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getStringList(_inboxKey) ?? [];
      return raw
          .map((s) => jsonDecode(s) as Map<String, dynamic>)
          .toList();
    } catch (_) { return []; }
  }

  static Future<void> clearInbox() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_inboxKey);
  }

  static void _showInAppBanner(String title, String body, Map<String, dynamic> data) {
    final context = _navigatorKey?.currentContext;
    if (context == null || !context.mounted) return;
    // Update badge
    try { context.read<BadgeProvider>().setNotifUnread(); } catch (_) {}
    // Show styled SnackBar
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      backgroundColor: const Color(0xFF1E3A5F),
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      duration: const Duration(seconds: 5),
      content: Row(children: [
        Container(
          width: 36, height: 36,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Icon(Icons.notifications_rounded, color: Colors.white, size: 18),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(title, style: GoogleFonts.plusJakartaSans(
              color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13,
            )),
            Text(body, style: GoogleFonts.plusJakartaSans(
              color: Colors.white70, fontSize: 12,
            ), maxLines: 1, overflow: TextOverflow.ellipsis),
          ],
        )),
      ]),
      action: SnackBarAction(
        label: 'View',
        textColor: const Color(0xFF93C5FD),
        onPressed: () => _navigate(data['type'] as String?, data['appointmentId'] as String?),
      ),
    ));
  }

  static Future<void> _navigate(String? type, String? appointmentId) async {
    if (appointmentId == null) return;
    final context = _navigatorKey?.currentContext;
    if (context == null) return;

    try {
      final appt = await ApiService.getAppointmentById(appointmentId);
      if (!context.mounted) return;

      if (type == 'chat') {
        Navigator.push(context, MaterialPageRoute(
          builder: (_) => ChatScreen(appointment: appt),
        ));
      } else {
        // appointment notification — only patient has detail screen
        Navigator.push(context, MaterialPageRoute(
          builder: (_) => AppointmentDetailScreen(
            appointment: appt,
            onRefresh: () {},
          ),
        ));
      }
    } catch (_) {}
  }

  static Future<void> _registerToken() async {
    try {
      final token = await _messaging.getToken();
      if (token != null) await _sendToken(token);
    } catch (_) {}
  }

  static Future<void> _sendToken(String token) async {
    try {
      await ApiService.registerFcmToken(token);
    } catch (_) {}
  }
}
