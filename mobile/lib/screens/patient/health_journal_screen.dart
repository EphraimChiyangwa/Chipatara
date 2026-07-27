import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../config/constants.dart';
import '../../services/api_service.dart';
import '../../widgets/widgets.dart';

const _kTags = ['Headache', 'Fever', 'Fatigue', 'Nausea', 'Chest pain', 'Dizziness', 'Cough', 'Shortness of breath'];

class HealthJournalScreen extends StatefulWidget {
  const HealthJournalScreen({super.key});

  @override
  State<HealthJournalScreen> createState() => _HealthJournalScreenState();
}

class _HealthJournalScreenState extends State<HealthJournalScreen> {
  List<Map<String, dynamic>> _entries = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try { _entries = await ApiService.getMyJournal(); } catch (_) { /* offline */ }
    setState(() => _loading = false);
  }

  Future<void> _delete(String id) async {
    try {
      await ApiService.deleteJournalEntry(id);
      setState(() => _entries.removeWhere((e) => e['_id'] == id));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(e.toString().replaceAll('Exception: ', '')),
        backgroundColor: AppColors.danger,
      ));
    }
  }

  void _showAddSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AddEntrySheet(onSaved: (entry) {
        setState(() => _entries.insert(0, entry));
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(children: [
        GradientHeader(
          eyebrow: 'MY HEALTH',
          title: 'Symptom Journal',
          subtitle: 'Log how you feel each day',
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
                    title: 'No entries yet',
                    description: 'Tap + to log how you\'re feeling today',
                  )])
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                    itemCount: _entries.length,
                    itemBuilder: (_, i) => _JournalCard(
                      entry: _entries[i],
                      onDelete: () => _delete(_entries[i]['_id'] as String),
                    ),
                  ),
            )),
      ]),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddSheet,
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add_rounded, color: Colors.white),
        label: Text('Add Entry', style: GoogleFonts.plusJakartaSans(
          fontWeight: FontWeight.w700, color: Colors.white,
        )),
      ),
    );
  }
}

class _JournalCard extends StatelessWidget {
  final Map<String, dynamic> entry;
  final VoidCallback onDelete;
  const _JournalCard({required this.entry, required this.onDelete});

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
              color: AppColors.primaryLight, borderRadius: BorderRadius.circular(8),
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
          const Spacer(),
          GestureDetector(
            onTap: onDelete,
            child: const Icon(Icons.delete_outline_rounded, size: 18, color: AppColors.danger),
          ),
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

class _AddEntrySheet extends StatefulWidget {
  final ValueChanged<Map<String, dynamic>> onSaved;
  const _AddEntrySheet({required this.onSaved});

  @override
  State<_AddEntrySheet> createState() => _AddEntrySheetState();
}

class _AddEntrySheetState extends State<_AddEntrySheet> {
  final _ctrl    = TextEditingController();
  final _selected = <String>{};
  bool _loading  = false;
  String? _error;

  Future<void> _save() async {
    if (_ctrl.text.trim().isEmpty) {
      setState(() => _error = 'Please describe how you\'re feeling.');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final entry = await ApiService.addJournalEntry(_ctrl.text.trim(), _selected.toList());
      widget.onSaved(entry);
      if (mounted) Navigator.pop(context);
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
      child: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Text('How are you feeling?', style: GoogleFonts.plusJakartaSans(
              fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.textPrimary,
            )),
            const Spacer(),
            IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close_rounded)),
          ]),
          const SizedBox(height: 4),
          Text(DateFormat('EEEE, MMMM d').format(DateTime.now()),
            style: GoogleFonts.plusJakartaSans(fontSize: 12, color: AppColors.textMuted)),
          const SizedBox(height: 16),
          AppInput(
            label: 'Journal entry',
            hint: 'Describe your symptoms, mood, or anything notable…',
            controller: _ctrl,
            maxLines: 4,
          ),
          const SizedBox(height: 16),
          Text('Symptoms (optional)', style: GoogleFonts.plusJakartaSans(
            fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textSecondary,
          )),
          const SizedBox(height: 8),
          Wrap(spacing: 8, runSpacing: 8, children: _kTags.map((tag) {
            final sel = _selected.contains(tag);
            return GestureDetector(
              onTap: () => setState(() => sel ? _selected.remove(tag) : _selected.add(tag)),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: sel ? AppColors.primary : AppColors.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: sel ? AppColors.primary : const Color(0xFFE5E7EB)),
                ),
                child: Text(tag, style: GoogleFonts.plusJakartaSans(
                  fontSize: 12, fontWeight: FontWeight.w600,
                  color: sel ? Colors.white : AppColors.textSecondary,
                )),
              ),
            );
          }).toList()),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: GoogleFonts.plusJakartaSans(fontSize: 12, color: AppColors.danger)),
          ],
          const SizedBox(height: 20),
          AppButton(label: 'Save Entry', onTap: _save, loading: _loading, icon: Icons.check_rounded),
        ]),
      ),
    );
  }
}
