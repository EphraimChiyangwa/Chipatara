import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../config/constants.dart';
import '../../models/models.dart';
import '../../services/api_service.dart';
import '../../widgets/widgets.dart';
import 'appointment_detail_screen.dart';
import 'video_call_screen.dart';

class AppointmentsTab extends StatefulWidget {
  const AppointmentsTab({super.key});

  @override
  State<AppointmentsTab> createState() => _AppointmentsTabState();
}

class _AppointmentsTabState extends State<AppointmentsTab>
    with SingleTickerProviderStateMixin {
  late final TabController _tabCtrl;
  List<Appointment> _all = [];
  bool _loading = true;

  List<Appointment> get _upcoming => _all
      .where((a) => a.status == 'pending' || a.status == 'confirmed')
      .toList()
    ..sort((a, b) {
      final da = DateTime.tryParse(a.date) ?? DateTime(9999);
      final db = DateTime.tryParse(b.date) ?? DateTime(9999);
      return da.compareTo(db);
    });

  List<Appointment> get _completed => _all
      .where((a) => a.status == 'completed')
      .toList()
    ..sort((a, b) {
      final da = DateTime.tryParse(a.date) ?? DateTime(0);
      final db = DateTime.tryParse(b.date) ?? DateTime(0);
      return db.compareTo(da);
    });

  List<Appointment> get _cancelled =>
      _all.where((a) => a.status == 'cancelled').toList();

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this)
      ..addListener(() => setState(() {}));
    _load();
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      _all = await ApiService.getPatientAppointments();
    } catch (_) {}
    setState(() => _loading = false);
  }

  Future<void> _viewRx(Appointment appt) async {
    final rx = await ApiService.getPrescription(appt.id);
    if (!mounted) return;
    if (rx == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No prescription for this appointment yet')),
      );
      return;
    }
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _RxSheet(rx: rx),
    );
  }

  void _showRating(Appointment appt) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _RatingSheet(
        onSubmit: (r, review) async {
          Navigator.pop(context);
          await ApiService.rateAppointment(appt.id, r, review);
          _load();
        },
        onClose: () => Navigator.pop(context),
      ),
    );
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

  Widget _tabPill(String label, int index, int count) {
    final active = _tabCtrl.index == index;
    return GestureDetector(
      onTap: () => _tabCtrl.animateTo(index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: active ? Colors.white : Colors.white.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Text(label, style: GoogleFonts.plusJakartaSans(
            fontSize: 12, fontWeight: FontWeight.w700,
            color: active ? AppColors.primary : Colors.white,
          )),
          if (count > 0) ...[
            const SizedBox(width: 5),
            Container(
              width: 18, height: 18,
              decoration: BoxDecoration(
                color: active ? AppColors.primary : Colors.white.withValues(alpha: 0.35),
                shape: BoxShape.circle,
              ),
              child: Center(child: Text('$count', style: GoogleFonts.plusJakartaSans(
                fontSize: 10, fontWeight: FontWeight.w800, color: Colors.white,
              ))),
            ),
          ],
        ]),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      // Header with embedded tab pills
      Container(
        width: double.infinity,
        padding: EdgeInsets.only(
          top: MediaQuery.of(context).padding.top + 16,
          left: 24, right: 24, bottom: 20,
        ),
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF2A44C8), Color(0xFF3B5BDB), Color(0xFF5B7AF5)],
            begin: Alignment.topLeft, end: Alignment.bottomRight,
          ),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('SCHEDULE', style: GoogleFonts.plusJakartaSans(
            fontSize: 11, fontWeight: FontWeight.w600,
            color: Colors.white.withValues(alpha: 0.6), letterSpacing: 1.4,
          )),
          const SizedBox(height: 4),
          Text('My Appointments', style: GoogleFonts.plusJakartaSans(
            fontSize: 24, fontWeight: FontWeight.w800, color: Colors.white,
          )),
          const SizedBox(height: 16),
          Row(children: [
            _tabPill('Upcoming', 0, _upcoming.length),
            const SizedBox(width: 8),
            _tabPill('Completed', 1, _completed.length),
            const SizedBox(width: 8),
            _tabPill('Cancelled', 2, _cancelled.length),
          ]),
        ]),
      ),

      // Tab content
      Expanded(child: _loading
        ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
        : TabBarView(
            controller: _tabCtrl,
            children: [
              _ApptList(
                appointments: _upcoming,
                emptyIcon: Icons.calendar_today_outlined,
                emptyTitle: 'No upcoming appointments',
                emptyDesc: 'Book a consultation with a doctor to get started',
                onRefresh: _load,
                itemBuilder: (appt) => _ApptCard(
                  appt: appt,
                  statusColor: _statusColor(appt.status),
                  statusIcon: _statusIcon(appt.status),
                  onTap: () => Navigator.push(context, MaterialPageRoute(
                    builder: (_) => AppointmentDetailScreen(
                      appointment: appt, onRefresh: _load,
                    ),
                  )),
                  onCancel: () async {
                    await ApiService.cancelAppointment(appt.id);
                    _load();
                  },
                  onJoinVideo: () => Navigator.push(context, MaterialPageRoute(
                    builder: (_) => VideoCallScreen(appointment: appt),
                  )),
                  onRate: null,
                  onViewRx: null,
                ),
              ),
              _ApptList(
                appointments: _completed,
                emptyIcon: Icons.task_alt_rounded,
                emptyTitle: 'No completed appointments',
                emptyDesc: 'Your finished consultations appear here',
                onRefresh: _load,
                itemBuilder: (appt) => _ApptCard(
                  appt: appt,
                  statusColor: _statusColor(appt.status),
                  statusIcon: _statusIcon(appt.status),
                  onTap: () => Navigator.push(context, MaterialPageRoute(
                    builder: (_) => AppointmentDetailScreen(
                      appointment: appt, onRefresh: _load,
                    ),
                  )),
                  onCancel: null,
                  onJoinVideo: null,
                  onRate: appt.rating == null ? () => _showRating(appt) : null,
                  onViewRx: () => _viewRx(appt),
                ),
              ),
              _ApptList(
                appointments: _cancelled,
                emptyIcon: Icons.event_busy_outlined,
                emptyTitle: 'No cancelled appointments',
                emptyDesc: 'Cancelled consultations appear here',
                onRefresh: _load,
                itemBuilder: (appt) => _ApptCard(
                  appt: appt,
                  statusColor: _statusColor(appt.status),
                  statusIcon: _statusIcon(appt.status),
                  onTap: () => Navigator.push(context, MaterialPageRoute(
                    builder: (_) => AppointmentDetailScreen(
                      appointment: appt, onRefresh: _load,
                    ),
                  )),
                  onCancel: null,
                  onJoinVideo: null,
                  onRate: null,
                  onViewRx: null,
                ),
              ),
            ],
          ),
      ),
    ]);
  }
}

// ── Tab list container ────────────────────────────────────────────────────────
class _ApptList extends StatelessWidget {
  final List<Appointment> appointments;
  final IconData emptyIcon;
  final String emptyTitle;
  final String emptyDesc;
  final VoidCallback onRefresh;
  final Widget Function(Appointment) itemBuilder;

  const _ApptList({
    required this.appointments,
    required this.emptyIcon,
    required this.emptyTitle,
    required this.emptyDesc,
    required this.onRefresh,
    required this.itemBuilder,
  });

  @override
  Widget build(BuildContext context) {
    if (appointments.isEmpty) {
      return EmptyState(
        icon: emptyIcon,
        title: emptyTitle,
        description: emptyDesc,
      );
    }
    return RefreshIndicator(
      onRefresh: () async => onRefresh(),
      color: AppColors.primary,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 100),
        itemCount: appointments.length,
        itemBuilder: (_, i) => itemBuilder(appointments[i]),
      ),
    );
  }
}

// ── Appointment card ──────────────────────────────────────────────────────────
class _ApptCard extends StatelessWidget {
  final Appointment appt;
  final Color statusColor;
  final IconData statusIcon;
  final VoidCallback onTap;
  final VoidCallback? onCancel;
  final VoidCallback? onJoinVideo;
  final VoidCallback? onRate;
  final VoidCallback? onViewRx;

  const _ApptCard({
    required this.appt,
    required this.statusColor,
    required this.statusIcon,
    required this.onTap,
    this.onCancel,
    this.onJoinVideo,
    this.onRate,
    this.onViewRx,
  });

  @override
  Widget build(BuildContext context) {
    final date = DateTime.tryParse(appt.date);
    final hasActions = onCancel != null || onJoinVideo != null ||
        onRate != null || onViewRx != null;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: AppShadows.card,
        ),
        child: Column(children: [
          // Status bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.08),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: Row(children: [
              Icon(statusIcon, color: statusColor, size: 15),
              const SizedBox(width: 6),
              Text(appt.status.toUpperCase(), style: GoogleFonts.plusJakartaSans(
                fontSize: 10, fontWeight: FontWeight.w700,
                color: statusColor, letterSpacing: 0.8,
              )),
              const Spacer(),
              if (date != null) Text(
                DateFormat('MMM d · h:mm a').format(date),
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 11, color: AppColors.textMuted,
                ),
              ),
            ]),
          ),

          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF2A44C8), Color(0xFF5B7AF5)],
                      begin: Alignment.topLeft, end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(child: Text(
                    appt.doctorName.isNotEmpty ? appt.doctorName[0].toUpperCase() : 'D',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white,
                    ),
                  )),
                ),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(appt.doctorName, style: GoogleFonts.plusJakartaSans(
                    fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary,
                  )),
                  Text(appt.reason, style: GoogleFonts.plusJakartaSans(
                    fontSize: 12, color: AppColors.textSecondary,
                  ), maxLines: 1, overflow: TextOverflow.ellipsis),
                ])),
                const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 20),
              ]),

              if (appt.notes != null && appt.notes!.isNotEmpty) ...[
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(children: [
                    const Icon(Icons.notes_rounded, size: 13, color: AppColors.primary),
                    const SizedBox(width: 6),
                    Expanded(child: Text(appt.notes!, style: GoogleFonts.plusJakartaSans(
                      fontSize: 12, color: AppColors.primary,
                    ), maxLines: 2, overflow: TextOverflow.ellipsis)),
                  ]),
                ),
              ],

              if (appt.rating != null) ...[
                const SizedBox(height: 10),
                Row(children: [
                  ...List.generate(5, (i) => Icon(
                    i < appt.rating! ? Icons.star_rounded : Icons.star_outline_rounded,
                    size: 14, color: const Color(0xFFF59E0B),
                  )),
                  const SizedBox(width: 6),
                  Text('You rated this visit', style: GoogleFonts.plusJakartaSans(
                    fontSize: 11, color: AppColors.textMuted,
                  )),
                ]),
              ],

              if (hasActions) ...[
                const SizedBox(height: 12),
                Row(children: [
                  if (onCancel != null) ...[
                    Expanded(child: _ActionButton(
                      label: 'Cancel',
                      icon: Icons.close_rounded,
                      color: AppColors.danger,
                      outlined: true,
                      onTap: onCancel!,
                    )),
                    const SizedBox(width: 8),
                  ],
                  if (onJoinVideo != null)
                    Expanded(child: _ActionButton(
                      label: 'Join Video',
                      icon: Icons.videocam_outlined,
                      color: AppColors.success,
                      onTap: onJoinVideo!,
                    )),
                  if (onViewRx != null) ...[
                    Expanded(child: _ActionButton(
                      label: 'View Rx',
                      icon: Icons.medication_outlined,
                      color: const Color(0xFF059669),
                      outlined: true,
                      onTap: onViewRx!,
                    )),
                    if (onRate != null) const SizedBox(width: 8),
                  ],
                  if (onRate != null)
                    Expanded(child: _ActionButton(
                      label: 'Rate',
                      icon: Icons.star_outline_rounded,
                      color: AppColors.primary,
                      outlined: true,
                      onTap: onRate!,
                    )),
                ]),
              ],
            ]),
          ),
        ]),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final bool outlined;
  final VoidCallback onTap;

  const _ActionButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
    this.outlined = false,
  });

  @override
  Widget build(BuildContext context) {
    if (outlined) {
      return OutlinedButton.icon(
        onPressed: onTap,
        icon: Icon(icon, size: 15),
        label: Text(label, style: GoogleFonts.plusJakartaSans(
          fontSize: 12, fontWeight: FontWeight.w700,
        )),
        style: OutlinedButton.styleFrom(
          foregroundColor: color,
          side: BorderSide(color: color.withValues(alpha: 0.6)),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          padding: const EdgeInsets.symmetric(vertical: 8),
        ),
      );
    }
    return ElevatedButton.icon(
      onPressed: onTap,
      icon: Icon(icon, size: 15),
      label: Text(label, style: GoogleFonts.plusJakartaSans(
        fontSize: 12, fontWeight: FontWeight.w700,
      )),
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        foregroundColor: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        padding: const EdgeInsets.symmetric(vertical: 8),
      ),
    );
  }
}

// ── Rating sheet ──────────────────────────────────────────────────────────────
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
      padding: EdgeInsets.only(
        left: 24, right: 24, top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 20)],
      ),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        // Handle
        Container(width: 40, height: 4,
          decoration: BoxDecoration(color: const Color(0xFFE5E7EB), borderRadius: BorderRadius.circular(2))),
        const SizedBox(height: 20),
        Row(children: [
          Text('Rate your visit', style: GoogleFonts.plusJakartaSans(
            fontSize: 18, fontWeight: FontWeight.w800,
          )),
          const Spacer(),
          IconButton(onPressed: widget.onClose, icon: const Icon(Icons.close)),
        ]),
        const SizedBox(height: 16),
        Row(mainAxisAlignment: MainAxisAlignment.center, children: List.generate(5, (i) =>
          GestureDetector(
            onTap: () => setState(() => _rating = (i + 1).toDouble()),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Icon(
                i < _rating ? Icons.star_rounded : Icons.star_outline_rounded,
                color: const Color(0xFFF59E0B), size: 40,
              ),
            ),
          ),
        )),
        const SizedBox(height: 8),
        Text('${_rating.toInt()} / 5', style: GoogleFonts.plusJakartaSans(
          fontSize: 13, color: AppColors.textMuted, fontWeight: FontWeight.w600,
        )),
        const SizedBox(height: 16),
        TextField(
          controller: _ctrl,
          maxLines: 3,
          style: GoogleFonts.plusJakartaSans(fontSize: 14),
          decoration: InputDecoration(
            hintText: 'Leave a review (optional)…',
            hintStyle: GoogleFonts.plusJakartaSans(color: AppColors.textMuted),
            filled: true, fillColor: AppColors.surface,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide.none,
            ),
          ),
        ),
        const SizedBox(height: 16),
        AppButton(
          label: 'Submit Rating',
          onTap: () => widget.onSubmit(_rating, _ctrl.text),
        ),
      ]),
    );
  }
}

// ── Prescription view sheet ───────────────────────────────────────────────────
class _RxSheet extends StatelessWidget {
  final Prescription rx;
  const _RxSheet({required this.rx});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Handle
        Center(child: Container(width: 40, height: 4,
          decoration: BoxDecoration(color: const Color(0xFFE5E7EB), borderRadius: BorderRadius.circular(2)))),
        const SizedBox(height: 16),
        Row(children: [
          const Icon(Icons.medication_outlined, color: Color(0xFF059669), size: 22),
          const SizedBox(width: 10),
          Text('Prescription', style: GoogleFonts.plusJakartaSans(
            fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.textPrimary,
          )),
          const Spacer(),
          IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close_rounded)),
        ]),
        Text('Dr. ${rx.doctorName}', style: GoogleFonts.plusJakartaSans(
          fontSize: 13, color: AppColors.textSecondary,
        )),
        const SizedBox(height: 16),
        Flexible(child: SingleChildScrollView(child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ...rx.medications.map((m) => Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(m.name, style: GoogleFonts.plusJakartaSans(
                  fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary,
                )),
                const SizedBox(height: 6),
                if (m.dosage.isNotEmpty || m.frequency.isNotEmpty)
                  _RxRow(Icons.medication_liquid_outlined, [m.dosage, m.frequency].where((s) => s.isNotEmpty).join('  ·  ')),
                if (m.duration.isNotEmpty) _RxRow(Icons.schedule_outlined, m.duration),
                if (m.instructions.isNotEmpty) _RxRow(Icons.info_outline, m.instructions),
              ]),
            )),
            if (rx.notes.isNotEmpty)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Icon(Icons.sticky_note_2_outlined, color: Color(0xFFD97706), size: 16),
                  const SizedBox(width: 8),
                  Expanded(child: Text(rx.notes, style: GoogleFonts.plusJakartaSans(
                    fontSize: 13, color: const Color(0xFF92400E),
                  ))),
                ]),
              ),
          ],
        ))),
      ]),
    );
  }
}

class _RxRow extends StatelessWidget {
  final IconData icon;
  final String text;
  const _RxRow(this.icon, this.text);

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 4),
    child: Row(children: [
      Icon(icon, size: 13, color: AppColors.textMuted),
      const SizedBox(width: 6),
      Expanded(child: Text(text, style: GoogleFonts.plusJakartaSans(
        fontSize: 12, color: AppColors.textSecondary,
      ))),
    ]),
  );
}
