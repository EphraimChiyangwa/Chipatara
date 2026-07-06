import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/constants.dart';
import '../../services/api_service.dart';
import '../../widgets/widgets.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _email = TextEditingController();
  bool _loading = false;
  bool _sent = false;
  String? _error;

  Future<void> _submit() async {
    final email = _email.text.trim();
    if (email.isEmpty) return;
    setState(() { _loading = true; _error = null; });
    try {
      await ApiService.forgotPassword(email);
      setState(() => _sent = true);
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const SizedBox(height: 16),
          IconButton(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
            style: IconButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: AppColors.textPrimary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 32),
          Container(
            width: 56, height: 56,
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius: BorderRadius.circular(18),
            ),
            child: const Icon(Icons.lock_reset_rounded, color: AppColors.primary, size: 28),
          ),
          const SizedBox(height: 20),
          Text('Reset password', style: GoogleFonts.plusJakartaSans(
            fontSize: 28, fontWeight: FontWeight.w800, color: AppColors.textPrimary,
          )),
          const SizedBox(height: 6),
          Text(
            _sent
              ? 'Check your email for a reset link. It expires in 1 hour.'
              : "Enter your email and we'll send you a reset link.",
            style: GoogleFonts.plusJakartaSans(fontSize: 14, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 32),

          if (_sent) ...[
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: AppShadows.card,
              ),
              child: Column(children: [
                Container(
                  width: 64, height: 64,
                  decoration: BoxDecoration(
                    color: AppColors.successLight,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.mark_email_read_outlined, color: AppColors.success, size: 32),
                ),
                const SizedBox(height: 16),
                Text('Email sent!', style: GoogleFonts.plusJakartaSans(
                  fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.textPrimary,
                )),
                const SizedBox(height: 8),
                Text(
                  'We sent a reset link to ${_email.text.trim()}',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.plusJakartaSans(fontSize: 13, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 20),
                AppButton(
                  label: 'Back to Sign In',
                  onTap: () => Navigator.pop(context),
                  color: AppColors.primary,
                ),
              ]),
            ),
          ] else ...[
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: AppShadows.card,
              ),
              child: Column(children: [
                AppInput(
                  label: 'Email address',
                  hint: 'you@example.com',
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                ),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.dangerLight, borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(children: [
                      const Icon(Icons.error_outline, color: AppColors.danger, size: 16),
                      const SizedBox(width: 8),
                      Expanded(child: Text(_error!, style: GoogleFonts.plusJakartaSans(
                        fontSize: 13, color: AppColors.danger,
                      ))),
                    ]),
                  ),
                ],
                const SizedBox(height: 20),
                AppButton(label: 'Send Reset Link', onTap: _submit, loading: _loading),
              ]),
            ),
          ],
        ]),
      )),
    );
  }
}
