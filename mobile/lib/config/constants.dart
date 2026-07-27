import 'package:flutter/material.dart';

// Android emulator: http://10.0.2.2:5000/api
// Physical device on same WiFi: http://10.100.160.109:5000/api
const String kBaseUrl = 'http://localhost:5000/api';
const String kSocketUrl = 'http://localhost:5000';

class AppColors {
  static const primary       = Color(0xFF3B5BDB);
  static const primaryLight  = Color(0xFFEBF0FF);
  static const surface       = Color(0xFFF7F8FD);
  static const cardBg        = Color(0xFFFFFFFF);
  static const background    = Color(0xFFE2E7F5);
  static const textPrimary   = Color(0xFF1B1B2F);
  static const textSecondary = Color(0xFF6B7280);
  static const textMuted     = Color(0xFF9CA3AF);
  static const success       = Color(0xFF059669);
  static const successLight  = Color(0xFFD1FAE5);
  static const danger        = Color(0xFFDC2626);
  static const dangerLight   = Color(0xFFFEE2E2);
  static const warning       = Color(0xFFF59E0B);

  static const gradientStart = Color(0xFF2A44C8);
  static const gradientEnd   = Color(0xFF5B7AF5);
}

class AppShadows {
  static final soft = [
    BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 16, offset: const Offset(0, 4)),
  ];
  static final card = [
    BoxShadow(color: const Color(0xFF3B5BDB).withValues(alpha: 0.06), blurRadius: 20, offset: const Offset(0, 4)),
    BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2)),
  ];
}
