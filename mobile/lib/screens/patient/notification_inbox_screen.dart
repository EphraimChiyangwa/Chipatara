import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../config/constants.dart';
import '../../services/api_service.dart';
import '../../services/notification_service.dart';
import '../chat_screen.dart';
import 'appointment_detail_screen.dart';

class NotificationInboxScreen extends StatefulWidget {
  const NotificationInboxScreen({super.key});

  @override
  State<NotificationInboxScreen> createState() => _NotificationInboxScreenState();
}

class _NotificationInboxScreenState extends State<NotificationInboxScreen> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    _items = await NotificationService.getInbox();
    setState(() => _loading = false);
  }

  Future<void> _clear() async {
    await NotificationService.clearInbox();
    setState(() => _items = []);
  }

  Future<void> _tap(Map<String, dynamic> item) async {
    final type = item['type'] as String?;
    final appointmentId = item['appointmentId'] as String?;
    if (appointmentId == null) return;

    try {
      final appt = await ApiService.getAppointmentById(appointmentId);
      if (!mounted) return;
      if (type == 'chat') {
        Navigator.push(context, MaterialPageRoute(builder: (_) => ChatScreen(appointment: appt)));
      } else {
        Navigator.push(context, MaterialPageRoute(
          builder: (_) => AppointmentDetailScreen(appointment: appt, onRefresh: () {}),
        ));
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not load details')),
      );
    }
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
              colors: [Color(0xFF2A44C8), Color(0xFF3B5BDB), Color(0xFF5B7AF5)],
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
              Text('NOTIFICATIONS', style: GoogleFonts.plusJakartaSans(
                fontSize: 11, fontWeight: FontWeight.w700,
                color: Colors.white.withValues(alpha: 0.75), letterSpacing: 1.5,
              )),
              Text('Inbox', style: GoogleFonts.plusJakartaSans(
                fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white,
              )),
            ])),
            if (_items.isNotEmpty)
              GestureDetector(
                onTap: () async {
                  final confirm = await showDialog<bool>(
                    context: context,
                    builder: (_) => AlertDialog(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      title: Text('Clear all?', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700)),
                      content: Text('This will remove all notifications from your inbox.',
                        style: GoogleFonts.plusJakartaSans()),
                      actions: [
                        TextButton(onPressed: () => Navigator.pop(context, false),
                          child: const Text('Cancel')),
                        TextButton(onPressed: () => Navigator.pop(context, true),
                          child: const Text('Clear', style: TextStyle(color: AppColors.danger))),
                      ],
                    ),
                  );
                  if (confirm == true) _clear();
                },
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.delete_outline, color: Colors.white, size: 20),
                ),
              ),
          ]),
        ),

        Expanded(child: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _items.isEmpty
            ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                const Icon(Icons.notifications_none_outlined, size: 56, color: AppColors.textMuted),
                const SizedBox(height: 12),
                Text('No notifications yet', style: GoogleFonts.plusJakartaSans(
                  fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary,
                )),
                const SizedBox(height: 6),
                Text('Appointment updates and messages will appear here',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.plusJakartaSans(fontSize: 13, color: AppColors.textSecondary)),
              ]))
            : RefreshIndicator(
                onRefresh: _load,
                color: AppColors.primary,
                child: ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                  itemCount: _items.length,
                  itemBuilder: (_, i) => _NotifTile(
                    item: _items[i],
                    onTap: () => _tap(_items[i]),
                  ),
                ),
              ),
        ),
      ]),
    );
  }
}

class _NotifTile extends StatelessWidget {
  final Map<String, dynamic> item;
  final VoidCallback onTap;
  const _NotifTile({required this.item, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final type = item['type'] as String? ?? 'general';
    final title = item['title'] as String? ?? '';
    final body = item['body'] as String? ?? '';
    final timeStr = item['time'] as String?;
    final time = timeStr != null ? DateTime.tryParse(timeStr) : null;
    final isChat = type == 'chat';

    final color = isChat ? const Color(0xFF7C3AED) : AppColors.primary;
    final bgColor = isChat ? const Color(0xFFF5F3FF) : const Color(0xFFEEF2FF);
    final icon = isChat ? Icons.chat_bubble_outline_rounded : Icons.calendar_today_outlined;

    String timeLabel = '';
    if (time != null) {
      final now = DateTime.now();
      final diff = now.difference(time);
      if (diff.inMinutes < 1) {
        timeLabel = 'Just now';
      } else if (diff.inMinutes < 60) {
        timeLabel = '${diff.inMinutes}m ago';
      } else if (diff.inHours < 24) {
        timeLabel = '${diff.inHours}h ago';
      } else {
        timeLabel = DateFormat('MMM d').format(time);
      }
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: AppShadows.soft,
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: item['appointmentId'] != null ? onTap : null,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                width: 44, height: 44,
                decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(12)),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Expanded(child: Text(title,
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary,
                    ))),
                  if (timeLabel.isNotEmpty)
                    Text(timeLabel, style: GoogleFonts.plusJakartaSans(
                      fontSize: 11, color: AppColors.textMuted,
                    )),
                ]),
                const SizedBox(height: 2),
                Text(body, style: GoogleFonts.plusJakartaSans(
                  fontSize: 12, color: AppColors.textSecondary,
                )),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: bgColor, borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(isChat ? 'Message' : 'Appointment',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 10, fontWeight: FontWeight.w700, color: color,
                    )),
                ),
              ])),
            ]),
          ),
        ),
      ),
    );
  }
}
