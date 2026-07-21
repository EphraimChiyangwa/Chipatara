import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';

class BadgeProvider extends ChangeNotifier {
  int _messagesBadge = 0;
  int _notifBadge    = 0;
  final Set<String> _viewedChats = {};

  int get messagesBadge => _messagesBadge;
  int get notifBadge    => _notifBadge;

  BadgeProvider() { _init(); }

  Future<void> _init() async {
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getBool('notif_unread') ?? false) {
      _notifBadge = 1;
      notifyListeners();
    }
  }

  // Called by MessagesTab after loading appointments
  void updateFromAppointments(List<Appointment> appointments) {
    final n = appointments
        .where((a) => a.status == 'confirmed')
        .where((a) => !_viewedChats.contains(a.id))
        .length;
    if (_messagesBadge == n) return;
    _messagesBadge = n;
    notifyListeners();
  }

  // Called when user opens a specific chat
  void markChatViewed(String id) {
    if (!_viewedChats.add(id)) return;
    if (_messagesBadge > 0) _messagesBadge--;
    notifyListeners();
  }

  // Called when notification inbox is opened
  Future<void> clearNotifBadge() async {
    if (_notifBadge == 0) return;
    _notifBadge = 0;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('notif_unread', false);
  }

  // Called when a push notification arrives while app is open
  Future<void> setNotifUnread() async {
    _notifBadge = 1;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('notif_unread', true);
  }
}
