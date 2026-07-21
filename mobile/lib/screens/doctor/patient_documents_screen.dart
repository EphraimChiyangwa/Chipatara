import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../config/constants.dart';
import '../../services/api_service.dart';
import '../../widgets/widgets.dart';

class PatientDocumentsScreen extends StatefulWidget {
  final String patientId;
  final String patientName;

  const PatientDocumentsScreen({
    super.key,
    required this.patientId,
    required this.patientName,
  });

  @override
  State<PatientDocumentsScreen> createState() => _PatientDocumentsScreenState();
}

class _PatientDocumentsScreenState extends State<PatientDocumentsScreen> {
  List<Map<String, dynamic>> _docs = [];
  bool _loading = true;

  static const _typeLabels = {
    'lab_result':   'Lab Result',
    'xray':         'X-Ray',
    'prescription': 'Prescription',
    'other':        'Other',
  };

  static const _typeIcons = {
    'lab_result':   Icons.science_outlined,
    'xray':         Icons.broken_image_outlined,
    'prescription': Icons.medication_outlined,
    'other':        Icons.insert_drive_file_outlined,
  };

  static const _typeColors = {
    'lab_result':   Color(0xFF3B5BDB),
    'xray':         Color(0xFF059669),
    'prescription': Color(0xFFD97706),
    'other':        Color(0xFF6B7280),
  };

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      _docs = await ApiService.getPatientDocuments(widget.patientId);
    } catch (_) {}
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(children: [
        GradientHeader(
          eyebrow: 'PATIENT RECORDS',
          title: '${widget.patientName.split(' ').first}\'s Documents',
          subtitle: 'Shared medical files',
          onBack: () => Navigator.pop(context),
          colors: const [Color(0xFF1E3A5F), Color(0xFF2563EB), Color(0xFF60A5FA)],
        ),
        Expanded(child: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _docs.isEmpty
            ? const EmptyState(
                icon: Icons.folder_open_outlined,
                title: 'No documents shared',
                description: 'The patient has not uploaded any documents yet',
              )
            : RefreshIndicator(
                onRefresh: _load,
                color: AppColors.primary,
                child: ListView.builder(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
                  itemCount: _docs.length,
                  itemBuilder: (_, i) {
                    final doc   = _docs[i];
                    final type  = doc['docType'] as String? ?? 'other';
                    final color = _typeColors[type] ?? AppColors.textSecondary;
                    final icon  = _typeIcons[type]  ?? Icons.insert_drive_file_outlined;
                    final label = _typeLabels[type] ?? 'Other';
                    final date  = doc['createdAt'] != null
                        ? DateFormat('MMM d, yyyy').format(DateTime.parse(doc['createdAt'] as String))
                        : '';
                    final sizeKb = doc['sizeKb'] as int?;

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: AppShadows.soft,
                      ),
                      child: ListTile(
                        contentPadding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
                        leading: Container(
                          width: 44, height: 44,
                          decoration: BoxDecoration(
                            color: color.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(icon, color: color, size: 22),
                        ),
                        title: Text(
                          doc['name'] as String? ?? 'Document',
                          style: GoogleFonts.plusJakartaSans(
                            fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.textPrimary,
                          ),
                          maxLines: 1, overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          const SizedBox(height: 2),
                          Row(children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: color.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(label, style: GoogleFonts.plusJakartaSans(
                                fontSize: 10, fontWeight: FontWeight.w700, color: color,
                              )),
                            ),
                            const SizedBox(width: 8),
                            Text(date, style: GoogleFonts.plusJakartaSans(
                              fontSize: 11, color: AppColors.textMuted,
                            )),
                            if (sizeKb != null) ...[
                              const SizedBox(width: 8),
                              Text('${sizeKb}KB', style: GoogleFonts.plusJakartaSans(
                                fontSize: 11, color: AppColors.textMuted,
                              )),
                            ],
                          ]),
                        ]),
                      ),
                    );
                  },
                ),
              ),
        ),
      ]),
    );
  }
}
