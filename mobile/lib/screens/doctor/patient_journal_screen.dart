import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../config/constants.dart';
import '../../services/api_service.dart';
import '../../widgets/widgets.dart';

class PatientJournalScreen extends StatefulWidget {
  final String patientId;
  final String patientName;

  const PatientJournalScreen({
    super.key,
    required this.patientId,
    required this.patientName,
  });

  @override
  State<PatientJournalScreen> createState() => _PatientJournalScreenState();
}

class _PatientJournalScreenState extends State<PatientJournalScreen> {
  List<Map<String, dynamic>> _entries = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      _entries = await ApiService.getPatientJournal(widget.patientId);
    } catch (_) {}
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(children: [
        GradientHeader(
          eyebrow: 'PATIENT JOURNAL',
          title: widget.patientName,
          subtitle: '${_entries.length} entr${_entries.length == 1 ? 'y' : 'ies'}',
          onBack: () => Navigator.pop(context),
        ),
        Expanded(child: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : RefreshIndicator(
              onRefresh: _load,
              color: AppColors.primary,
              child: _entries.isEmpty
                ? ListView(children: [const EmptyState(
                    icon: Icons.edit_note_rounded,
                    title: 'No journal entries',
                    description: 'This patient has not logged any symptoms yet',
                  )])
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _entries.length,
                    itemBuilder: (_, i) => _EntryCard(entry: _entries[i]),
                  ),
            )),
      ]),
    );
  }
}

class _EntryCard extends StatelessWidget {
  final Map<String, dynamic> entry;
  const _EntryCard({required this.entry});

  @override
  Widget build(BuildContext context) {
    final created = DateTime.tryParse(entry['createdAt']?.toString() ?? '');
    final tags = (entry['tags'] as List?)?.cast<String>() ?? [];

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: AppShadows.card,
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              created != null ? DateFormat('MMM d, y').format(created) : '',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primary,
              ),
            ),
          ),
          if (created != null) ...[
            const SizedBox(width: 8),
            Text(DateFormat('h:mm a').format(created), style: GoogleFonts.plusJakartaSans(
              fontSize: 11, color: AppColors.textMuted,
            )),
          ],
        ]),
        const SizedBox(height: 10),
        Text(entry['entry']?.toString() ?? '', style: GoogleFonts.plusJakartaSans(
          fontSize: 14, color: AppColors.textPrimary, height: 1.5,
        )),
        if (tags.isNotEmpty) ...[
          const SizedBox(height: 10),
          Wrap(spacing: 6, runSpacing: 6, children: tags.map((t) => Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFF3F4F6),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(t, style: GoogleFonts.plusJakartaSans(
              fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textSecondary,
            )),
          )).toList()),
        ],
      ]),
    );
  }
}
