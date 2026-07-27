import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../config/constants.dart';
import '../../models/models.dart';
import '../../services/api_service.dart';
import '../../widgets/widgets.dart';
import 'payment_screen.dart';

class BookingScreen extends StatefulWidget {
  final Doctor doctor;
  const BookingScreen({super.key, required this.doctor});

  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  List<AvailabilitySlot> _slots = [];
  AvailabilitySlot? _selectedSlot;
  DateTime _selectedDate = DateTime.now().add(const Duration(days: 1));
  final _reason = TextEditingController();
  bool _loading = false;
  bool _slotsLoading = true;
  bool _success = false;

  @override
  void initState() {
    super.initState();
    _loadSlots();
  }

  List<AvailabilitySlot> get _daySlots {
    final dayName = DateFormat('EEEE').format(_selectedDate);
    return _slots.where((s) => s.day == dayName).toList();
  }

  Future<void> _loadSlots() async {
    try {
      _slots = await ApiService.getAvailability(widget.doctor.id);
    } catch (_) {}
    setState(() => _slotsLoading = false);
  }

  Future<void> _book() async {
    if (_reason.text.trim().isEmpty || _selectedSlot == null) return;

    // Merge selected date with slot start time (e.g. "09:00")
    final timeParts = _selectedSlot!.startTime.split(':');
    final appointmentDateTime = DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      int.parse(timeParts[0]),
      int.parse(timeParts[1]),
    );
    final dateStr = appointmentDateTime.toIso8601String();

    final fee = widget.doctor.profile?.consultationFee ?? 0;
    setState(() => _loading = true);
    try {
      if (fee > 0) {
        // Paid appointment — go through Paystack
        final res = await ApiService.initializePayment(
          doctorId: widget.doctor.id,
          date: dateStr,
          reason: _reason.text.trim(),
        );
        if (!mounted) return;
        await Navigator.push(context, MaterialPageRoute(
          builder: (_) => PaymentScreen(
            authorizationUrl: res['authorization_url'] as String,
            reference: res['reference'] as String,
            doctorId: widget.doctor.id,
            date: dateStr,
            reason: _reason.text.trim(),
            doctorName: widget.doctor.name,
            fee: (res['fee'] as num).toDouble(),
          ),
        ));
      } else {
        // Free appointment — direct booking
        await ApiService.bookAppointment(
          doctorId: widget.doctor.id,
          date: dateStr,
          reason: _reason.text.trim(),
          slotId: _selectedSlot!.id,
        );
        if (mounted) setState(() => _success = true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceAll('Exception: ', '')), backgroundColor: AppColors.danger),
      );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_success) {
      return _SuccessScreen(
      doctorName: widget.doctor.name,
      onDone: () => Navigator.pop(context),
    );
    }

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(children: [
        GradientHeader(
          eyebrow: 'BOOKING',
          title: widget.doctor.name,
          subtitle: widget.doctor.profile?.specialization,
          onBack: () => Navigator.pop(context),
        ),
        Expanded(child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // Doctor info card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), boxShadow: AppShadows.card),
              child: Row(children: [
                Container(
                  width: 48, height: 48,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [AppColors.gradientStart, AppColors.gradientEnd]),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Center(child: Text(widget.doctor.name[0], style: GoogleFonts.plusJakartaSans(
                    fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white,
                  ))),
                ),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(widget.doctor.name, style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                  if (widget.doctor.profile != null) ...[
                    Text(widget.doctor.profile!.hospital, style: GoogleFonts.plusJakartaSans(fontSize: 12, color: AppColors.textSecondary)),
                    Text('ZWL ${widget.doctor.profile!.consultationFee.toStringAsFixed(0)} consultation',
                      style: GoogleFonts.plusJakartaSans(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w600)),
                  ],
                ])),
              ]),
            ),
            const SizedBox(height: 20),

            // Date picker
            _FormSection(title: 'Select Date', child: GestureDetector(
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: _selectedDate,
                  firstDate: DateTime.now().add(const Duration(days: 1)),
                  lastDate: DateTime.now().add(const Duration(days: 90)),
                );
                if (picked != null) setState(() { _selectedDate = picked; _selectedSlot = null; });
              },
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.primaryLight, borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                ),
                child: Row(children: [
                  const Icon(Icons.calendar_month_outlined, color: AppColors.primary),
                  const SizedBox(width: 10),
                  Text(DateFormat('EEEE, MMMM d, y').format(_selectedDate),
                    style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w600, color: AppColors.primary)),
                ]),
              ),
            )),
            const SizedBox(height: 16),

            // Time slot picker
            _FormSection(title: 'Select Time Slot', child: _slotsLoading
              ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
              : _daySlots.isEmpty
                ? Text(
                    _slots.isEmpty ? 'No slots available' : 'No slots on ${DateFormat('EEEE').format(_selectedDate)}',
                    style: GoogleFonts.plusJakartaSans(color: AppColors.textMuted),
                  )
                : Wrap(spacing: 8, runSpacing: 8, children: _daySlots.map((s) => GestureDetector(
                    onTap: () => setState(() => _selectedSlot = s),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: _selectedSlot?.id == s.id ? AppColors.primary : Colors.white,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: _selectedSlot?.id == s.id ? AppColors.primary : const Color(0xFFE5E7EB),
                        ),
                      ),
                      child: Text(s.label, style: GoogleFonts.plusJakartaSans(
                        fontSize: 12, fontWeight: FontWeight.w600,
                        color: _selectedSlot?.id == s.id ? Colors.white : AppColors.textSecondary,
                      )),
                    ),
                  )).toList(),
            )),
            const SizedBox(height: 16),

            // Reason
            _FormSection(title: 'Reason for Visit', child: AppInput(
              label: '', hint: 'Describe your symptoms or reason for visiting…',
              controller: _reason, maxLines: 4,
            )),
            const SizedBox(height: 24),

            AppButton(
              label: 'Confirm Booking',
              icon: Icons.check_rounded,
              loading: _loading,
              onTap: _selectedSlot != null && _reason.text.isNotEmpty ? _book : null,
            ),
            const SizedBox(height: 24),
          ],
        )),
      ]),
    );
  }
}

class _FormSection extends StatelessWidget {
  final String title;
  final Widget child;
  const _FormSection({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), boxShadow: AppShadows.card),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: GoogleFonts.plusJakartaSans(
          fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary,
        )),
        const SizedBox(height: 12),
        child,
      ]),
    );
  }
}

class _SuccessScreen extends StatelessWidget {
  final String doctorName;
  final VoidCallback onDone;
  const _SuccessScreen({required this.doctorName, required this.onDone});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: SafeArea(child: Center(child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Container(
            width: 96, height: 96,
            decoration: BoxDecoration(color: AppColors.successLight, shape: BoxShape.circle),
            child: const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 52),
          ),
          const SizedBox(height: 24),
          Text("You're all set!", style: GoogleFonts.plusJakartaSans(
            fontSize: 26, fontWeight: FontWeight.w800, color: AppColors.textPrimary,
          )),
          const SizedBox(height: 8),
          Text('Your appointment with $doctorName has been booked. You\'ll receive a confirmation shortly.',
            textAlign: TextAlign.center,
            style: GoogleFonts.plusJakartaSans(fontSize: 14, color: AppColors.textSecondary)),
          const SizedBox(height: 32),
          AppButton(label: 'Done', onTap: onDone),
        ]),
      ))),
    );
  }
}
