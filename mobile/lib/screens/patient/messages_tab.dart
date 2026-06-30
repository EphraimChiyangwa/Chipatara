import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../config/constants.dart';
import '../../models/models.dart';
import '../../services/api_service.dart';
import '../../widgets/widgets.dart';
import '../chat_screen.dart';

class MessagesTab extends StatefulWidget {
  const MessagesTab({super.key});

  @override
  State<MessagesTab> createState() => _MessagesTabState();
}

class _MessagesTabState extends State<MessagesTab> {
  List<Appointment> _appointments = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final all = await ApiService.getPatientAppointments();
      _appointments = all.where((a) => a.status == 'confirmed' || a.status == 'completed').toList();
    } catch (_) {}
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      GradientHeader(eyebrow: 'INBOX', title: 'Messages', subtitle: 'Chat with your doctors'),
      Expanded(child: _loading
        ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
        : _appointments.isEmpty
          ? const EmptyState(
              icon: Icons.chat_bubble_outline_rounded,
              title: 'No conversations yet',
              description: 'Messages appear here once a doctor confirms your appointment',
            )
          : RefreshIndicator(
              onRefresh: _load,
              color: AppColors.primary,
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(vertical: 8),
                itemCount: _appointments.length,
                itemBuilder: (_, i) {
                  final appt = _appointments[i];
                  final date = DateTime.tryParse(appt.date);
                  return ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    leading: CircleAvatar(
                      radius: 26,
                      backgroundColor: AppColors.primaryLight,
                      child: Text(
                        appt.doctorName.isNotEmpty ? appt.doctorName[0].toUpperCase() : 'D',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.primary,
                        ),
                      ),
                    ),
                    title: Text(appt.doctorName, style: GoogleFonts.plusJakartaSans(
                      fontWeight: FontWeight.w700, color: AppColors.textPrimary,
                    )),
                    subtitle: Text(
                      appt.status == 'confirmed' ? 'Tap to start consultation' : appt.reason,
                      style: GoogleFonts.plusJakartaSans(fontSize: 12, color: AppColors.textSecondary),
                    ),
                    trailing: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      if (date != null) Text(
                        DateFormat('MMM d').format(date),
                        style: GoogleFonts.plusJakartaSans(fontSize: 11, color: AppColors.textMuted),
                      ),
                      if (appt.status == 'confirmed') ...[
                        const SizedBox(height: 4),
                        Container(
                          width: 8, height: 8,
                          decoration: const BoxDecoration(
                            color: AppColors.primary, shape: BoxShape.circle,
                          ),
                        ),
                      ],
                    ]),
                    onTap: () => Navigator.push(context, MaterialPageRoute(
                      builder: (_) => ChatScreen(appointment: appt),
                    )),
                  );
                },
              ),
            )),
    ]);
  }
}
