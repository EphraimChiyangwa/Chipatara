import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../config/constants.dart';
import '../../models/models.dart';
import '../../services/api_service.dart';
import '../../widgets/widgets.dart';
import 'reschedule_screen.dart';
import 'video_call_screen.dart';

class AppointmentDetailScreen extends StatefulWidget {
  final Appointment appointment;
  final VoidCallback onRefresh;

  const AppointmentDetailScreen({
    super.key,
    required this.appointment,
    required this.onRefresh,
  });

  @override
  State<AppointmentDetailScreen> createState() => _AppointmentDetailScreenState();
}

class _AppointmentDetailScreenState extends State<AppointmentDetailScreen> {
  late Appointment _appt;
  Prescription? _rx;
  bool _rxLoading = false;
  double _rating = 5;
  bool _showRating = false;
  final _reviewCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _appt = widget.appointment;
    if (_appt.status == 'completed') { _loadRx(); }
  }

  Future<void> _loadRx() async {
    setState(() => _rxLoading = true);
    try { _rx = await ApiService.getPrescription(_appt.id); } catch (_) {}
    setState(() => _rxLoading = false);
  }

  Future<void> _cancel() async {
    try {
      await ApiService.cancelAppointment(_appt.id);
      widget.onRefresh();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceAll('Exception: ', '')),
          backgroundColor: AppColors.danger),
      );
      }
    }
  }

  Future<void> _submitRating() async {
    try {
      await ApiService.rateAppointment(_appt.id, _rating, _reviewCtrl.text);
      setState(() => _showRating = false);
      widget.onRefresh();
    } catch (_) {}
  }

  Color get _statusColor => switch (_appt.status) {
    'confirmed' => AppColors.success,
    'completed' => AppColors.primary,
    'cancelled'  => AppColors.danger,
    _ => AppColors.warning,
  };

  String get _statusLabel => switch (_appt.status) {
    'confirmed' => 'Confirmed',
    'completed' => 'Completed',
    'cancelled'  => 'Cancelled',
    _ => 'Pending',
  };

  @override
  Widget build(BuildContext context) {
    final date = DateTime.tryParse(_appt.date);

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(children: [
        GradientHeader(
          eyebrow: 'APPOINTMENT',
          title: _appt.doctorName,
          subtitle: date != null ? DateFormat('EEEE, MMMM d, y').format(date) : null,
          onBack: () => Navigator.pop(context),
        ),
        Expanded(child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // Status + time card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white, borderRadius: BorderRadius.circular(20),
                boxShadow: AppShadows.card,
              ),
              child: Column(children: [
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: _statusColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(_statusLabel, style: GoogleFonts.plusJakartaSans(
                      fontSize: 12, fontWeight: FontWeight.w700, color: _statusColor,
                    )),
                  ),
                  if (date != null) Text(
                    DateFormat('h:mm a').format(date),
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.textPrimary,
                    ),
                  ),
                ]),
                const SizedBox(height: 16),
                _DetailRow(Icons.person_outline_rounded, 'Doctor', _appt.doctorName),
                if (date != null)
                  _DetailRow(Icons.calendar_today_outlined, 'Date',
                    DateFormat('MMM d, y').format(date)),
                _DetailRow(Icons.note_alt_outlined, 'Reason', _appt.reason),
              ]),
            ),
            const SizedBox(height: 14),

            // Notes
            if (_appt.notes != null && _appt.notes!.isNotEmpty) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                ),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Icon(Icons.sticky_note_2_outlined, color: AppColors.primary, size: 18),
                  const SizedBox(width: 10),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Doctor\'s Notes', style: GoogleFonts.plusJakartaSans(
                      fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.primary,
                    )),
                    const SizedBox(height: 4),
                    Text(_appt.notes!, style: GoogleFonts.plusJakartaSans(
                      fontSize: 13, color: AppColors.primary,
                    )),
                  ])),
                ]),
              ),
              const SizedBox(height: 14),
            ],

            // Prescription
            if (_appt.status == 'completed') ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white, borderRadius: BorderRadius.circular(20),
                  boxShadow: AppShadows.card,
                ),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    const Icon(Icons.medication_outlined, color: Color(0xFF059669), size: 18),
                    const SizedBox(width: 8),
                    Text('Prescription', style: GoogleFonts.plusJakartaSans(
                      fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary,
                    )),
                  ]),
                  const SizedBox(height: 12),
                  if (_rxLoading)
                    const Center(child: CircularProgressIndicator(color: AppColors.primary))
                  else if (_rx == null)
                    Text('No prescription issued yet.', style: GoogleFonts.plusJakartaSans(
                      fontSize: 13, color: AppColors.textMuted,
                    ))
                  else
                    ..._rx!.medications.map((m) => Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.surface, borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(m.name, style: GoogleFonts.plusJakartaSans(
                          fontSize: 14, fontWeight: FontWeight.w700,
                        )),
                        const SizedBox(height: 4),
                        Text('${m.dosage}  ·  ${m.frequency}  ·  ${m.duration}',
                          style: GoogleFonts.plusJakartaSans(fontSize: 12, color: AppColors.textSecondary)),
                        if (m.instructions.isNotEmpty) Text(m.instructions,
                          style: GoogleFonts.plusJakartaSans(fontSize: 12, color: AppColors.textMuted)),
                      ]),
                    )),
                ]),
              ),
              const SizedBox(height: 14),
            ],

            // Rating (completed + not yet rated)
            if (_appt.status == 'completed' && _appt.rating == null) ...[
              if (!_showRating)
                AppButton(
                  label: 'Rate this Consultation',
                  icon: Icons.star_outline_rounded,
                  color: AppColors.primaryLight,
                  textColor: AppColors.primary,
                  onTap: () => setState(() => _showRating = true),
                )
              else
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white, borderRadius: BorderRadius.circular(20),
                    boxShadow: AppShadows.card,
                  ),
                  child: Column(children: [
                    Text('How was your consultation?', style: GoogleFonts.plusJakartaSans(
                      fontSize: 15, fontWeight: FontWeight.w700,
                    )),
                    const SizedBox(height: 12),
                    Row(mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(5, (i) => GestureDetector(
                        onTap: () => setState(() => _rating = i + 1),
                        child: Icon(
                          i < _rating ? Icons.star_rounded : Icons.star_outline_rounded,
                          color: const Color(0xFFF59E0B), size: 36,
                        ),
                      )),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _reviewCtrl, maxLines: 2,
                      decoration: InputDecoration(
                        hintText: 'Leave a review (optional)…',
                        hintStyle: GoogleFonts.plusJakartaSans(color: AppColors.textMuted),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: AppColors.primary),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    AppButton(label: 'Submit Rating', onTap: _submitRating),
                  ]),
                ),
              const SizedBox(height: 14),
            ],

            // Rating already given
            if (_appt.rating != null) ...[
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFFBEB), borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFFDE68A)),
                ),
                child: Row(children: [
                  ...List.generate(5, (i) => Icon(
                    i < (_appt.rating ?? 0) ? Icons.star_rounded : Icons.star_outline_rounded,
                    color: const Color(0xFFF59E0B), size: 18,
                  )),
                  const SizedBox(width: 8),
                  Text('You rated this visit', style: GoogleFonts.plusJakartaSans(
                    fontSize: 12, color: const Color(0xFF92400E),
                  )),
                ]),
              ),
              const SizedBox(height: 14),
            ],

            // Action buttons
            if (_appt.status == 'confirmed') ...[
              AppButton(
                label: 'Join Video Call',
                icon: Icons.videocam_outlined,
                color: AppColors.success,
                onTap: () => Navigator.push(context, MaterialPageRoute(
                  builder: (_) => VideoCallScreen(appointment: _appt),
                )),
              ),
              const SizedBox(height: 10),
            ],
            if (_appt.status == 'pending' || _appt.status == 'confirmed') ...[
              AppButton(
                label: 'Reschedule',
                icon: Icons.event_repeat_outlined,
                color: const Color(0xFFF5F3FF),
                textColor: const Color(0xFF7C3AED),
                onTap: () => Navigator.push(context, MaterialPageRoute(
                  builder: (_) => RescheduleScreen(
                    appointment: _appt,
                    onRescheduled: () {
                      widget.onRefresh();
                      Navigator.pop(context);
                    },
                  ),
                )),
              ),
              const SizedBox(height: 10),
            ],
            if (_appt.status == 'pending') ...[
              AppButton(
                label: 'Cancel Appointment',
                icon: Icons.cancel_outlined,
                color: AppColors.dangerLight,
                textColor: AppColors.danger,
                onTap: _cancel,
              ),
            ],
            const SizedBox(height: 32),
          ],
        )),
      ]),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _DetailRow(this.icon, this.label, this.value);

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(children: [
      Icon(icon, size: 15, color: AppColors.textMuted),
      const SizedBox(width: 10),
      Text(label, style: GoogleFonts.plusJakartaSans(
        fontSize: 13, color: AppColors.textSecondary,
      )),
      const Spacer(),
      Flexible(child: Text(value, textAlign: TextAlign.end, style: GoogleFonts.plusJakartaSans(
        fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary,
      ))),
    ]),
  );
}
