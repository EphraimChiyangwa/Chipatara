import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/constants.dart';
import '../../services/api_service.dart';
import '../../widgets/widgets.dart';

class AiCheckerScreen extends StatefulWidget {
  const AiCheckerScreen({super.key});

  @override
  State<AiCheckerScreen> createState() => _AiCheckerScreenState();
}

class _AiCheckerScreenState extends State<AiCheckerScreen> {
  final _ctrl = TextEditingController();
  bool _loading = false;
  Map<String, dynamic>? _result;
  String? _error;

  Future<void> _check() async {
    if (_ctrl.text.trim().isEmpty) return;
    setState(() { _loading = true; _result = null; _error = null; });
    try {
      _result = await ApiService.checkSymptoms(_ctrl.text.trim());
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
    }
    setState(() => _loading = false);
  }

  Color _urgencyColor(String? u) => switch (u?.toLowerCase()) {
    'emergency' => AppColors.danger,
    'high'      => const Color(0xFFDC6B0A),
    'medium'    => AppColors.warning,
    _           => AppColors.success,
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(children: [
        GradientHeader(
          eyebrow: 'AI POWERED',
          title: 'Symptom Checker',
          subtitle: 'Describe how you\'re feeling',
          onBack: () => Navigator.pop(context),
          colors: const [Color(0xFF4C1D95), Color(0xFF7C3AED), Color(0xFFA78BFA)],
        ),
        Expanded(child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white, borderRadius: BorderRadius.circular(20),
                boxShadow: AppShadows.card,
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Describe your symptoms', style: GoogleFonts.plusJakartaSans(
                  fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary,
                )),
                const SizedBox(height: 12),
                TextField(
                  controller: _ctrl,
                  maxLines: 5,
                  style: GoogleFonts.plusJakartaSans(fontSize: 14, color: AppColors.textPrimary),
                  decoration: InputDecoration(
                    hintText: 'e.g. I have had a headache for 2 days, mild fever and sore throat…',
                    hintStyle: GoogleFonts.plusJakartaSans(color: AppColors.textMuted, fontSize: 13),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFF7C3AED), width: 2),
                    ),
                    contentPadding: const EdgeInsets.all(14),
                  ),
                ),
                const SizedBox(height: 14),
                AppButton(
                  label: 'Analyse Symptoms',
                  loading: _loading,
                  color: const Color(0xFF7C3AED),
                  icon: Icons.psychology_outlined,
                  onTap: _check,
                ),
              ]),
            ),

            if (_error != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.dangerLight, borderRadius: BorderRadius.circular(14),
                ),
                child: Text(_error!, style: GoogleFonts.plusJakartaSans(color: AppColors.danger)),
              ),
            ],

            if (_result != null) ...[
              const SizedBox(height: 16),

              // Urgency badge
              Builder(builder: (_) {
                final urgency = _result!['urgency'] as String? ?? 'low';
                final color = _urgencyColor(urgency);
                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: color.withValues(alpha: 0.3)),
                  ),
                  child: Row(children: [
                    Icon(
                      urgency == 'emergency' ? Icons.emergency_rounded : Icons.health_and_safety_outlined,
                      color: color, size: 24,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      urgency.toUpperCase(),
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 13, fontWeight: FontWeight.w800, letterSpacing: 1, color: color,
                      ),
                    ),
                  ]),
                );
              }),
              const SizedBox(height: 12),

              // Instructions / advice
              if (_result!['advice'] != null) _ResultCard(
                title: 'What to do',
                icon: Icons.assignment_outlined,
                child: Text(_result!['advice'] as String, style: GoogleFonts.plusJakartaSans(
                  fontSize: 13, color: AppColors.textSecondary, height: 1.6,
                )),
              ),
              const SizedBox(height: 12),

              // Possible conditions
              if (_result!['conditions'] is List && (_result!['conditions'] as List).isNotEmpty) _ResultCard(
                title: 'Possible Conditions',
                icon: Icons.biotech_outlined,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: (_result!['conditions'] as List).map((c) {
                    final map = c as Map<String, dynamic>;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Container(
                          margin: const EdgeInsets.only(top: 4),
                          width: 8, height: 8,
                          decoration: BoxDecoration(
                            color: const Color(0xFF7C3AED),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(map['name'] as String? ?? '', style: GoogleFonts.plusJakartaSans(
                            fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary,
                          )),
                          if (map['description'] != null)
                            Text(map['description'] as String, style: GoogleFonts.plusJakartaSans(
                              fontSize: 12, color: AppColors.textSecondary, height: 1.4,
                            )),
                        ])),
                      ]),
                    );
                  }).toList(),
                ),
              ),

              // Recommended specialists
              if (_result!['recommendedSpecialists'] is List && (_result!['recommendedSpecialists'] as List).isNotEmpty) ...[
                const SizedBox(height: 12),
                _ResultCard(
                  title: 'Recommended Specialists',
                  icon: Icons.person_search_outlined,
                  child: Wrap(
                    spacing: 6, runSpacing: 6,
                    children: (_result!['recommendedSpecialists'] as List).map((s) => Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(0xFF7C3AED).withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFF7C3AED).withValues(alpha: 0.2)),
                      ),
                      child: Text(s.toString(), style: GoogleFonts.plusJakartaSans(
                        fontSize: 12, color: const Color(0xFF7C3AED), fontWeight: FontWeight.w600,
                      )),
                    )).toList(),
                  ),
                ),
              ],

              // Disclaimer
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(12),
                ),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Icon(Icons.info_outline, color: Color(0xFFD97706), size: 16),
                  const SizedBox(width: 8),
                  Expanded(child: Text(
                    'This AI assessment is not a medical diagnosis. Always consult a qualified doctor for medical advice.',
                    style: GoogleFonts.plusJakartaSans(fontSize: 11, color: const Color(0xFF92400E)),
                  )),
                ]),
              ),
            ],
            const SizedBox(height: 24),
          ],
        )),
      ]),
    );
  }
}

class _ResultCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Widget child;

  const _ResultCard({required this.title, required this.icon, required this.child});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Colors.white, borderRadius: BorderRadius.circular(16),
      boxShadow: AppShadows.soft,
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Icon(icon, color: AppColors.primary, size: 16),
        const SizedBox(width: 8),
        Text(title, style: GoogleFonts.plusJakartaSans(
          fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary,
        )),
      ]),
      const SizedBox(height: 10),
      child,
    ]),
  );
}
