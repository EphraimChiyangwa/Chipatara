import 'package:flutter/material.dart';
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
