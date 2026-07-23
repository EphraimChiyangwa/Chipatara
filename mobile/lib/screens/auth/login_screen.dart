import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:local_auth/local_auth.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../config/constants.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/widgets.dart';
import 'forgot_password_screen.dart';
import 'register_screen.dart';
import '../terms_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  final _email    = TextEditingController();
  final _password = TextEditingController();
  final _localAuth = LocalAuthentication();

  bool _loading      = false;
  bool _bioAvailable = false;
  bool _bioEnabled   = false;
  String? _error;

  late AnimationController _animCtrl;
  late Animation<double>   _fadeIn;
  late Animation<Offset>   _slideUp;

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 700));
    _fadeIn   = CurvedAnimation(parent: _animCtrl, curve: Curves.easeOut);
    _slideUp  = Tween<Offset>(begin: const Offset(0, 0.18), end: Offset.zero)
        .animate(CurvedAnimation(parent: _animCtrl, curve: Curves.easeOutCubic));
    _animCtrl.forward();
    _checkBiometrics();
  }

  @override
  void dispose() {
    _animCtrl.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _checkBiometrics() async {
    try {
      final canCheck  = await _localAuth.canCheckBiometrics;
      final supported = await _localAuth.isDeviceSupported();
      final prefs     = await SharedPreferences.getInstance();
      final enabled   = prefs.getBool('biometric_enabled') ?? false;
      final hasEmail  = (prefs.getString('saved_email') ?? '').isNotEmpty;
      if (mounted) {
        setState(() {
          _bioAvailable = canCheck && supported;
          _bioEnabled   = enabled && hasEmail;
        });
        if (_bioEnabled) _loginWithBiometric();
      }
    } catch (_) {}
  }

  Future<void> _loginWithBiometric() async {
    try {
      final authenticated = await _localAuth.authenticate(
        localizedReason: 'Verify your identity to sign in',
        options: const AuthenticationOptions(biometricOnly: true, stickyAuth: true),
      );
      if (!authenticated || !mounted) return;

      final prefs    = await SharedPreferences.getInstance();
      final email    = prefs.getString('saved_email') ?? '';
      final password = prefs.getString('saved_password') ?? '';
      if (email.isEmpty || password.isEmpty) return;

      if (!mounted) return;
      setState(() { _loading = true; _error = null; });
      await context.read<AuthProvider>().login(email, password);
    } catch (e) {
      if (mounted) setState(() => _error = 'Biometric login failed. Use your password.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _login() async {
    setState(() { _loading = true; _error = null; });
    try {
      await context.read<AuthProvider>().login(_email.text.trim(), _password.text);
      if (_bioEnabled) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('saved_email', _email.text.trim());
        await prefs.setString('saved_password', _password.text);
      }
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return Scaffold(
      backgroundColor: AppColors.gradientStart,
      body: Stack(
        children: [
          // ── Gradient hero background ──────────────────────────────
          Container(
            height: size.height * 0.48,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF1A32A8), AppColors.gradientStart, AppColors.gradientEnd],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
          ),

          // ── Decorative circles ────────────────────────────────────
          Positioned(
            top: -60, right: -60,
            child: Container(
              width: 220, height: 220,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.06),
              ),
            ),
          ),
          Positioned(
            top: 60, right: 40,
            child: Container(
              width: 100, height: 100,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.05),
              ),
            ),
          ),
          Positioned(
            top: 80, left: -40,
            child: Container(
              width: 160, height: 160,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.04),
              ),
            ),
          ),

          // ── Main content ──────────────────────────────────────────
          SafeArea(
            child: Column(
              children: [
                // Brand hero
                SizedBox(
                  height: size.height * 0.38,
                  child: FadeTransition(
                    opacity: _fadeIn,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // App icon
                        Container(
                          width: 88, height: 88,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(26),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.18),
                                blurRadius: 30,
                                offset: const Offset(0, 10),
                              ),
                            ],
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(26),
                            child: Image.asset(
                              'assets/app_icon.png',
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stack) => Container(
                                decoration: const BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: [AppColors.gradientStart, AppColors.gradientEnd],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                ),
                                child: const Icon(Icons.local_hospital_rounded, color: Colors.white, size: 42),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 18),
                        // App name
                        Text(
                          'Chipatara',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 34,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(height: 6),
                        // Tagline
                        Text(
                          'Healthcare at your fingertips',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 14,
                            fontWeight: FontWeight.w400,
                            color: Colors.white.withValues(alpha: 0.75),
                            letterSpacing: 0.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // ── Form card ──────────────────────────────────────
                Expanded(
                  child: SlideTransition(
                    position: _slideUp,
                    child: FadeTransition(
                      opacity: _fadeIn,
                      child: Container(
                        width: double.infinity,
                        decoration: const BoxDecoration(
                          color: Color(0xFFF4F6FB),
                          borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
                        ),
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Welcome back',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 24,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Sign in to continue to your account',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 13,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                              const SizedBox(height: 28),

                              // Fields card
                              Container(
                                padding: const EdgeInsets.all(20),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(20),
                                  boxShadow: AppShadows.card,
                                ),
                                child: Column(
                                  children: [
                                    AppInput(
                                      label: 'Email',
                                      hint: 'you@example.com',
                                      controller: _email,
                                      keyboardType: TextInputType.emailAddress,
                                    ),
                                    const SizedBox(height: 16),
                                    AppInput(
                                      label: 'Password',
                                      hint: '••••••••',
                                      controller: _password,
                                      obscure: true,
                                    ),
                                    Align(
                                      alignment: Alignment.centerRight,
                                      child: GestureDetector(
                                        onTap: () => Navigator.push(context,
                                            MaterialPageRoute(builder: (_) => const ForgotPasswordScreen())),
                                        child: Padding(
                                          padding: const EdgeInsets.only(top: 10),
                                          child: Text(
                                            'Forgot password?',
                                            style: GoogleFonts.plusJakartaSans(
                                              fontSize: 13,
                                              color: AppColors.primary,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                    if (_error != null) ...[
                                      const SizedBox(height: 14),
                                      Container(
                                        padding: const EdgeInsets.all(12),
                                        decoration: BoxDecoration(
                                          color: AppColors.dangerLight,
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                        child: Row(children: [
                                          const Icon(Icons.error_outline, color: AppColors.danger, size: 16),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Text(
                                              _error!,
                                              style: GoogleFonts.plusJakartaSans(
                                                fontSize: 13,
                                                color: AppColors.danger,
                                              ),
                                            ),
                                          ),
                                        ]),
                                      ),
                                    ],
                                    const SizedBox(height: 20),
                                    AppButton(label: 'Sign In', onTap: _login, loading: _loading),
                                  ],
                                ),
                              ),

                              // Biometric
                              if (_bioAvailable && _bioEnabled) ...[
                                const SizedBox(height: 12),
                                GestureDetector(
                                  onTap: _loginWithBiometric,
                                  child: Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.symmetric(vertical: 14),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(14),
                                      border: Border.all(
                                          color: AppColors.primary.withValues(alpha: 0.3)),
                                      boxShadow: AppShadows.soft,
                                    ),
                                    child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                                      const Icon(Icons.fingerprint_rounded,
                                          color: AppColors.primary, size: 22),
                                      const SizedBox(width: 8),
                                      Text(
                                        'Sign in with Biometrics',
                                        style: GoogleFonts.plusJakartaSans(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.primary,
                                        ),
                                      ),
                                    ]),
                                  ),
                                ),
                              ],

                              const SizedBox(height: 24),

                              // Sign up
                              Center(
                                child: GestureDetector(
                                  onTap: () => Navigator.push(context,
                                      MaterialPageRoute(builder: (_) => const RegisterScreen())),
                                  child: RichText(
                                    text: TextSpan(
                                      text: "Don't have an account? ",
                                      style: GoogleFonts.plusJakartaSans(
                                          color: AppColors.textSecondary, fontSize: 14),
                                      children: [
                                        TextSpan(
                                          text: 'Sign up',
                                          style: GoogleFonts.plusJakartaSans(
                                            color: AppColors.primary,
                                            fontWeight: FontWeight.w700,
                                            fontSize: 14,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),

                              const SizedBox(height: 16),
                              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                                GestureDetector(
                                  onTap: () => Navigator.push(context,
                                      MaterialPageRoute(builder: (_) => const TermsScreen())),
                                  child: Text(
                                    'Terms of Service',
                                    style: GoogleFonts.plusJakartaSans(
                                      fontSize: 12,
                                      color: AppColors.textMuted,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                                Text('  ·  ',
                                    style: GoogleFonts.plusJakartaSans(
                                        fontSize: 12, color: AppColors.textMuted)),
                                GestureDetector(
                                  onTap: () => Navigator.push(context,
                                      MaterialPageRoute(
                                          builder: (_) => const PrivacyPolicyScreen())),
                                  child: Text(
                                    'Privacy Policy',
                                    style: GoogleFonts.plusJakartaSans(
                                      fontSize: 12,
                                      color: AppColors.textMuted,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                              ]),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
