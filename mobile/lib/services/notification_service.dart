import 'dart:convert';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
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

    // Foreground: show local notification (preserving tap data as payload)
    FirebaseMessaging.onMessage.listen((msg) {
      final n = msg.notification;
      if (n == null) return;
      _local.show(
        n.hashCode,
        n.title,
        n.body,
        const NotificationDetails(
          android: AndroidNotificationDetails(
            _channelId, _channelName,
            importance: Importance.high,
            priority: Priority.high,
          ),
        ),
        payload: jsonEncode(msg.data),
      );
    });

    // Background: notification tapped, app was running
    FirebaseMessaging.onMessageOpenedApp.listen((msg) {
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
