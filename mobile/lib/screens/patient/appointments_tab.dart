import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/constants.dart';
import '../../models/models.dart';
import '../../services/api_service.dart';
import '../../widgets/widgets.dart';

class AppointmentsTab extends StatefulWidget {
  const AppointmentsTab({super.key});

  @override
  State<AppointmentsTab> createState() => _AppointmentsTabState();
}

class _AppointmentsTabState extends State<AppointmentsTab> {
  List<Appointment> _appointments = [];
  bool _loading = true;
  String? _ratingFor;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      _appointments = await ApiService.getPatientAppointments();
    } catch (_) {}
    setState(() => _loading = false);
  }

  Color _statusColor(String s) => switch (s) {
    'confirmed' => AppColors.success,
    'completed' => AppColors.primary,
    'cancelled'  => AppColors.danger,
    _ => AppColors.warning,
  };

  IconData _statusIcon(String s) => switch (s) {
    'confirmed' => Icons.check_circle_outline,
    'completed' => Icons.task_alt_rounded,
    'cancelled'  => Icons.cancel_outlined,
    _ => Icons.schedule_rounded,
  };

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      GradientHeader(eyebrow: 'SCHEDULE', title: 'My Appointments', subtitle: 'Track your upcoming visits'),
      Expanded(child: _loading
        ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
        : _appointments.isEmpty
          ? const EmptyState(
              icon: Icons.calendar_today_outlined,
              title: 'No appointments yet',
              description: 'Book a consultation with a doctor to get started',
            )
          : RefreshIndicator(
              onRefresh: _load,
              color: AppColors.primary,
              child: ListView.builder(
                padding: const EdgeInsets.all(20),
                itemCount: _appointments.length,
                itemBuilder: (_, i) => _ApptCard(
                  appt: _appointments[i],
                  statusColor: _statusColor(_appointments[i].status),
                  statusIcon: _statusIcon(_appointments[i].status),
                  onCancel: () async {
                    await ApiService.cancelAppointment(_appointments[i].id);
                    _load();
                  },
                  onRate: () => setState(() => _ratingFor = _appointments[i].id),
                ),
              ),
            )),
      // Rating sheet
      if (_ratingFor != null) _RatingSheet(
        onSubmit: (r, review) async {
          await ApiService.rateAppointment(_ratingFor!, r, review);
          setState(() => _ratingFor = null);
          _load();
        },
        onClose: () => setState(() => _ratingFor = null),
      ),
    ]);
  }
}

class _ApptCard extends StatelessWidget {
  final Appointment appt;
  final Color statusColor;
  final IconData statusIcon;
  final VoidCallback onCancel;
  final VoidCallback onRate;

  const _ApptCard({
    required this.appt, required this.statusColor, required this.statusIcon,
    required this.onCancel, required this.onRate,
  });

  @override
  Widget build(BuildContext context) {
    final date = DateTime.tryParse(appt.date);
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(20),
        boxShadow: AppShadows.card,
      ),
      child: Column(children: [
        // Status bar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: statusColor.withOpacity(0.08),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Row(children: [
            Icon(statusIcon, color: statusColor, size: 16),
            const SizedBox(width: 6),
            Text(appt.status.toUpperCase(), style: GoogleFonts.plusJakartaSans(
              fontSize: 11, fontWeight: FontWeight.w700, color: statusColor, letterSpacing: 0.8,
            )),
            const Spacer(),
            if (date != null) Text(
              DateFormat('MMM d, y · h:mm a').format(date),
              style: GoogleFonts.plusJakartaSans(fontSize: 11, color: AppColors.textMuted),
            ),
          ]),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(appt.doctorName, style: GoogleFonts.plusJakartaSans(
              fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary,
            )),
            const SizedBox(height: 4),
            Text('Reason: ${appt.reason}', style: GoogleFonts.plusJakartaSans(
              fontSize: 13, color: AppColors.textSecondary,
            )),
            if (appt.notes != null && appt.notes!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text('Notes: ${appt.notes}', style: GoogleFonts.plusJakartaSans(
                  fontSize: 12, color: AppColors.primary,
                )),
              ),
            ],
            if (appt.status == 'confirmed' || appt.status == 'pending') ...[
              const SizedBox(height: 12),
              Row(children: [
                if (appt.status == 'pending') Expanded(child: OutlinedButton(
                  onPressed: onCancel,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.danger,
                    side: const BorderSide(color: AppColors.danger),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: Text('Cancel', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w600)),
                )),
                if (appt.status == 'confirmed') ...[
                  Expanded(child: ElevatedButton.icon(
                    onPressed: () => launchUrl(
                      Uri.parse('https://meet.jit.si/chipatara-${appt.id}'),
                      mode: LaunchMode.externalApplication,
                    ),
                    icon: const Icon(Icons.videocam_outlined, size: 16),
                    label: Text('Join Video', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.success,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  )),
                ],
              ]),
            ],
            if (appt.status == 'completed' && appt.rating == null) ...[
              const SizedBox(height: 12),
              SizedBox(width: double.infinity, child: OutlinedButton.icon(
                onPressed: onRate,
                icon: const Icon(Icons.star_outline_rounded, size: 16),
                label: Text('Rate this visit', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w600)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  side: const BorderSide(color: AppColors.primary),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              )),
            ],
          ]),
        ),
      ]),
    );
  }
}

class _RatingSheet extends StatefulWidget {
  final Function(double, String) onSubmit;
  final VoidCallback onClose;
  const _RatingSheet({required this.onSubmit, required this.onClose});

  @override
  State<_RatingSheet> createState() => _RatingSheetState();
}

class _RatingSheetState extends State<_RatingSheet> {
  double _rating = 5;
  final _ctrl = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 20)],
      ),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text('Rate your visit', style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w800)),
          IconButton(onPressed: widget.onClose, icon: const Icon(Icons.close)),
        ]),
        const SizedBox(height: 16),
        Row(mainAxisAlignment: MainAxisAlignment.center, children: List.generate(5, (i) =>
          GestureDetector(
            onTap: () => setState(() => _rating = i + 1),
            child: Icon(
              i < _rating ? Icons.star_rounded : Icons.star_outline_rounded,
              color: const Color(0xFFF59E0B), size: 36,
            ),
          ),
        )),
        const SizedBox(height: 16),
        TextField(
          controller: _ctrl,
          maxLines: 3,
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
        const SizedBox(height: 16),
        AppButton(label: 'Submit Rating', onTap: () => widget.onSubmit(_rating, _ctrl.text)),
        SizedBox(height: MediaQuery.of(context).viewInsets.bottom),
      ]),
    );
  }
}
