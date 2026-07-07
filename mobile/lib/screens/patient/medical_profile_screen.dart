import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/constants.dart';
import '../../services/api_service.dart';
import '../../widgets/widgets.dart';

class MedicalProfileScreen extends StatefulWidget {
  const MedicalProfileScreen({super.key});

  @override
  State<MedicalProfileScreen> createState() => _MedicalProfileScreenState();
}

class _MedicalProfileScreenState extends State<MedicalProfileScreen> {
  static const _bloodTypes = ['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  String _bloodType = 'Unknown';
  final _allergies        = TextEditingController();
  final _conditions       = TextEditingController();
  final _medications      = TextEditingController();
  final _emergencyName    = TextEditingController();
  final _emergencyPhone   = TextEditingController();

  bool _loading = true;
  bool _saving  = false;
  String? _msg;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await ApiService.getMyMedicalProfile();
      if (data != null) {
        setState(() {
          _bloodType = data['bloodType'] ?? 'Unknown';
          _allergies.text      = data['allergies'] ?? '';
          _conditions.text     = data['chronicConditions'] ?? '';
          _medications.text    = data['currentMedications'] ?? '';
          _emergencyName.text  = data['emergencyContactName'] ?? '';
          _emergencyPhone.text = data['emergencyContactPhone'] ?? '';
        });
      }
    } catch (_) {}
    setState(() => _loading = false);
  }

  Future<void> _save() async {
    setState(() { _saving = true; _msg = null; });
    try {
      await ApiService.saveMedicalProfile({
        'bloodType': _bloodType,
        'allergies': _allergies.text.trim(),
        'chronicConditions': _conditions.text.trim(),
        'currentMedications': _medications.text.trim(),
        'emergencyContactName': _emergencyName.text.trim(),
        'emergencyContactPhone': _emergencyPhone.text.trim(),
      });
      setState(() => _msg = 'Health info saved.');
    } catch (e) {
      setState(() => _msg = e.toString().replaceAll('Exception: ', ''));
    } finally {
      setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(children: [
        GradientHeader(
          eyebrow: 'HEALTH INFO',
          title: 'Medical Profile',
          subtitle: 'Shared with your doctor during consultations',
          onBack: () => Navigator.pop(context),
          colors: const [Color(0xFF065F46), Color(0xFF059669), Color(0xFF34D399)],
        ),
        Expanded(child: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                // Blood type
                _Card(
                  icon: Icons.water_drop_outlined,
                  title: 'Blood Type',
                  child: Wrap(
                    spacing: 8, runSpacing: 8,
                    children: _bloodTypes.map((bt) => GestureDetector(
                      onTap: () => setState(() => _bloodType = bt),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: _bloodType == bt ? AppColors.primary : Colors.white,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: _bloodType == bt ? AppColors.primary : const Color(0xFFE5E7EB),
                          ),
                        ),
                        child: Text(bt, style: GoogleFonts.plusJakartaSans(
                          fontSize: 13, fontWeight: FontWeight.w700,
                          color: _bloodType == bt ? Colors.white : AppColors.textSecondary,
                        )),
                      ),
                    )).toList(),
                  ),
                ),
                const SizedBox(height: 14),

                _Card(
                  icon: Icons.warning_amber_outlined,
                  title: 'Allergies',
                  child: AppInput(
                    label: '', hint: 'e.g. Penicillin, peanuts, dust…',
                    controller: _allergies, maxLines: 2,
                  ),
                ),
                const SizedBox(height: 14),

                _Card(
                  icon: Icons.monitor_heart_outlined,
                  title: 'Chronic Conditions',
                  child: AppInput(
                    label: '', hint: 'e.g. Hypertension, diabetes, asthma…',
                    controller: _conditions, maxLines: 2,
                  ),
                ),
                const SizedBox(height: 14),

                _Card(
                  icon: Icons.medication_outlined,
                  title: 'Current Medications',
                  child: AppInput(
                    label: '', hint: 'e.g. Metformin 500mg, Amlodipine 5mg…',
                    controller: _medications, maxLines: 2,
                  ),
                ),
                const SizedBox(height: 14),

                _Card(
                  icon: Icons.emergency_outlined,
                  title: 'Emergency Contact',
                  child: Column(children: [
                    AppInput(label: 'Name', hint: 'Contact full name', controller: _emergencyName),
                    const SizedBox(height: 10),
                    AppInput(label: 'Phone', hint: '+263 77 000 0000', controller: _emergencyPhone),
                  ]),
                ),
                const SizedBox(height: 20),

                if (_msg != null) ...[
                  Center(child: Text(_msg!, style: GoogleFonts.plusJakartaSans(
                    fontSize: 13,
                    color: _msg!.contains('saved') ? AppColors.success : AppColors.danger,
                    fontWeight: FontWeight.w600,
                  ))),
                  const SizedBox(height: 12),
                ],

                AppButton(label: 'Save Health Info', icon: Icons.save_outlined, onTap: _save, loading: _saving),
                const SizedBox(height: 32),
              ],
            )),
      ]),
    );
  }
}

class _Card extends StatelessWidget {
  final IconData icon;
  final String title;
  final Widget child;
  const _Card({required this.icon, required this.title, required this.child});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Colors.white, borderRadius: BorderRadius.circular(20),
      boxShadow: AppShadows.card,
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Icon(icon, size: 16, color: AppColors.primary),
        const SizedBox(width: 8),
        Text(title, style: GoogleFonts.plusJakartaSans(
          fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary,
        )),
      ]),
      const SizedBox(height: 14),
      child,
    ]),
  );
}
