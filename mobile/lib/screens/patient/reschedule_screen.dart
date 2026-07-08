import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../config/constants.dart';
import '../../models/models.dart';
import '../../services/api_service.dart';
import '../../widgets/widgets.dart';

class RescheduleScreen extends StatefulWidget {
  final Appointment appointment;
  final VoidCallback onRescheduled;

  const RescheduleScreen({
    super.key,
    required this.appointment,
    required this.onRescheduled,
  });

  @override
  State<RescheduleScreen> createState() => _RescheduleScreenState();
}

class _RescheduleScreenState extends State<RescheduleScreen> {
  List<AvailabilitySlot> _slots = [];
  AvailabilitySlot? _selectedSlot;
  DateTime _selectedDate = DateTime.now().add(const Duration(days: 1));
  bool _slotsLoading = true;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _loadSlots();
  }

  Future<void> _loadSlots() async {
    try {
      _slots = await ApiService.getAvailability(widget.appointment.doctorId);
    } catch (_) {}
    setState(() => _slotsLoading = false);
  }

  Future<void> _confirm() async {
    if (_selectedSlot == null) return;
    setState(() => _loading = true);

    // Combine selected date with the slot's start time
    final timeParts = _selectedSlot!.startTime.split(':');
    final scheduled = DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      int.tryParse(timeParts[0]) ?? 9,
      int.tryParse(timeParts[1]) ?? 0,
    );

    try {
      await ApiService.rescheduleAppointment(widget.appointment.id, scheduled);
      widget.onRescheduled();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(e.toString().replaceAll('Exception: ', '')),
          backgroundColor: AppColors.danger,
        ));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentDate = DateTime.tryParse(widget.appointment.date);

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(children: [
        GradientHeader(
          eyebrow: 'RESCHEDULE',
          title: widget.appointment.doctorName,
          subtitle: 'Pick a new date and time',
          onBack: () => Navigator.pop(context),
          colors: const [Color(0xFF7C3AED), Color(0xFF9061F9), Color(0xFFA78BFA)],
        ),
        Expanded(child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // Current appointment info
            if (currentDate != null)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.dangerLight,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.danger.withValues(alpha: 0.2)),
                ),
                child: Row(children: [
                  const Icon(Icons.event_busy_outlined, color: AppColors.danger, size: 18),
                  const SizedBox(width: 10),
                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Current appointment', style: GoogleFonts.plusJakartaSans(
                      fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.danger,
                    )),
                    Text(DateFormat('EEEE, MMMM d, y · h:mm a').format(currentDate),
                      style: GoogleFonts.plusJakartaSans(fontSize: 13, color: AppColors.danger)),
                  ]),
                ]),
              ),
            const SizedBox(height: 20),

            // New date picker
            _Section(
              title: 'New Date',
              child: GestureDetector(
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: _selectedDate,
                    firstDate: DateTime.now().add(const Duration(days: 1)),
                    lastDate: DateTime.now().add(const Duration(days: 90)),
                    builder: (context, child) => Theme(
                      data: Theme.of(context).copyWith(
                        colorScheme: const ColorScheme.light(primary: Color(0xFF7C3AED)),
                      ),
                      child: child!,
                    ),
                  );
                  if (picked != null) setState(() => _selectedDate = picked);
                },
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF5F3FF),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF7C3AED).withValues(alpha: 0.3)),
                  ),
                  child: Row(children: [
                    const Icon(Icons.calendar_month_outlined, color: Color(0xFF7C3AED)),
                    const SizedBox(width: 10),
                    Text(
                      DateFormat('EEEE, MMMM d, y').format(_selectedDate),
                      style: GoogleFonts.plusJakartaSans(
                        fontWeight: FontWeight.w600, color: const Color(0xFF7C3AED),
                      ),
                    ),
                  ]),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Time slot picker
            _Section(
              title: 'New Time Slot',
              child: _slotsLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF7C3AED)))
                : _slots.isEmpty
                  ? Text('No slots available for this doctor.',
                      style: GoogleFonts.plusJakartaSans(color: AppColors.textMuted))
                  : Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _slots.map((s) => GestureDetector(
                        onTap: () => setState(() => _selectedSlot = s),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            color: _selectedSlot?.id == s.id
                                ? const Color(0xFF7C3AED)
                                : Colors.white,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: _selectedSlot?.id == s.id
                                  ? const Color(0xFF7C3AED)
                                  : const Color(0xFFE5E7EB),
                            ),
                          ),
                          child: Text(s.label, style: GoogleFonts.plusJakartaSans(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: _selectedSlot?.id == s.id
                                ? Colors.white
                                : AppColors.textSecondary,
                          )),
                        ),
                      )).toList(),
                    ),
            ),
            const SizedBox(height: 24),

            AppButton(
              label: 'Confirm Reschedule',
              icon: Icons.event_repeat_outlined,
              color: const Color(0xFF7C3AED),
              loading: _loading,
              onTap: _selectedSlot != null ? _confirm : null,
            ),
            const SizedBox(height: 8),
            AppButton(
              label: 'Keep Original Time',
              color: AppColors.surface,
              textColor: AppColors.textSecondary,
              onTap: () => Navigator.pop(context),
            ),
            const SizedBox(height: 32),
          ],
        )),
      ]),
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  final Widget child;
  const _Section({required this.title, required this.child});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(20),
      boxShadow: AppShadows.card,
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: GoogleFonts.plusJakartaSans(
        fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary,
      )),
      const SizedBox(height: 12),
      child,
    ]),
  );
}
