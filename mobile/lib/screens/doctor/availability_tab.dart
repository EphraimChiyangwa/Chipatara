import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../config/constants.dart';
import '../../models/models.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../widgets/widgets.dart';

const _days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

List<String> _timeOptions() {
  final times = <String>[];
  for (int h = 7; h <= 20; h++) {
    times.add('${h.toString().padLeft(2, '0')}:00');
    if (h < 20) times.add('${h.toString().padLeft(2, '0')}:30');
  }
  return times;
}

class DoctorAvailabilityTab extends StatefulWidget {
  const DoctorAvailabilityTab({super.key});

  @override
  State<DoctorAvailabilityTab> createState() => _DoctorAvailabilityTabState();
}

class _DoctorAvailabilityTabState extends State<DoctorAvailabilityTab> {
  List<AvailabilitySlot> _slots = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final uid = context.read<AuthProvider>().userId ?? '';
    try {
      final slots = await ApiService.getAvailability(uid);
      setState(() => _slots = slots);
    } catch (_) {}
    setState(() => _loading = false);
  }

  Future<void> _delete(AvailabilitySlot slot) async {
    try {
      await ApiService.deleteAvailabilitySlot(slot.id);
      setState(() => _slots.remove(slot));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceAll('Exception: ', ''))),
      );
      }
    }
  }

  Future<void> _showAddSheet() async {
    final added = await showModalBottomSheet<AvailabilitySlot>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _AddSlotSheet(),
    );
    if (added != null) setState(() => _slots.add(added));
  }

  Map<String, List<AvailabilitySlot>> get _byDay {
    final map = <String, List<AvailabilitySlot>>{};
    for (final d in _days) {
      final day = _slots.where((s) => s.day == d).toList()
        ..sort((a, b) => a.startTime.compareTo(b.startTime));
      if (day.isNotEmpty) map[d] = day;
    }
    return map;
  }

  @override
  Widget build(BuildContext context) {
    final grouped = _byDay;
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(children: [
        GradientHeader(
          eyebrow: 'MANAGE',
          title: 'Availability',
          subtitle: 'Set when patients can book you',
          colors: const [Color(0xFF065F46), Color(0xFF059669), Color(0xFF34D399)],
        ),
        Expanded(child: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : grouped.isEmpty
            ? _EmptyState(onAdd: _showAddSheet)
            : ListView(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 100),
                children: grouped.entries.map((entry) => _DaySection(
                  day: entry.key,
                  slots: entry.value,
                  onDelete: _delete,
                )).toList(),
              ),
        ),
      ]),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddSheet,
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add_rounded, color: Colors.white),
        label: Text('Add Slot', style: GoogleFonts.plusJakartaSans(
          fontWeight: FontWeight.w700, color: Colors.white,
        )),
      ),
    );
  }
}

class _DaySection extends StatelessWidget {
  final String day;
  final List<AvailabilitySlot> slots;
  final ValueChanged<AvailabilitySlot> onDelete;

  const _DaySection({required this.day, required this.slots, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(
        padding: const EdgeInsets.only(bottom: 8, top: 16),
        child: Text(day, style: GoogleFonts.plusJakartaSans(
          fontSize: 13, fontWeight: FontWeight.w700,
          color: AppColors.textSecondary, letterSpacing: 0.5,
        )),
      ),
      ...slots.map((s) => Container(
        margin: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(
          color: Colors.white, borderRadius: BorderRadius.circular(14),
          boxShadow: AppShadows.soft,
        ),
        child: ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          leading: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.primaryLight, borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.schedule_rounded, color: AppColors.primary, size: 20),
          ),
          title: Text(
            '${s.startTime}  –  ${s.endTime}',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary,
            ),
          ),
          trailing: IconButton(
            onPressed: () => onDelete(s),
            icon: const Icon(Icons.delete_outline_rounded, color: AppColors.danger, size: 20),
            tooltip: 'Remove slot',
          ),
        ),
      )),
    ]);
  }
}

class _EmptyState extends StatelessWidget {
  final VoidCallback onAdd;
  const _EmptyState({required this.onAdd});

  @override
  Widget build(BuildContext context) => Center(child: Padding(
    padding: const EdgeInsets.all(32),
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      Container(
        width: 72, height: 72,
        decoration: BoxDecoration(color: AppColors.primaryLight, shape: BoxShape.circle),
        child: const Icon(Icons.calendar_today_outlined, color: AppColors.primary, size: 32),
      ),
      const SizedBox(height: 20),
      Text('No availability set', style: GoogleFonts.plusJakartaSans(
        fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.textPrimary,
      )),
      const SizedBox(height: 8),
      Text(
        'Add your available time slots so patients can book consultations with you.',
        textAlign: TextAlign.center,
        style: GoogleFonts.plusJakartaSans(fontSize: 13, color: AppColors.textSecondary),
      ),
      const SizedBox(height: 24),
      AppButton(label: 'Add First Slot', onTap: onAdd, icon: Icons.add_rounded),
    ]),
  ));
}

class _AddSlotSheet extends StatefulWidget {
  const _AddSlotSheet();

  @override
  State<_AddSlotSheet> createState() => _AddSlotSheetState();
}

class _AddSlotSheetState extends State<_AddSlotSheet> {
  String _day = 'Monday';
  String _start = '08:00';
  String _end = '09:00';
  bool _loading = false;
  String? _error;

  final _times = _timeOptions();

  Future<void> _save() async {
    setState(() { _loading = true; _error = null; });
    try {
      final slot = await ApiService.addAvailabilitySlot(_day, _start, _end);
      if (mounted) Navigator.pop(context, slot);
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    return Container(
      padding: EdgeInsets.fromLTRB(24, 24, 24, bottom + 24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Text('Add Availability Slot', style: GoogleFonts.plusJakartaSans(
            fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.textPrimary,
          )),
          const Spacer(),
          IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close_rounded)),
        ]),
        const SizedBox(height: 20),

        Text('Day', style: GoogleFonts.plusJakartaSans(
          fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textSecondary, letterSpacing: 0.5,
        )),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8, runSpacing: 8,
          children: _days.map((d) {
            final sel = d == _day;
            return GestureDetector(
              onTap: () => setState(() => _day = d),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                decoration: BoxDecoration(
                  color: sel ? AppColors.primary : AppColors.surface,
                  borderRadius: BorderRadius.circular(10),
                  border: sel ? null : Border.all(color: const Color(0xFFE5E7EB)),
                ),
                child: Text(d.substring(0, 3), style: GoogleFonts.plusJakartaSans(
                  fontSize: 13, fontWeight: FontWeight.w600,
                  color: sel ? Colors.white : AppColors.textSecondary,
                )),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 20),

        Row(children: [
          Expanded(child: _TimeDropdown(
            label: 'Start time',
            value: _start,
            options: _times,
            onChanged: (v) => setState(() => _start = v),
          )),
          const SizedBox(width: 12),
          Expanded(child: _TimeDropdown(
            label: 'End time',
            value: _end,
            options: _times,
            onChanged: (v) => setState(() => _end = v),
          )),
        ]),

        if (_error != null) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: AppColors.dangerLight, borderRadius: BorderRadius.circular(10)),
            child: Row(children: [
              const Icon(Icons.error_outline, color: AppColors.danger, size: 16),
              const SizedBox(width: 8),
              Expanded(child: Text(_error!, style: GoogleFonts.plusJakartaSans(fontSize: 13, color: AppColors.danger))),
            ]),
          ),
        ],
        const SizedBox(height: 20),
        AppButton(label: 'Save Slot', onTap: _save, loading: _loading, icon: Icons.check_rounded),
      ]),
    );
  }
}

class _TimeDropdown extends StatelessWidget {
  final String label;
  final String value;
  final List<String> options;
  final ValueChanged<String> onChanged;

  const _TimeDropdown({required this.label, required this.value, required this.options, required this.onChanged});

  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text(label, style: GoogleFonts.plusJakartaSans(
      fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textSecondary, letterSpacing: 0.5,
    )),
    const SizedBox(height: 8),
    Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: AppColors.surface, borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: DropdownButtonHideUnderline(child: DropdownButton<String>(
        value: value,
        isExpanded: true,
        style: GoogleFonts.plusJakartaSans(fontSize: 14, color: AppColors.textPrimary, fontWeight: FontWeight.w600),
        onChanged: (v) { if (v != null) onChanged(v); },
        items: options.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
      )),
    ),
  ]);
}
