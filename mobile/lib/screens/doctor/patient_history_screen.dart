import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../config/constants.dart';
import '../../models/models.dart';
import '../../services/api_service.dart';
import '../../widgets/widgets.dart';

class PatientHistoryScreen extends StatefulWidget {
  final String patientId;
  final String patientName;

  const PatientHistoryScreen({
    super.key,
    required this.patientId,
    required this.patientName,
  });

  @override
  State<PatientHistoryScreen> createState() => _PatientHistoryScreenState();
}

class _PatientHistoryScreenState extends State<PatientHistoryScreen> {
  List<Appointment> _history = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      _history = await ApiService.getPatientHistoryWithDoctor(widget.patientId);
    } catch (_) {}
    setState(() => _loading = false);
  }

  Color _statusColor(String status) => switch (status) {
    'confirmed'  => AppColors.success,
    'completed'  => AppColors.primary,
    'cancelled'  => AppColors.danger,
    _            => AppColors.warning,
  };

  String _statusLabel(String status) => switch (status) {
    'confirmed'  => 'Confirmed',
    'completed'  => 'Completed',
    'cancelled'  => 'Cancelled',
    _            => 'Pending',
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(children: [
        GradientHeader(
          eyebrow: 'PATIENT HISTORY',
          title: widget.patientName,
          subtitle: '${_history.length} appointment${_history.length == 1 ? '' : 's'}',
          onBack: () => Navigator.pop(context),
        ),
        Expanded(child: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : RefreshIndicator(
              onRefresh: _load,
              color: AppColors.primary,
              child: _history.isEmpty
                ? ListView(children: [const EmptyState(
                    icon: Icons.history_outlined,
                    title: 'No history yet',
                    description: 'No past appointments with this patient',
                  )])
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _history.length,
                    itemBuilder: (_, i) => _HistoryCard(appt: _history[i],
                      statusColor: _statusColor(_history[i].status),
                      statusLabel: _statusLabel(_history[i].status),
                    ),
                  ),
            )),
      ]),
    );
  }
}

class _HistoryCard extends StatelessWidget {
  final Appointment appt;
  final Color statusColor;
  final String statusLabel;

  const _HistoryCard({required this.appt, required this.statusColor, required this.statusLabel});

  @override
  Widget build(BuildContext context) {
    final date = DateTime.tryParse(appt.date);
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: AppShadows.card,
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(statusLabel, style: GoogleFonts.plusJakartaSans(
              fontSize: 11, fontWeight: FontWeight.w700, color: statusColor,
            )),
          ),
          const Spacer(),
          if (date != null) Text(
            DateFormat('MMM d, y').format(date),
            style: GoogleFonts.plusJakartaSans(
              fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary,
            ),
          ),
        ]),
        const SizedBox(height: 10),
        Text(appt.reason, style: GoogleFonts.plusJakartaSans(
          fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary,
        )),
        if (appt.notes != null && appt.notes!.isNotEmpty) ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Icon(Icons.sticky_note_2_outlined, color: AppColors.primary, size: 14),
              const SizedBox(width: 8),
              Expanded(child: Text(appt.notes!, style: GoogleFonts.plusJakartaSans(
                fontSize: 12, color: AppColors.primary,
              ))),
            ]),
          ),
        ],
        if (appt.rating != null) ...[
          const SizedBox(height: 8),
          Row(children: [
            ...List.generate(5, (i) => Icon(
              i < (appt.rating ?? 0) ? Icons.star_rounded : Icons.star_outline_rounded,
              color: const Color(0xFFF59E0B), size: 14,
            )),
            const SizedBox(width: 6),
            if (appt.review != null && appt.review!.isNotEmpty)
              Expanded(child: Text(appt.review!, style: GoogleFonts.plusJakartaSans(
                fontSize: 12, color: AppColors.textSecondary,
              ), overflow: TextOverflow.ellipsis)),
          ]),
        ],
        if (date != null) ...[
          const SizedBox(height: 6),
          Text(DateFormat('h:mm a').format(date), style: GoogleFonts.plusJakartaSans(
            fontSize: 12, color: AppColors.textMuted,
          )),
        ],
      ]),
    );
  }
}
