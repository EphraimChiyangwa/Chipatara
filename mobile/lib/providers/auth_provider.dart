import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  User? _user;
  String? _token;
  bool _loading = true;

  User? get user => _user;
  String? get token => _token;
  bool get loading => _loading;
  bool get isLoading => _loading;
  bool get isLoggedIn => _user != null;
  String? get userId => _user?.id;
  bool get isDoctor => _user?.role == 'doctor';
  bool get isAdmin => _user?.role == 'admin';

  AuthProvider() {
    _restore();
  }

  Future<void> _restore() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('token');
    final name   = prefs.getString('userName');
    final email  = prefs.getString('userEmail');
    final role   = prefs.getString('userRole');
    final id     = prefs.getString('userId');
    final avatar = prefs.getString('userAvatar');
    if (_token != null && id != null) {
      _user = User(id: id, name: name ?? '', email: email ?? '', role: role ?? 'patient', avatar: avatar);
    }
    _loading = false;
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    final res = await ApiService.login(email, password);
    await _saveSession(res);
  }

  Future<void> register(String name, String email, String password, String role) async {
    final res = await ApiService.register(name, email, password, role);
    await _saveSession(res);
  }

  Future<void> _saveSession(Map<String, dynamic> res) async {
    _token = res['token'];
    _user = User.fromJson(res['user']);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', _token!);
    await _persistUser(prefs, _user!);
    notifyListeners();
  }

  Future<void> _persistUser(SharedPreferences prefs, User u) async {
    await prefs.setString('userId', u.id);
    await prefs.setString('userName', u.name);
    await prefs.setString('userEmail', u.email);
    await prefs.setString('userRole', u.role);
    if (u.avatar != null) {
      await prefs.setString('userAvatar', u.avatar!);
    } else {
      await prefs.remove('userAvatar');
    }
  }

  Future<void> updateName(String name) async {
    final res = await ApiService.updateProfile(name: name);
    final updated = User.fromJson(res['user']);
    _user = updated;
    final prefs = await SharedPreferences.getInstance();
    await _persistUser(prefs, updated);
    notifyListeners();
  }

  Future<void> updateAvatar(String? base64Avatar) async {
    final res = await ApiService.updateProfile(avatar: base64Avatar);
    final updated = User.fromJson(res['user']);
    _user = updated;
    final prefs = await SharedPreferences.getInstance();
    await _persistUser(prefs, updated);
    notifyListeners();
  }

  Future<void> logout() async {
    _user = null;
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    notifyListeners();
  }
}
