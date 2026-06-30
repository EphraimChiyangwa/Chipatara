import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../config/constants.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/widgets.dart';

class ProfileTab extends StatefulWidget {
  const ProfileTab({super.key});

  @override
  State<ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends State<ProfileTab> {
  final _current  = TextEditingController();
  final _newPw    = TextEditingController();
  final _confirm  = TextEditingController();
  bool _pwLoading = false;
  String? _pwMsg;

  Future<void> _changePassword() async {
    if (_newPw.text != _confirm.text) {
      setState(() => _pwMsg = 'New passwords do not match.');
      return;
    }
    setState(() { _pwLoading = true; _pwMsg = null; });
    try {
      // await ApiService.changePassword(_current.text, _newPw.text);
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
          // Profile card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white, borderRadius: BorderRadius.circular(20),
              boxShadow: AppShadows.card,
            ),
            child: Row(children: [
              Container(
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
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 28, fontWeight: FontWeight.w800, color: Colors.white,
                  ),
                )),
              ),
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
          const SizedBox(height: 20),

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
          const SizedBox(height: 20),

          // Logout
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
