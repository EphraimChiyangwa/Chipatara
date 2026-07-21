import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../config/constants.dart';
import '../../models/models.dart';
import '../../services/api_service.dart';
import '../../widgets/widgets.dart';
import 'patient_history_screen.dart';

class _PatientSummary {
  final String id;
  final String name;
  final int appointmentCount;
  final DateTime lastVisit;
  final String lastStatus;

  const _PatientSummary({
    required this.id,
    required this.name,
    required this.appointmentCount,
    required this.lastVisit,
    required this.lastStatus,
  });
}

class PatientListScreen extends StatefulWidget {
  const PatientListScreen({super.key});

  @override
  State<PatientListScreen> createState() => _PatientListScreenState();
}

class _PatientListScreenState extends State<PatientListScreen> {
  List<_PatientSummary> _patients = [];
  bool _loading = true;
  String _search = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final all = await ApiService.getDoctorAppointments();
      _patients = _aggregate(all);
    } catch (_) {}
    setState(() => _loading = false);
  }

  List<_PatientSummary> _aggregate(List<Appointment> appointments) {
    final map = <String, List<Appointment>>{};
    for (final a in appointments) {
      final pid = a.patient is Map
          ? (a.patient['_id'] ?? a.patient['id'] ?? '') as String
          : a.patient?.toString() ?? '';
      if (pid.isEmpty) continue;
      (map[pid] ??= []).add(a);
    }

    final summaries = map.entries.map((e) {
      final appts = e.value..sort((a, b) {
        final da = DateTime.tryParse(a.date) ?? DateTime(2000);
        final db = DateTime.tryParse(b.date) ?? DateTime(2000);
        return db.compareTo(da);
      });
      final latest = appts.first;
      return _PatientSummary(
        id: e.key,
        name: latest.patientName,
        appointmentCount: appts.length,
        lastVisit: DateTime.tryParse(latest.date) ?? DateTime(2000),
        lastStatus: latest.status,
      );
    }).toList()
      ..sort((a, b) => b.lastVisit.compareTo(a.lastVisit));

    return summaries;
  }

  List<_PatientSummary> get _filtered => _search.isEmpty
      ? _patients
      : _patients.where((p) =>
          p.name.toLowerCase().contains(_search.toLowerCase())).toList();

  Color _statusColor(String s) => switch (s) {
    'confirmed'  => AppColors.success,
    'completed'  => AppColors.primary,
    'cancelled'  => AppColors.danger,
    _            => AppColors.warning,
  };

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered;
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(children: [
        GradientHeader(
          eyebrow: 'MY PATIENTS',
          title: 'Patient List',
          subtitle: '${_patients.length} unique patient${_patients.length == 1 ? '' : 's'}',
          onBack: () => Navigator.pop(context),
        ),
        if (!_loading && _patients.isNotEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                boxShadow: AppShadows.soft,
              ),
              child: TextField(
                onChanged: (v) => setState(() => _search = v),
                style: GoogleFonts.plusJakartaSans(fontSize: 14),
                decoration: InputDecoration(
                  hintText: 'Search patients…',
                  hintStyle: GoogleFonts.plusJakartaSans(color: AppColors.textMuted),
                  prefixIcon: const Icon(Icons.search, color: AppColors.textMuted),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
          ),
        Expanded(child: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : RefreshIndicator(
              onRefresh: _load,
              color: AppColors.primary,
              child: filtered.isEmpty
                ? ListView(children: [EmptyState(
                    icon: Icons.people_outline_rounded,
                    title: _search.isEmpty ? 'No patients yet' : 'No results',
                    description: _search.isEmpty
                        ? 'Patients will appear here after confirmed appointments'
                        : 'Try a different name',
                  )])
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                    itemCount: filtered.length,
                    itemBuilder: (_, i) {
                      final p = filtered[i];
                      return GestureDetector(
                        onTap: () => Navigator.push(context, MaterialPageRoute(
                          builder: (_) => PatientHistoryScreen(
                            patientId: p.id,
                            patientName: p.name,
                          ),
                        )),
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: AppShadows.card,
                          ),
                          child: Row(children: [
                            CircleAvatar(
                              radius: 24,
                              backgroundColor: AppColors.primaryLight,
                              child: Text(
                                p.name.isNotEmpty ? p.name[0].toUpperCase() : 'P',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 18, fontWeight: FontWeight.w800,
                                  color: AppColors.primary,
                                ),
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text(p.name, style: GoogleFonts.plusJakartaSans(
                                fontSize: 15, fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              )),
                              const SizedBox(height: 3),
                              Text(
                                '${p.appointmentCount} appointment${p.appointmentCount == 1 ? '' : 's'}  ·  Last: ${DateFormat('MMM d, y').format(p.lastVisit)}',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 12, color: AppColors.textSecondary,
                                ),
                              ),
                            ])),
                            Column(children: [
                              Container(
                                width: 10, height: 10,
                                decoration: BoxDecoration(
                                  color: _statusColor(p.lastStatus),
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(height: 4),
                              const Icon(Icons.chevron_right_rounded,
                                  color: AppColors.textMuted, size: 18),
                            ]),
                          ]),
                        ),
                      );
                    },
                  ),
            )),
      ]),
    );
  }
}
