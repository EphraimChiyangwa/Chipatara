import 'dart:convert';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../config/constants.dart';
import '../../services/api_service.dart';
import '../../widgets/widgets.dart';

class MedicalDocumentsScreen extends StatefulWidget {
  const MedicalDocumentsScreen({super.key});

  @override
  State<MedicalDocumentsScreen> createState() => _MedicalDocumentsScreenState();
}

class _MedicalDocumentsScreenState extends State<MedicalDocumentsScreen> {
  List<Map<String, dynamic>> _docs = [];
  bool _loading = true;
  bool _uploading = false;

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
      _docs = await ApiService.getMyDocuments();
    } catch (_) {}
    setState(() => _loading = false);
  }

  Future<void> _upload() async {
    // Pick file
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
      withData: true,
    );
    if (result == null || result.files.isEmpty) return;

    final file = result.files.first;
    if (file.bytes == null) return;

    // Choose document type
    String? docType;
    if (mounted) {
      docType = await showModalBottomSheet<String>(
        context: context,
        backgroundColor: Colors.transparent,
        builder: (_) => const _DocTypeSheet(),
      );
    }
    if (docType == null) return;

    setState(() => _uploading = true);
    try {
      final base64Data = base64Encode(file.bytes!);
      final mimeType = file.extension == 'pdf'
          ? 'application/pdf'
          : 'image/${file.extension}';

      await ApiService.uploadDocument(
        name: file.name,
        docType: docType,
        mimeType: mimeType,
        sizeKb: (file.size / 1024).round(),
        base64Data: base64Data,
      );
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Document uploaded successfully'), backgroundColor: Color(0xFF059669)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceAll('Exception: ', '')), backgroundColor: AppColors.danger),
        );
      }
    } finally {
      setState(() => _uploading = false);
    }
  }

  Future<void> _delete(String id, String name) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Delete Document', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700)),
        content: Text('Remove "$name"? This cannot be undone.', style: GoogleFonts.plusJakartaSans()),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text('Delete', style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await ApiService.deleteDocument(id);
      _load();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(children: [
        GradientHeader(
          eyebrow: 'HEALTH RECORDS',
          title: 'My Documents',
          subtitle: 'Lab results, X-rays & prescriptions',
          onBack: () => Navigator.pop(context),
          colors: const [Color(0xFF1E3A5F), Color(0xFF2563EB), Color(0xFF60A5FA)],
          trailing: _uploading
              ? const SizedBox(width: 20, height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : GestureDetector(
                  onTap: _upload,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                    ),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.upload_rounded, color: Colors.white, size: 14),
                      const SizedBox(width: 4),
                      Text('Upload', style: GoogleFonts.plusJakartaSans(
                        fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white,
                      )),
                    ]),
                  ),
                ),
        ),
        Expanded(child: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _docs.isEmpty
            ? EmptyState(
                icon: Icons.folder_open_outlined,
                title: 'No documents yet',
                description: 'Upload your lab results, X-rays, or prescriptions so your doctor can view them',
                buttonLabel: 'Upload Document',
                onButton: _upload,
              )
            : RefreshIndicator(
                onRefresh: _load,
                color: AppColors.primary,
                child: ListView.builder(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 100),
                  itemCount: _docs.length,
                  itemBuilder: (_, i) {
                    final doc = _docs[i];
                    final type = doc['docType'] as String? ?? 'other';
                    final color  = _typeColors[type] ?? AppColors.textSecondary;
                    final icon   = _typeIcons[type]  ?? Icons.insert_drive_file_outlined;
                    final label  = _typeLabels[type] ?? 'Other';
                    final date   = doc['createdAt'] != null
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
                        contentPadding: const EdgeInsets.fromLTRB(16, 10, 8, 10),
                        leading: Container(
                          width: 44, height: 44,
                          decoration: BoxDecoration(
                            color: color.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(icon, color: color, size: 22),
                        ),
                        title: Text(doc['name'] as String? ?? 'Document',
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
                        trailing: IconButton(
                          icon: const Icon(Icons.delete_outline_rounded, color: AppColors.danger, size: 20),
                          onPressed: () => _delete(doc['_id'] as String, doc['name'] as String? ?? 'Document'),
                        ),
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

// ── Document type selector sheet ───────────────────────────────────────────────
class _DocTypeSheet extends StatelessWidget {
  const _DocTypeSheet();

  @override
  Widget build(BuildContext context) {
    final types = [
      ('lab_result',   'Lab Result',   Icons.science_outlined,         const Color(0xFF3B5BDB)),
      ('xray',         'X-Ray / Scan', Icons.broken_image_outlined,    const Color(0xFF059669)),
      ('prescription', 'Prescription', Icons.medication_outlined,      const Color(0xFFD97706)),
      ('other',        'Other',        Icons.insert_drive_file_outlined, const Color(0xFF6B7280)),
    ];

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 40, height: 4,
          decoration: BoxDecoration(color: const Color(0xFFE5E7EB), borderRadius: BorderRadius.circular(2))),
        const SizedBox(height: 16),
        Text('Document Type', style: GoogleFonts.plusJakartaSans(
          fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.textPrimary,
        )),
        const SizedBox(height: 4),
        Text('What kind of document is this?', style: GoogleFonts.plusJakartaSans(
          fontSize: 13, color: AppColors.textSecondary,
        )),
        const SizedBox(height: 20),
        ...types.map((t) => ListTile(
          onTap: () => Navigator.pop(context, t.$1),
          leading: Container(
            width: 40, height: 40,
            decoration: BoxDecoration(
              color: t.$4.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(t.$3, color: t.$4, size: 20),
          ),
          title: Text(t.$2, style: GoogleFonts.plusJakartaSans(
            fontWeight: FontWeight.w600, fontSize: 14,
          )),
          trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        )),
      ]),
    );
  }
}
