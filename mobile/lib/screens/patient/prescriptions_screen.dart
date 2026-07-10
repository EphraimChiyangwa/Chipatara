import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../config/constants.dart';
import '../../models/models.dart';
import '../../services/api_service.dart';
import '../../services/medicine_reminder_service.dart';

class PrescriptionsScreen extends StatefulWidget {
  const PrescriptionsScreen({super.key});

  @override
  State<PrescriptionsScreen> createState() => _PrescriptionsScreenState();
}

class _PrescriptionsScreenState extends State<PrescriptionsScreen> {
  List<Prescription> _prescriptions = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try { _prescriptions = await ApiService.getMyPrescriptions(); } catch (_) {}
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(children: [
        // Header
        Container(
          width: double.infinity,
          padding: EdgeInsets.only(
            top: MediaQuery.of(context).padding.top + 16,
            left: 24, right: 16, bottom: 24,
          ),
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF0E7490), Color(0xFF0891B2), Color(0xFF22D3EE)],
              begin: Alignment.topLeft, end: Alignment.bottomRight,
            ),
          ),
          child: Row(children: [
            GestureDetector(
              onTap: () => Navigator.pop(context),
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 18),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('PRESCRIPTIONS', style: GoogleFonts.plusJakartaSans(
                fontSize: 11, fontWeight: FontWeight.w700,
                color: Colors.white.withValues(alpha: 0.75), letterSpacing: 1.5,
              )),
              Text('My Medications', style: GoogleFonts.plusJakartaSans(
                fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white,
              )),
            ])),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Icon(Icons.medical_services_outlined, color: Colors.white, size: 22),
            ),
          ]),
        ),

        Expanded(child: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF0891B2)))
          : _prescriptions.isEmpty
            ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                const Icon(Icons.medication_outlined, size: 56, color: AppColors.textMuted),
                const SizedBox(height: 12),
                Text('No prescriptions yet', style: GoogleFonts.plusJakartaSans(
                  fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary,
                )),
                const SizedBox(height: 6),
                Text('Prescriptions from your doctors will appear here',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 13, color: AppColors.textSecondary,
                  )),
              ]))
            : RefreshIndicator(
                onRefresh: _load,
                color: const Color(0xFF0891B2),
                child: ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                  itemCount: _prescriptions.length,
                  itemBuilder: (_, i) => _PrescriptionCard(rx: _prescriptions[i]),
                ),
              ),
        ),
      ]),
    );
  }
}

class _PrescriptionCard extends StatefulWidget {
  final Prescription rx;
  const _PrescriptionCard({required this.rx});

  @override
  State<_PrescriptionCard> createState() => _PrescriptionCardState();
}

class _PrescriptionCardState extends State<_PrescriptionCard> {
  bool _expanded = false;
  bool _reminderOn = false;
  bool _reminderLoading = false;

  @override
  void initState() {
    super.initState();
    MedicineReminderService.isEnabled(widget.rx.id).then((v) {
      if (mounted) setState(() => _reminderOn = v);
    });
  }

  Future<void> _toggleReminder() async {
    setState(() => _reminderLoading = true);
    try {
      if (_reminderOn) {
        await MedicineReminderService.disable(widget.rx);
        setState(() => _reminderOn = false);
      } else {
        await MedicineReminderService.enable(widget.rx);
        setState(() => _reminderOn = true);
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not update reminders')),
        );
      }
    }
    setState(() => _reminderLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    final rx = widget.rx;
    final date = rx.appointmentDate ?? rx.createdAt;
    final reason = rx.appointmentReason;

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: AppShadows.card,
      ),
      child: Column(children: [
        // Card header
        InkWell(
          onTap: () => setState(() => _expanded = !_expanded),
          borderRadius: BorderRadius.circular(20),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(children: [
              Container(
                width: 48, height: 48,
                decoration: BoxDecoration(
                  color: const Color(0xFFECFEFF),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(Icons.medication_outlined,
                  color: Color(0xFF0891B2), size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(rx.doctorName, style: GoogleFonts.plusJakartaSans(
                  fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary,
                )),
                if (reason.isNotEmpty)
                  Text(reason, style: GoogleFonts.plusJakartaSans(
                    fontSize: 12, color: AppColors.textSecondary,
                  )),
                Text(DateFormat('MMM d, y').format(date),
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 11, color: AppColors.textMuted,
                  )),
              ])),
              // Reminder toggle
              GestureDetector(
                onTap: _reminderLoading ? null : _toggleReminder,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: _reminderOn
                        ? const Color(0xFFECFEFF)
                        : const Color(0xFFF3F4F6),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: _reminderOn
                          ? const Color(0xFF0891B2)
                          : Colors.transparent,
                    ),
                  ),
                  child: _reminderLoading
                      ? const SizedBox(
                          width: 14, height: 14,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Color(0xFF0891B2),
                          ),
                        )
                      : Row(mainAxisSize: MainAxisSize.min, children: [
                          Icon(
                            _reminderOn
                                ? Icons.notifications_active_outlined
                                : Icons.notifications_off_outlined,
                            size: 14,
                            color: _reminderOn
                                ? const Color(0xFF0891B2)
                                : AppColors.textMuted,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            _reminderOn ? 'On' : 'Remind',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 11, fontWeight: FontWeight.w700,
                              color: _reminderOn
                                  ? const Color(0xFF0891B2)
                                  : AppColors.textMuted,
                            ),
                          ),
                        ]),
                ),
              ),
              const SizedBox(width: 8),
              AnimatedRotation(
                turns: _expanded ? 0.5 : 0,
                duration: const Duration(milliseconds: 200),
                child: const Icon(Icons.keyboard_arrow_down,
                  color: AppColors.textMuted, size: 22),
              ),
            ]),
          ),
        ),

        // Expanded content
        AnimatedCrossFade(
          firstChild: const SizedBox.shrink(),
          secondChild: _ExpandedContent(rx: rx),
          crossFadeState: _expanded ? CrossFadeState.showSecond : CrossFadeState.showFirst,
          duration: const Duration(milliseconds: 240),
        ),
      ]),
    );
  }
}

class _ExpandedContent extends StatelessWidget {
  final Prescription rx;
  const _ExpandedContent({required this.rx});

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      const Divider(height: 1, indent: 16, endIndent: 16),
      Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Reminder schedule summary
          if (rx.medications.any((m) => m.frequency.isNotEmpty)) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFECFEFF),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(children: [
                const Icon(Icons.schedule_outlined, size: 14, color: Color(0xFF0891B2)),
                const SizedBox(width: 8),
                Expanded(child: Text(
                  rx.medications.map((m) =>
                    '${m.name}: ${MedicineReminderService.describeSchedule(m.frequency)}'
                  ).join(' · '),
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 11, color: const Color(0xFF0E7490),
                  ),
                )),
              ]),
            ),
            const SizedBox(height: 12),
          ],
          Text('MEDICATIONS', style: GoogleFonts.plusJakartaSans(
            fontSize: 10, fontWeight: FontWeight.w700,
            color: AppColors.textMuted, letterSpacing: 1.2,
          )),
          const SizedBox(height: 10),
          ...rx.medications.map((med) => Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE0F7FA)),
            ),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                width: 8, height: 8,
                margin: const EdgeInsets.only(top: 4),
                decoration: const BoxDecoration(
                  color: Color(0xFF0891B2),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(med.name, style: GoogleFonts.plusJakartaSans(
                  fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary,
                )),
                if (med.dosage.isNotEmpty)
                  Text(med.dosage, style: GoogleFonts.plusJakartaSans(
                    fontSize: 12, color: AppColors.textSecondary,
                  )),
                if (med.frequency.isNotEmpty)
                  Text(med.frequency, style: GoogleFonts.plusJakartaSans(
                    fontSize: 12, color: const Color(0xFF0891B2),
                  )),
                if (med.duration.isNotEmpty)
                  Text('Duration: ${med.duration}', style: GoogleFonts.plusJakartaSans(
                    fontSize: 11, color: AppColors.textMuted,
                  )),
              ])),
            ]),
          )),

          if (rx.notes.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text('NOTES', style: GoogleFonts.plusJakartaSans(
              fontSize: 10, fontWeight: FontWeight.w700,
              color: AppColors.textMuted, letterSpacing: 1.2,
            )),
            const SizedBox(height: 6),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFFFBEB),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFFEF08A)),
              ),
              child: Text(rx.notes, style: GoogleFonts.plusJakartaSans(
                fontSize: 13, color: AppColors.textPrimary,
              )),
            ),
          ],
        ]),
      ),
    ]);
  }
}
