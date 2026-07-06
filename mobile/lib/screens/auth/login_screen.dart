import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../config/constants.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/widgets.dart';
import 'forgot_password_screen.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  String? _error;

  Future<void> _login() async {
    setState(() { _loading = true; _error = null; });
    try {
      await context.read<AuthProvider>().login(_email.text.trim(), _password.text);
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
          const SizedBox(height: 48),
          // Logo
          Container(
            width: 56, height: 56,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColors.gradientStart, AppColors.gradientEnd],
                begin: Alignment.topLeft, end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(18),
            ),
            child: const Icon(Icons.flash_on_rounded, color: Colors.white, size: 28),
          ),
          const SizedBox(height: 24),
          Text('Welcome back', style: GoogleFonts.plusJakartaSans(
            fontSize: 28, fontWeight: FontWeight.w800, color: AppColors.textPrimary,
          )),
          const SizedBox(height: 6),
          Text('Sign in to your Chipatara account', style: GoogleFonts.plusJakartaSans(
            fontSize: 14, color: AppColors.textSecondary,
          )),
          const SizedBox(height: 36),
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              boxShadow: AppShadows.card,
            ),
            child: Column(children: [
              AppInput(label: 'Email', hint: 'you@example.com', controller: _email, keyboardType: TextInputType.emailAddress),
              const SizedBox(height: 16),
              AppInput(label: 'Password', hint: '••••••••', controller: _password, obscure: true),
              Align(
                alignment: Alignment.centerRight,
                child: GestureDetector(
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ForgotPasswordScreen())),
                  child: Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text('Forgot password?', style: GoogleFonts.plusJakartaSans(
                      fontSize: 13, color: AppColors.primary, fontWeight: FontWeight.w600,
                    )),
                  ),
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: AppColors.dangerLight, borderRadius: BorderRadius.circular(10)),
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
              AppButton(label: 'Sign In', onTap: _login, loading: _loading),
            ]),
          ),
          const SizedBox(height: 20),
          Center(child: GestureDetector(
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RegisterScreen())),
            child: RichText(text: TextSpan(
              text: "Don't have an account? ",
              style: GoogleFonts.plusJakartaSans(color: AppColors.textSecondary, fontSize: 14),
              children: [TextSpan(
                text: 'Sign up',
                style: GoogleFonts.plusJakartaSans(color: AppColors.primary, fontWeight: FontWeight.w700, fontSize: 14),
              )],
            )),
          )),
        ]),
      )),
    );
  }
}
