import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../config/constants.dart';
import '../../models/models.dart';
import '../../services/api_service.dart';
import '../../widgets/widgets.dart';
import '../chat_screen.dart';

class DoctorMessagesTab extends StatefulWidget {
  const DoctorMessagesTab({super.key});

  @override
  State<DoctorMessagesTab> createState() => _DoctorMessagesTabState();
}

class _DoctorMessagesTabState extends State<DoctorMessagesTab> {
  List<Appointment> _conversations = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final all = await ApiService.getDoctorAppointments();
      setState(() {
        _conversations = all
          .where((a) => a.status == 'confirmed' || a.status == 'completed')
          .toList();
      });
    } catch (_) {}
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      const GradientHeader(
        eyebrow: 'INBOX',
        title: 'Messages',
        subtitle: 'Chat with your patients',
      ),
      Expanded(child: _loading
        ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
        : _conversations.isEmpty
          ? const EmptyState(
              icon: Icons.chat_bubble_outline_rounded,
              title: 'No conversations yet',
              description: 'Chats appear here once you confirm an appointment',
            )
          : RefreshIndicator(
              onRefresh: _load,
              color: AppColors.primary,
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(vertical: 8),
                itemCount: _conversations.length,
                itemBuilder: (_, i) {
                  final appt = _conversations[i];
                  final date = DateTime.tryParse(appt.date);
                  final isActive = appt.status == 'confirmed';
                  return ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    leading: CircleAvatar(
                      radius: 26,
                      backgroundColor: isActive
                          ? AppColors.primaryLight
                          : const Color(0xFFF3F4F6),
                      child: Text(
                        appt.patientName.isNotEmpty ? appt.patientName[0].toUpperCase() : 'P',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 18, fontWeight: FontWeight.w800,
                          color: isActive ? AppColors.primary : AppColors.textMuted,
                        ),
                      ),
                    ),
                    title: Text(appt.patientName, style: GoogleFonts.plusJakartaSans(
                      fontWeight: FontWeight.w700, color: AppColors.textPrimary,
                    )),
                    subtitle: Text(
                      appt.reason,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 12, color: AppColors.textSecondary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    trailing: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      if (date != null) Text(
                        DateFormat('MMM d').format(date),
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 11, color: AppColors.textMuted,
                        ),
                      ),
                      if (isActive) ...[
                        const SizedBox(height: 4),
                        Container(
                          width: 8, height: 8,
                          decoration: const BoxDecoration(
                            color: AppColors.success, shape: BoxShape.circle,
                          ),
                        ),
                      ],
                    ]),
                    onTap: () => Navigator.push(context, MaterialPageRoute(
                      builder: (_) => ChatScreen(appointment: appt),
                    )).then((_) => _load()),
                  );
                },
              ),
            )),
    ]);
  }
}
