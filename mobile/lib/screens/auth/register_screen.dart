import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../config/constants.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/widgets.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _name     = TextEditingController();
  final _email    = TextEditingController();
  final _password = TextEditingController();
  String _role = 'patient';
  bool _loading = false;
  String? _error;

  Future<void> _register() async {
    setState(() { _loading = true; _error = null; });
    try {
      await context.read<AuthProvider>().register(_name.text.trim(), _email.text.trim(), _password.text, _role);
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
          const SizedBox(height: 24),
          IconButton(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.arrow_back_ios_new, size: 20),
          ),
          const SizedBox(height: 16),
          Text('Create account', style: GoogleFonts.plusJakartaSans(
            fontSize: 28, fontWeight: FontWeight.w800, color: AppColors.textPrimary,
          )),
          const SizedBox(height: 6),
          Text('Join Chipatara today', style: GoogleFonts.plusJakartaSans(
            fontSize: 14, color: AppColors.textSecondary,
          )),
          const SizedBox(height: 28),
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              boxShadow: AppShadows.card,
            ),
            child: Column(children: [
              AppInput(label: 'Full Name', hint: 'Your name', controller: _name),
              const SizedBox(height: 16),
              AppInput(label: 'Email', hint: 'you@example.com', controller: _email, keyboardType: TextInputType.emailAddress),
              const SizedBox(height: 16),
              AppInput(label: 'Password', hint: '••••••••', controller: _password, obscure: true),
              const SizedBox(height: 16),
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('I am a', style: GoogleFonts.plusJakartaSans(
                  fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary,
                )),
                const SizedBox(height: 8),
                Row(children: [
                  _RoleChip(label: 'Patient', value: 'patient', selected: _role == 'patient', onTap: () => setState(() => _role = 'patient')),
                  const SizedBox(width: 10),
                  _RoleChip(label: 'Doctor', value: 'doctor', selected: _role == 'doctor', onTap: () => setState(() => _role = 'doctor')),
                ]),
              ]),
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
              AppButton(label: 'Create Account', onTap: _register, loading: _loading),
            ]),
          ),
        ]),
      )),
    );
  }
}

class _RoleChip extends StatelessWidget {
  final String label, value;
  final bool selected;
  final VoidCallback onTap;

  const _RoleChip({required this.label, required this.value, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(child: GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: selected ? AppColors.primaryLight : const Color(0xFFF3F4F6),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: selected ? AppColors.primary : Colors.transparent, width: 1.5),
        ),
        child: Text(label, textAlign: TextAlign.center, style: GoogleFonts.plusJakartaSans(
          fontSize: 14, fontWeight: FontWeight.w600,
          color: selected ? AppColors.primary : AppColors.textSecondary,
        )),
      ),
    ));
  }
}
