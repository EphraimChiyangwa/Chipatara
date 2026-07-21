import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../config/constants.dart';
import '../../models/models.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../widgets/widgets.dart';
import 'health_journal_screen.dart';
import 'medical_documents_screen.dart';
import 'medical_profile_screen.dart';
import 'payment_history_screen.dart';

class ProfileTab extends StatefulWidget {
  const ProfileTab({super.key});

  @override
  State<ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends State<ProfileTab> {
  // Avatar
  bool _avatarLoading = false;

  // Edit name
  final _nameCtrl = TextEditingController();
  bool _nameLoading = false;
  String? _nameMsg;

  // Biometric toggle
  bool _bioEnabled = false;

  // Change password
  final _current = TextEditingController();
  final _newPw   = TextEditingController();
  final _confirm = TextEditingController();
  bool _pwLoading = false;
  String? _pwMsg;

  @override
  void initState() {
    super.initState();
    _loadBioSetting();
  }

  Future<void> _loadBioSetting() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() => _bioEnabled = prefs.getBool('biometric_enabled') ?? false);
  }

  Future<void> _toggleBio(bool value) async {
    if (value) {
      // Ask for password once so we can save credentials for biometric use
      await _showEnableBioDialog();
    } else {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('biometric_enabled', false);
      await prefs.remove('saved_email');
      await prefs.remove('saved_password');
      setState(() => _bioEnabled = false);
    }
  }

  Future<void> _showEnableBioDialog() async {
    final pwCtrl = TextEditingController();
    String? err;
    bool loading = false;

    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setS) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Enable Biometric Login', style: GoogleFonts.plusJakartaSans(
          fontWeight: FontWeight.w800, fontSize: 16,
        )),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Text('Enter your password to confirm. It will be stored securely on this device.',
            style: GoogleFonts.plusJakartaSans(fontSize: 13, color: AppColors.textSecondary)),
          const SizedBox(height: 16),
          AppInput(label: 'Password', hint: '••••••••', controller: pwCtrl, obscure: true),
          if (err != null) ...[
            const SizedBox(height: 8),
            Text(err!, style: GoogleFonts.plusJakartaSans(fontSize: 12, color: AppColors.danger)),
          ],
        ]),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: GoogleFonts.plusJakartaSans(color: AppColors.textMuted)),
          ),
          TextButton(
            onPressed: loading ? null : () async {
              if (pwCtrl.text.isEmpty) { setS(() => err = 'Enter your password.'); return; }
              setS(() { loading = true; err = null; });
              try {
                final user = context.read<AuthProvider>().user;
                await ApiService.login(user?.email ?? '', pwCtrl.text);
                final prefs = await SharedPreferences.getInstance();
                await prefs.setString('saved_email', user?.email ?? '');
                await prefs.setString('saved_password', pwCtrl.text);
                await prefs.setBool('biometric_enabled', true);
                if (mounted) setState(() => _bioEnabled = true);
                if (ctx.mounted) Navigator.pop(ctx);
              } catch (_) {
                setS(() { loading = false; err = 'Incorrect password.'; });
              }
            },
            child: Text('Enable', style: GoogleFonts.plusJakartaSans(
              color: AppColors.primary, fontWeight: FontWeight.w700,
            )),
          ),
        ],
      )),
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final name = context.read<AuthProvider>().user?.name ?? '';
    if (_nameCtrl.text.isEmpty) _nameCtrl.text = name;
  }

  Future<void> _saveName() async {
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) return;
    setState(() { _nameLoading = true; _nameMsg = null; });
    try {
      await context.read<AuthProvider>().updateName(name);
      setState(() => _nameMsg = 'Name updated.');
    } catch (e) {
      setState(() => _nameMsg = e.toString().replaceAll('Exception: ', ''));
    } finally {
      setState(() => _nameLoading = false);
    }
  }

  Future<void> _pickAvatar() async {
    final img = await ImagePicker().pickImage(
      source: ImageSource.gallery, imageQuality: 70, maxWidth: 400,
    );
    if (img == null || !mounted) return;
    final bytes = await img.readAsBytes();
    if (!mounted) return;
    final dataUri = 'data:image/jpeg;base64,${base64Encode(bytes)}';
    setState(() => _avatarLoading = true);
    final auth = context.read<AuthProvider>();
    try {
      await auth.updateAvatar(dataUri);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceAll('Exception: ', '')), backgroundColor: AppColors.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _avatarLoading = false);
    }
  }

  Widget _buildAvatarWidget(User? user) {
    final av = user?.avatar;
    Widget inner;
    if (av != null && av.contains(',')) {
      try {
        final bytes = base64Decode(av.split(',').last);
        inner = ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: Image.memory(bytes, width: 64, height: 64, fit: BoxFit.cover),
        );
      } catch (_) {
        inner = _avatarInitial(user);
      }
    } else {
      inner = _avatarInitial(user);
    }
    return GestureDetector(
      onTap: _pickAvatar,
      child: Stack(children: [
        SizedBox(width: 64, height: 64, child: inner),
        if (_avatarLoading)
          Container(
            width: 64, height: 64,
            decoration: BoxDecoration(
              color: Colors.black38, borderRadius: BorderRadius.circular(20),
            ),
            child: const Center(child: SizedBox(
              width: 24, height: 24,
              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
            )),
          ),
        Positioned(
          bottom: 0, right: 0,
          child: Container(
            width: 22, height: 22,
            decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
            child: const Icon(Icons.camera_alt, color: Colors.white, size: 12),
          ),
        ),
      ]),
    );
  }

  Widget _avatarInitial(User? user) => Container(
    width: 64, height: 64,
    decoration: BoxDecoration(
      gradient: const LinearGradient(
        colors: [AppColors.gradientStart, AppColors.gradientEnd],
        begin: Alignment.topLeft, end: Alignment.bottomRight,
      ),
      borderRadius: BorderRadius.circular(20),
    ),
    child: Center(child: Text(
      user?.name.isNotEmpty == true ? user!.name[0].toUpperCase() : 'U',
      style: GoogleFonts.plusJakartaSans(fontSize: 28, fontWeight: FontWeight.w800, color: Colors.white),
    )),
  );

  Future<void> _changePassword() async {
    if (_newPw.text != _confirm.text) {
      setState(() => _pwMsg = 'New passwords do not match.');
      return;
    }
    if (_newPw.text.length < 6) {
      setState(() => _pwMsg = 'Password must be at least 6 characters.');
      return;
    }
    setState(() { _pwLoading = true; _pwMsg = null; });
    try {
      await ApiService.changePassword(_current.text, _newPw.text);
      setState(() => _pwMsg = 'Password changed successfully.');
      _current.clear(); _newPw.clear(); _confirm.clear();
    } catch (e) {
      setState(() => _pwMsg = e.toString().replaceAll('Exception: ', ''));
    } finally {
      setState(() => _pwLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;

    return Column(children: [
      GradientHeader(
        eyebrow: 'ACCOUNT',
        title: user?.name ?? 'Profile',
        subtitle: user?.email,
      ),
      Expanded(child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Avatar card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white, borderRadius: BorderRadius.circular(20),
              boxShadow: AppShadows.card,
            ),
            child: Row(children: [
              _buildAvatarWidget(user),
              const SizedBox(width: 16),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(user?.name ?? '', style: GoogleFonts.plusJakartaSans(
                  fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textPrimary,
                )),
                Text(user?.email ?? '', style: GoogleFonts.plusJakartaSans(
                  fontSize: 13, color: AppColors.textSecondary,
                )),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight, borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    user?.role.toUpperCase() ?? '',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.primary,
                    ),
                  ),
                ),
              ])),
            ]),
          ),
          const SizedBox(height: 16),

          // Medical profile
          _SectionCard(
            icon: Icons.health_and_safety_outlined,
            title: 'My Health Info',
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(
                'Blood type, allergies, chronic conditions and emergency contact — shared with your doctor.',
                style: GoogleFonts.plusJakartaSans(fontSize: 13, color: AppColors.textSecondary, height: 1.5),
              ),
              const SizedBox(height: 12),
              AppButton(
                label: 'Edit Health Info',
                icon: Icons.edit_outlined,
                color: AppColors.primaryLight,
                textColor: AppColors.primary,
                onTap: () => Navigator.push(context, MaterialPageRoute(
                  builder: (_) => const MedicalProfileScreen(),
                )),
              ),
              const SizedBox(height: 8),
              AppButton(
                label: 'My Documents',
                icon: Icons.folder_outlined,
                color: const Color(0xFFEFF6FF),
                textColor: const Color(0xFF1D4ED8),
                onTap: () => Navigator.push(context, MaterialPageRoute(
                  builder: (_) => const MedicalDocumentsScreen(),
                )),
              ),
              const SizedBox(height: 8),
              AppButton(
                label: 'Symptom Journal',
                icon: Icons.edit_note_rounded,
                color: const Color(0xFFF0FDF4),
                textColor: const Color(0xFF059669),
                onTap: () => Navigator.push(context, MaterialPageRoute(
                  builder: (_) => const HealthJournalScreen(),
                )),
              ),
            ]),
          ),
          const SizedBox(height: 16),

          // Edit name
          _SectionCard(
            icon: Icons.edit_outlined,
            title: 'Display Name',
            child: Column(children: [
              AppInput(label: 'Full Name', controller: _nameCtrl),
              if (_nameMsg != null) ...[
                const SizedBox(height: 8),
                Text(_nameMsg!, style: GoogleFonts.plusJakartaSans(
                  fontSize: 13,
                  color: _nameMsg!.contains('updated') ? AppColors.success : AppColors.danger,
                )),
              ],
              const SizedBox(height: 12),
              AppButton(label: 'Save Name', onTap: _saveName, loading: _nameLoading),
            ]),
          ),
          const SizedBox(height: 16),

          // Change password
          _SectionCard(
            icon: Icons.lock_outline_rounded,
            title: 'Change Password',
            child: Column(children: [
              AppInput(label: 'Current Password', controller: _current, obscure: true),
              const SizedBox(height: 12),
              AppInput(label: 'New Password', controller: _newPw, obscure: true),
              const SizedBox(height: 12),
              AppInput(label: 'Confirm New Password', controller: _confirm, obscure: true),
              if (_pwMsg != null) ...[
                const SizedBox(height: 10),
                Text(_pwMsg!, style: GoogleFonts.plusJakartaSans(
                  fontSize: 13,
                  color: _pwMsg!.contains('success') ? AppColors.success : AppColors.danger,
                )),
              ],
              const SizedBox(height: 14),
              AppButton(label: 'Update Password', onTap: _changePassword, loading: _pwLoading),
            ]),
          ),
          const SizedBox(height: 16),

          // Payment history
          _SectionCard(
            icon: Icons.receipt_long_outlined,
            title: 'Payments',
            child: AppButton(
              label: 'View Payment History',
              icon: Icons.history_rounded,
              color: AppColors.primaryLight,
              textColor: AppColors.primary,
              onTap: () => Navigator.push(context, MaterialPageRoute(
                builder: (_) => const PaymentHistoryScreen(),
              )),
            ),
          ),
          const SizedBox(height: 16),

          // Security
          _SectionCard(
            icon: Icons.security_outlined,
            title: 'Security',
            child: Row(children: [
              const Icon(Icons.fingerprint_rounded, color: AppColors.primary, size: 20),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Biometric Login', style: GoogleFonts.plusJakartaSans(
                  fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary,
                )),
                Text('Use fingerprint or face to sign in', style: GoogleFonts.plusJakartaSans(
                  fontSize: 12, color: AppColors.textMuted,
                )),
              ])),
              Switch(
                value: _bioEnabled,
                onChanged: _toggleBio,
                activeThumbColor: AppColors.primary,
                activeTrackColor: AppColors.primaryLight,
              ),
            ]),
          ),
          const SizedBox(height: 16),

          // Sign out
          AppButton(
            label: 'Sign Out',
            color: AppColors.dangerLight,
            textColor: AppColors.danger,
            icon: Icons.logout_rounded,
            onTap: () => context.read<AuthProvider>().logout(),
          ),
          const SizedBox(height: 32),
        ],
      )),
    ]);
  }
}

class _SectionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final Widget child;
  const _SectionCard({required this.icon, required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(20),
        boxShadow: AppShadows.card,
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(icon, color: AppColors.primary, size: 18),
          const SizedBox(width: 8),
          Text(title, style: GoogleFonts.plusJakartaSans(
            fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary,
          )),
        ]),
        const SizedBox(height: 16),
        child,
      ]),
    );
  }
}
