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
import '../patient/video_call_screen.dart';
import 'patient_documents_screen.dart';
import 'patient_health_data_screen.dart';
import 'patient_history_screen.dart';
import 'patient_journal_screen.dart';
import 'patient_list_screen.dart';

class DoctorHomeTab extends StatefulWidget {
  const DoctorHomeTab({super.key});

  @override
  State<DoctorHomeTab> createState() => _DoctorHomeTabState();
}

class _DoctorHomeTabState extends State<DoctorHomeTab> {
  List<Appointment> _appointments = [];
  bool _loading  = true;
  bool _isOnline = true;
  String _filter = 'pending';

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        ApiService.getDoctorAppointments(),
        ApiService.getMyDoctorProfile(),
      ]);
      _appointments = results[0] as List<Appointment>;
      final profile = results[1] as DoctorProfile?;
      if (profile != null) _isOnline = profile.isOnline;
    } catch (_) {}
    setState(() => _loading = false);
  }

  Future<void> _toggleOnline() async {
    final prev = _isOnline;
    setState(() => _isOnline = !_isOnline);
    try {
      await ApiService.toggleDoctorOnline();
    } catch (_) {
      setState(() => _isOnline = prev);
    }
  }

  List<Appointment> get _filtered => _appointments.where((a) => a.status == _filter).toList();

  Future<void> _updateStatus(Appointment appt, String status) async {
    try {
      await ApiService.updateAppointmentStatus(appt.id, status);
      _load();
    } catch (e) {
      if (!mounted) return;
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
                fontSize: 13, color: Colors.white.withValues(alpha: 0.7),
              )),
              Text('Dr. ${user?.name.split(' ').last ?? ''}', style: GoogleFonts.plusJakartaSans(
                fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white,
              )),
            ]),
            GestureDetector(
              onTap: _toggleOnline,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                ),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Container(
                    width: 7, height: 7,
                    decoration: BoxDecoration(
                      color: _isOnline ? const Color(0xFF22C55E) : const Color(0xFF94A3B8),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    _isOnline ? 'Online' : 'Offline',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white,
                    ),
                  ),
                ]),
              ),
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
          const SizedBox(height: 12),
          GestureDetector(
            onTap: () => Navigator.push(context, MaterialPageRoute(
              builder: (_) => const PatientListScreen(),
            )),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.18),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
              ),
              child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                const Icon(Icons.people_outline_rounded, color: Colors.white, size: 16),
                const SizedBox(width: 8),
                Text('View All Patients', style: GoogleFonts.plusJakartaSans(
                  fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white,
                )),
                const Spacer(),
                const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white70, size: 12),
              ]),
            ),
          ),
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
                  title: 'No $_filter appointments',
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
                    onPrescribe: () => showModalBottomSheet(
                      context: context,
                      isScrollControlled: true,
                      backgroundColor: Colors.transparent,
                      builder: (_) => _PrescribeSheet(appointment: _filtered[i]),
                    ),
                    onNotes: () => showModalBottomSheet(
                      context: context,
                      isScrollControlled: true,
                      backgroundColor: Colors.transparent,
                      builder: (_) => _NotesSheet(appointment: _filtered[i]),
                    ),
                    onViewDocs: () {
                      final patId = _filtered[i].patient is Map
                          ? (_filtered[i].patient['_id'] ?? _filtered[i].patient['id'] ?? '')
                          : '';
                      Navigator.push(context, MaterialPageRoute(
                        builder: (_) => PatientDocumentsScreen(
                          patientId: patId,
                          patientName: _filtered[i].patientName,
                        ),
                      ));
                    },
                    onHistory: () {
                      final patId = _filtered[i].patient is Map
                          ? (_filtered[i].patient['_id'] ?? _filtered[i].patient['id'] ?? '')
                          : '';
                      Navigator.push(context, MaterialPageRoute(
                        builder: (_) => PatientHistoryScreen(
                          patientId: patId,
                          patientName: _filtered[i].patientName,
                        ),
                      ));
                    },
                    onJournal: () {
                      final patId = _filtered[i].patient is Map
                          ? (_filtered[i].patient['_id'] ?? _filtered[i].patient['id'] ?? '')
                          : '';
                      Navigator.push(context, MaterialPageRoute(
                        builder: (_) => PatientJournalScreen(
                          patientId: patId,
                          patientName: _filtered[i].patientName,
                        ),
                      ));
                    },
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
  final VoidCallback onConfirm, onComplete, onCancel, onChat, onPrescribe, onNotes, onViewDocs, onHistory, onJournal;

  const _ApptCard({
    required this.appt,
    required this.onConfirm, required this.onComplete,
    required this.onCancel,  required this.onChat,
    required this.onPrescribe, required this.onNotes,
    required this.onViewDocs, required this.onHistory,
    required this.onJournal,
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
        // Primary actions row
        Row(children: [
          if (appt.status == 'pending') ...[
            Expanded(child: _ActionBtn(label: 'Confirm', color: AppColors.success, onTap: onConfirm)),
            const SizedBox(width: 8),
            Expanded(child: _ActionBtn(label: 'Decline', color: AppColors.danger, onTap: onCancel, outlined: true)),
          ] else if (appt.status == 'confirmed') ...[
            Expanded(child: _ActionBtn(
              label: 'Join Video', color: AppColors.success, icon: Icons.videocam_outlined,
              onTap: () => Navigator.push(context, MaterialPageRoute(
                builder: (_) => VideoCallScreen(appointment: appt),
              )),
            )),
            const SizedBox(width: 8),
            Expanded(child: _ActionBtn(label: 'Chat', color: AppColors.primary, icon: Icons.chat_bubble_outline, onTap: onChat)),
            const SizedBox(width: 8),
            Expanded(child: _ActionBtn(label: 'Complete', color: AppColors.textSecondary, onTap: onComplete, outlined: true)),
          ] else if (appt.status == 'completed') ...[
            Expanded(child: _ActionBtn(label: 'Prescribe', color: AppColors.primary, icon: Icons.medication_outlined, onTap: onPrescribe)),
            const SizedBox(width: 8),
            Expanded(child: _ActionBtn(label: 'Notes', color: const Color(0xFF7C3AED), icon: Icons.notes_rounded, onTap: onNotes)),
          ],
        ]),
        // Secondary actions (health data + documents) for active appointments
        if (appt.status == 'confirmed' || appt.status == 'completed') ...[
          const SizedBox(height: 8),
          Row(children: [
            Expanded(child: _ActionBtn(
              label: 'Health Data', color: const Color(0xFF0891B2),
              icon: Icons.monitor_heart_outlined,
              onTap: () {
                final patientId = appt.patient is Map
                    ? (appt.patient['_id'] ?? appt.patient['id'] ?? '')
                    : '';
                Navigator.push(context, MaterialPageRoute(
                  builder: (_) => PatientHealthDataScreen(patientId: patientId, patientName: appt.patientName),
                ));
              },
            )),
            const SizedBox(width: 8),
            Expanded(child: _ActionBtn(
              label: 'Documents', color: const Color(0xFF059669),
              icon: Icons.folder_outlined,
              onTap: onViewDocs,
            )),
          ]),
          const SizedBox(height: 8),
          Row(children: [
            Expanded(child: _ActionBtn(
              label: 'History', color: const Color(0xFF7C3AED),
              icon: Icons.history_rounded,
              onTap: onHistory,
            )),
            const SizedBox(width: 8),
            Expanded(child: _ActionBtn(
              label: 'Journal', color: const Color(0xFF059669),
              icon: Icons.edit_note_rounded,
              onTap: onJournal,
            )),
          ]),
        ],
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

// ── Consultation notes sheet ───────────────────────────────────────────────

class _NotesSheet extends StatefulWidget {
  final Appointment appointment;
  const _NotesSheet({required this.appointment});

  @override
  State<_NotesSheet> createState() => _NotesSheetState();
}

class _NotesSheetState extends State<_NotesSheet> {
  final _ctrl    = TextEditingController();
  bool _loading  = false;
  String? _msg;

  @override
  void initState() {
    super.initState();
    _ctrl.text = widget.appointment.notes ?? '';
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  Future<void> _save() async {
    setState(() { _loading = true; _msg = null; });
    try {
      await ApiService.saveConsultationNotes(widget.appointment.id, _ctrl.text.trim());
      setState(() => _msg = 'Notes saved.');
    } catch (e) {
      setState(() => _msg = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    return Container(
      padding: EdgeInsets.fromLTRB(20, 20, 20, bottom + 20),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Text('Consultation Notes', style: GoogleFonts.plusJakartaSans(
            fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.textPrimary,
          )),
          const Spacer(),
          IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close_rounded)),
        ]),
        Text('Patient: ${widget.appointment.patientName}', style: GoogleFonts.plusJakartaSans(
          fontSize: 13, color: AppColors.textSecondary,
        )),
        const SizedBox(height: 16),
        AppInput(
          label: 'Notes',
          hint: 'Observations, diagnosis, follow-up instructions…',
          controller: _ctrl,
          maxLines: 5,
        ),
        if (_msg != null) ...[
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: _msg!.contains('saved') ? AppColors.successLight : AppColors.dangerLight,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(_msg!, style: GoogleFonts.plusJakartaSans(
              fontSize: 12,
              color: _msg!.contains('saved') ? AppColors.success : AppColors.danger,
            )),
          ),
        ],
        const SizedBox(height: 16),
        AppButton(label: 'Save Notes', onTap: _save, loading: _loading, icon: Icons.save_outlined),
      ]),
    );
  }
}

// ── Prescription sheet ─────────────────────────────────────────────────────

const _frequencies = ['Once daily', 'Twice daily', 'Three times daily', 'Every 8 hours', 'Every 12 hours', 'As needed', 'Weekly'];

class _PrescribeSheet extends StatefulWidget {
  final Appointment appointment;
  const _PrescribeSheet({required this.appointment});

  @override
  State<_PrescribeSheet> createState() => _PrescribeSheetState();
}

class _PrescribeSheetState extends State<_PrescribeSheet> {
  final _notes = TextEditingController();
  final List<_MedEntry> _meds = [];
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _meds.add(_MedEntry());
    _loadExisting();
  }

  Future<void> _loadExisting() async {
    final rx = await ApiService.getPrescription(widget.appointment.id);
    if (rx == null || !mounted) return;
    setState(() {
      _notes.text = rx.notes;
      _meds.clear();
      for (final m in rx.medications) {
        _meds.add(_MedEntry()
          ..name.text    = m.name
          ..dosage.text  = m.dosage
          ..freq         = m.frequency
          ..duration.text = m.duration
          ..instructions.text = m.instructions);
      }
      if (_meds.isEmpty) _meds.add(_MedEntry());
    });
  }

  Future<void> _save() async {
    for (final m in _meds) {
      if (m.name.text.trim().isEmpty || m.dosage.text.trim().isEmpty || m.duration.text.trim().isEmpty) {
        setState(() => _error = 'Please fill in name, dosage, and duration for every medication.');
        return;
      }
    }
    setState(() { _loading = true; _error = null; });
    try {
      await ApiService.savePrescription(
        widget.appointment.id,
        _meds.map((m) => {
          'name': m.name.text.trim(),
          'dosage': m.dosage.text.trim(),
          'frequency': m.freq,
          'duration': m.duration.text.trim(),
          'instructions': m.instructions.text.trim(),
        }).toList(),
        _notes.text.trim(),
      );
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Prescription saved'), backgroundColor: AppColors.success),
        );
      }
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
      padding: EdgeInsets.fromLTRB(20, 20, 20, bottom + 20),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Text('Write Prescription', style: GoogleFonts.plusJakartaSans(
            fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.textPrimary,
          )),
          const Spacer(),
          IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close_rounded)),
        ]),
        Text('Patient: ${widget.appointment.patientName}', style: GoogleFonts.plusJakartaSans(
          fontSize: 13, color: AppColors.textSecondary,
        )),
        const SizedBox(height: 16),
        Flexible(child: SingleChildScrollView(child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ..._meds.asMap().entries.map((e) => _MedRow(
              entry: e.value,
              index: e.key,
              canRemove: _meds.length > 1,
              onRemove: () => setState(() => _meds.removeAt(e.key)),
              onChanged: () => setState(() {}),
            )),
            TextButton.icon(
              onPressed: () => setState(() => _meds.add(_MedEntry())),
              icon: const Icon(Icons.add_rounded, size: 16),
              label: Text('Add medication', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w600)),
            ),
            const SizedBox(height: 8),
            AppInput(label: 'Notes (optional)', hint: 'Additional instructions…', controller: _notes, maxLines: 2),
            if (_error != null) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: AppColors.dangerLight, borderRadius: BorderRadius.circular(10)),
                child: Text(_error!, style: GoogleFonts.plusJakartaSans(fontSize: 12, color: AppColors.danger)),
              ),
            ],
            const SizedBox(height: 16),
            AppButton(label: 'Save Prescription', onTap: _save, loading: _loading, icon: Icons.save_outlined),
          ],
        ))),
      ]),
    );
  }
}

class _MedEntry {
  final name         = TextEditingController();
  final dosage       = TextEditingController();
  final duration     = TextEditingController();
  final instructions = TextEditingController();
  String freq        = _frequencies.first;
}

class _MedRow extends StatelessWidget {
  final _MedEntry entry;
  final int index;
  final bool canRemove;
  final VoidCallback onRemove, onChanged;

  const _MedRow({required this.entry, required this.index, required this.canRemove, required this.onRemove, required this.onChanged});

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 12),
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: AppColors.surface, borderRadius: BorderRadius.circular(14),
      border: Border.all(color: const Color(0xFFE5E7EB)),
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Text('Medication ${index + 1}', style: GoogleFonts.plusJakartaSans(
          fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textSecondary,
        )),
        const Spacer(),
        if (canRemove) IconButton(
          onPressed: onRemove, icon: const Icon(Icons.remove_circle_outline, color: AppColors.danger, size: 18),
          padding: EdgeInsets.zero, constraints: const BoxConstraints(),
        ),
      ]),
      const SizedBox(height: 8),
      AppInput(label: 'Name', hint: 'e.g. Amoxicillin', controller: entry.name),
      const SizedBox(height: 8),
      Row(children: [
        Expanded(child: AppInput(label: 'Dosage', hint: 'e.g. 500mg', controller: entry.dosage)),
        const SizedBox(width: 8),
        Expanded(child: AppInput(label: 'Duration', hint: 'e.g. 7 days', controller: entry.duration)),
      ]),
      const SizedBox(height: 8),
      Text('Frequency', style: GoogleFonts.plusJakartaSans(
        fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textSecondary,
      )),
      const SizedBox(height: 4),
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: Colors.white, borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFFE5E7EB)),
        ),
        child: DropdownButtonHideUnderline(child: DropdownButton<String>(
          value: entry.freq,
          isExpanded: true,
          style: GoogleFonts.plusJakartaSans(fontSize: 13, color: AppColors.textPrimary),
          onChanged: (v) { if (v != null) { entry.freq = v; onChanged(); } },
          items: _frequencies.map((f) => DropdownMenuItem(value: f, child: Text(f))).toList(),
        )),
      ),
    ]),
  );
}
