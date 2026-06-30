import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../config/constants.dart';
import '../../models/models.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../widgets/widgets.dart';
import '../chat_screen.dart';

class DoctorHomeTab extends StatefulWidget {
  const DoctorHomeTab({super.key});

  @override
  State<DoctorHomeTab> createState() => _DoctorHomeTabState();
}

class _DoctorHomeTabState extends State<DoctorHomeTab> {
  List<Appointment> _appointments = [];
  bool _loading = true;
  String _filter = 'pending';

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try { _appointments = await ApiService.getDoctorAppointments(); } catch (_) {}
    setState(() => _loading = false);
  }

  List<Appointment> get _filtered => _appointments.where((a) => a.status == _filter).toList();

  Future<void> _updateStatus(Appointment appt, String status) async {
    try {
      await ApiService.updateAppointmentStatus(appt.id, status);
      _load();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceAll('Exception: ', '')), backgroundColor: AppColors.danger),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final pending   = _appointments.where((a) => a.status == 'pending').length;
    final confirmed = _appointments.where((a) => a.status == 'confirmed').length;

    return Column(children: [
      Container(
        padding: EdgeInsets.only(
          top: MediaQuery.of(context).padding.top + 20,
          left: 24, right: 24, bottom: 24,
        ),
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF2A44C8), Color(0xFF3B5BDB), Color(0xFF5B7AF5)],
            begin: Alignment.topLeft, end: Alignment.bottomRight,
          ),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Welcome back,', style: GoogleFonts.plusJakartaSans(
                fontSize: 13, color: Colors.white.withOpacity(0.7),
              )),
              Text('Dr. ${user?.name.split(' ').last ?? ''}', style: GoogleFonts.plusJakartaSans(
                fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white,
              )),
            ]),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white.withOpacity(0.3)),
              ),
              child: Text('Online', style: GoogleFonts.plusJakartaSans(
                fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white,
              )),
            ),
          ]),
          const SizedBox(height: 20),
          Row(children: [
            Expanded(child: StatChip(
              label: 'Pending', value: pending.toString(), icon: Icons.schedule_rounded,
            )),
            const SizedBox(width: 10),
            Expanded(child: StatChip(
              label: 'Confirmed', value: confirmed.toString(), icon: Icons.check_circle_outline,
            )),
            const SizedBox(width: 10),
            Expanded(child: StatChip(
              label: 'Today', value: _appointments.where((a) {
                final d = DateTime.tryParse(a.date);
                return d != null && DateFormat('y-M-d').format(d) == DateFormat('y-M-d').format(DateTime.now());
              }).length.toString(), icon: Icons.today_rounded,
            )),
          ]),
        ]),
      ),

      // Filter tabs
      Container(
        color: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        child: Row(children: [
          _FilterChip(label: 'Pending', value: 'pending', selected: _filter, onTap: (v) { setState(() => _filter = v); }),
          _FilterChip(label: 'Confirmed', value: 'confirmed', selected: _filter, onTap: (v) { setState(() => _filter = v); }),
          _FilterChip(label: 'Completed', value: 'completed', selected: _filter, onTap: (v) { setState(() => _filter = v); }),
        ]),
      ),

      Expanded(child: _loading
        ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
        : RefreshIndicator(
            onRefresh: _load,
            color: AppColors.primary,
            child: _filtered.isEmpty
              ? ListView(children: [EmptyState(
                  icon: Icons.event_available_outlined,
                  title: 'No ${_filter} appointments',
                  description: 'Nothing here right now',
                )])
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _filtered.length,
                  itemBuilder: (_, i) => _ApptCard(
                    appt: _filtered[i],
                    onConfirm: () => _updateStatus(_filtered[i], 'confirmed'),
                    onComplete: () => _updateStatus(_filtered[i], 'completed'),
                    onCancel: () => _updateStatus(_filtered[i], 'cancelled'),
                    onChat: () => Navigator.push(context, MaterialPageRoute(
                      builder: (_) => ChatScreen(appointment: _filtered[i]),
                    )),
                  ),
                ),
          )),
    ]);
  }
}

class _FilterChip extends StatelessWidget {
  final String label, value, selected;
  final ValueChanged<String> onTap;

  const _FilterChip({required this.label, required this.value, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) => Expanded(child: GestureDetector(
    onTap: () => onTap(value),
    child: Container(
      margin: const EdgeInsets.only(right: 6),
      padding: const EdgeInsets.symmetric(vertical: 7),
      decoration: BoxDecoration(
        color: selected == value ? AppColors.primary : const Color(0xFFF3F4F6),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(label, textAlign: TextAlign.center, style: GoogleFonts.plusJakartaSans(
        fontSize: 11, fontWeight: FontWeight.w700,
        color: selected == value ? Colors.white : AppColors.textMuted,
      )),
    ),
  ));
}

class _ApptCard extends StatelessWidget {
  final Appointment appt;
  final VoidCallback onConfirm, onComplete, onCancel, onChat;

  const _ApptCard({
    required this.appt, required this.onConfirm, required this.onComplete,
    required this.onCancel, required this.onChat,
  });

  @override
  Widget build(BuildContext context) {
    final date = DateTime.tryParse(appt.date);
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(18),
        boxShadow: AppShadows.card,
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          CircleAvatar(
            backgroundColor: AppColors.primaryLight,
            child: Text(appt.patientName.isNotEmpty ? appt.patientName[0] : 'P', style: GoogleFonts.plusJakartaSans(
              fontWeight: FontWeight.w800, color: AppColors.primary,
            )),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(appt.patientName, style: GoogleFonts.plusJakartaSans(
              fontWeight: FontWeight.w700, color: AppColors.textPrimary,
            )),
            if (date != null) Text(
              DateFormat('MMM d, y · h:mm a').format(date),
              style: GoogleFonts.plusJakartaSans(fontSize: 12, color: AppColors.textSecondary),
            ),
          ])),
        ]),
        const SizedBox(height: 10),
        Text('Reason: ${appt.reason}', style: GoogleFonts.plusJakartaSans(
          fontSize: 13, color: AppColors.textSecondary,
        )),
        const SizedBox(height: 12),
        Row(children: [
          if (appt.status == 'pending') ...[
            Expanded(child: _ActionBtn(label: 'Confirm', color: AppColors.success, onTap: onConfirm)),
            const SizedBox(width: 8),
            Expanded(child: _ActionBtn(label: 'Decline', color: AppColors.danger, onTap: onCancel, outlined: true)),
          ] else if (appt.status == 'confirmed') ...[
            Expanded(child: _ActionBtn(label: 'Chat', color: AppColors.primary, icon: Icons.chat_bubble_outline, onTap: onChat)),
            const SizedBox(width: 8),
            Expanded(child: _ActionBtn(label: 'Complete', color: AppColors.success, onTap: onComplete)),
          ],
        ]),
      ]),
    );
  }
}

class _ActionBtn extends StatelessWidget {
  final String label;
  final Color color;
  final VoidCallback onTap;
  final bool outlined;
  final IconData? icon;

  const _ActionBtn({required this.label, required this.color, required this.onTap, this.outlined = false, this.icon});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 9),
      decoration: BoxDecoration(
        color: outlined ? Colors.transparent : color,
        borderRadius: BorderRadius.circular(10),
        border: outlined ? Border.all(color: color) : null,
      ),
      child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        if (icon != null) ...[Icon(icon, size: 14, color: outlined ? color : Colors.white), const SizedBox(width: 5)],
        Text(label, style: GoogleFonts.plusJakartaSans(
          fontSize: 12, fontWeight: FontWeight.w700,
          color: outlined ? color : Colors.white,
        )),
      ]),
    ),
  );
}
