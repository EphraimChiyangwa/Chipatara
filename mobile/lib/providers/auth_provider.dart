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
    final name  = prefs.getString('userName');
    final email = prefs.getString('userEmail');
    final role  = prefs.getString('userRole');
    final id    = prefs.getString('userId');
    if (_token != null && id != null) {
      _user = User(id: id, name: name ?? '', email: email ?? '', role: role ?? 'patient');
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
    final userData = res['user'];
    _user = User.fromJson(userData);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', _token!);
    await prefs.setString('userId', _user!.id);
    await prefs.setString('userName', _user!.name);
    await prefs.setString('userEmail', _user!.email);
    await prefs.setString('userRole', _user!.role);
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
