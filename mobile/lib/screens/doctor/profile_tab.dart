import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../config/constants.dart';
import '../../models/models.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../widgets/widgets.dart';

class DoctorProfileTab extends StatefulWidget {
  const DoctorProfileTab({super.key});

  @override
  State<DoctorProfileTab> createState() => _DoctorProfileTabState();
}

class _DoctorProfileTabState extends State<DoctorProfileTab> {
  DoctorProfile? _profile;
  bool _loading = true;
  bool _saving = false;
  bool _avatarLoading = false;

  final _spec    = TextEditingController();
  final _hospital= TextEditingController();
  final _fee     = TextEditingController();
  final _bio     = TextEditingController();
  final _license = TextEditingController();
  final _exp     = TextEditingController();

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      _profile = await ApiService.getMyDoctorProfile();
      if (_profile != null) {
        final p = _profile!;
        _spec.text     = p.specialization;
        _hospital.text = p.hospital;
        _fee.text      = p.consultationFee.toStringAsFixed(0);
        _bio.text      = p.bio ?? '';
        _license.text  = p.licenseNumber;
        _exp.text      = p.yearsOfExperience.toString();
      }
    } catch (_) {}
    setState(() => _loading = false);
  }

  Future<void> _pickAvatar() async {
    final img = await ImagePicker().pickImage(
      source: ImageSource.gallery, imageQuality: 70, maxWidth: 400,
    );
    if (img == null || !mounted) return;
    final bytes = await img.readAsBytes();
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

  Widget _buildAvatar(User? user) {
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
        inner = _initial(user);
      }
    } else {
      inner = _initial(user);
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

  Widget _initial(User? user) => Container(
    width: 64, height: 64,
    decoration: BoxDecoration(
      gradient: const LinearGradient(
        colors: [AppColors.gradientStart, AppColors.gradientEnd],
        begin: Alignment.topLeft, end: Alignment.bottomRight,
      ),
      borderRadius: BorderRadius.circular(20),
    ),
    child: Center(child: Text(
      user?.name.isNotEmpty == true ? user!.name[0].toUpperCase() : 'D',
      style: GoogleFonts.plusJakartaSans(fontSize: 28, fontWeight: FontWeight.w800, color: Colors.white),
    )),
  );

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      final data = {
        'specialization': _spec.text,
        'hospital': _hospital.text,
        'consultationFee': double.tryParse(_fee.text) ?? 0,
        'bio': _bio.text,
        'licenseNumber': _license.text,
        'yearsOfExperience': int.tryParse(_exp.text) ?? 0,
      };
      _profile == null
        ? await ApiService.saveDoctorProfile(data)
        : await ApiService.updateDoctorProfile(data);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profile updated'), backgroundColor: AppColors.success),
      );
      _load();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceAll('Exception: ', '')), backgroundColor: AppColors.danger),
      );
    } finally {
      setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;

    return Column(children: [
      GradientHeader(
        eyebrow: 'DOCTOR',
        title: user?.name ?? 'Profile',
        subtitle: _profile?.specialization ?? 'Complete your profile',
      ),
      Expanded(child: _loading
        ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
        : ListView(
            padding: const EdgeInsets.all(20),
            children: [
              // Avatar card
              Container(
                padding: const EdgeInsets.all(20),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Colors.white, borderRadius: BorderRadius.circular(20),
                  boxShadow: AppShadows.card,
                ),
                child: Row(children: [
                  _buildAvatar(user),
                  const SizedBox(width: 16),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(user?.name ?? '', style: GoogleFonts.plusJakartaSans(
                      fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.textPrimary,
                    )),
                    Text(user?.email ?? '', style: GoogleFonts.plusJakartaSans(
                      fontSize: 12, color: AppColors.textSecondary,
                    )),
                    const SizedBox(height: 4),
                    Text('Tap photo to change', style: GoogleFonts.plusJakartaSans(
                      fontSize: 11, color: AppColors.textMuted,
                    )),
                  ])),
                ]),
              ),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white, borderRadius: BorderRadius.circular(20),
                  boxShadow: AppShadows.card,
                ),
                child: Column(children: [
                  AppInput(label: 'Specialization', hint: 'e.g. Cardiologist', controller: _spec),
                  const SizedBox(height: 14),
                  AppInput(label: 'Hospital / Clinic', hint: 'Hospital name', controller: _hospital),
                  const SizedBox(height: 14),
                  AppInput(label: 'Consultation Fee (ZWL)', hint: '0', controller: _fee, keyboardType: TextInputType.number),
                  const SizedBox(height: 14),
                  AppInput(label: 'License Number', controller: _license),
                  const SizedBox(height: 14),
                  AppInput(label: 'Years of Experience', controller: _exp, keyboardType: TextInputType.number),
                  const SizedBox(height: 14),
                  AppInput(label: 'Bio', hint: 'Tell patients about yourself…', controller: _bio, maxLines: 4),
                  const SizedBox(height: 18),
                  AppButton(label: 'Save Profile', onTap: _save, loading: _saving),
                ]),
              ),
              const SizedBox(height: 20),
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
