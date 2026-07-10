import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../config/constants.dart';
import '../../models/models.dart';
import '../../services/api_service.dart';
import '../../widgets/widgets.dart';
import 'booking_screen.dart';

class DoctorDetailScreen extends StatefulWidget {
  final Doctor doctor;
  const DoctorDetailScreen({super.key, required this.doctor});

  @override
  State<DoctorDetailScreen> createState() => _DoctorDetailScreenState();
}

class _DoctorDetailScreenState extends State<DoctorDetailScreen> {
  List<Map<String, dynamic>> _reviews = [];
  bool _reviewsLoading = true;

  Doctor get doctor => widget.doctor;

  @override
  void initState() {
    super.initState();
    _loadReviews();
  }

  Future<void> _loadReviews() async {
    try {
      _reviews = await ApiService.getDoctorReviews(doctor.id);
    } catch (_) {}
    if (mounted) setState(() => _reviewsLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    final p = doctor.profile;
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(children: [
        // Header
        Container(
          padding: EdgeInsets.only(
            top: MediaQuery.of(context).padding.top + 12,
            left: 20, right: 20, bottom: 28,
          ),
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [AppColors.gradientStart, Color(0xFF3B5BDB), AppColors.gradientEnd],
              begin: Alignment.topLeft, end: Alignment.bottomRight,
            ),
          ),
          child: Column(children: [
            Row(children: [
              GestureDetector(
                onTap: () => Navigator.pop(context),
                child: Container(
                  width: 38, height: 38,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 16),
                ),
              ),
              const Spacer(),
            ]),
            const SizedBox(height: 20),
            // Avatar
            Container(
              width: 80, height: 80,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.25),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.white.withValues(alpha: 0.5), width: 2),
              ),
              child: Center(child: Text(
                doctor.name.isNotEmpty ? doctor.name[0].toUpperCase() : 'D',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 32, fontWeight: FontWeight.w800, color: Colors.white,
                ),
              )),
            ),
            const SizedBox(height: 14),
            Text(doctor.name, style: GoogleFonts.plusJakartaSans(
              fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white,
            )),
            if (p != null) ...[
              const SizedBox(height: 4),
              Text(p.specialization, style: GoogleFonts.plusJakartaSans(
                fontSize: 14, color: Colors.white.withValues(alpha: 0.85),
                fontWeight: FontWeight.w500,
              )),
            ],
            const SizedBox(height: 12),
            // Rating row
            if (doctor.averageRating > 0) Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ...List.generate(5, (i) => Icon(
                  i < doctor.averageRating.floor()
                      ? Icons.star_rounded
                      : i < doctor.averageRating
                          ? Icons.star_half_rounded
                          : Icons.star_outline_rounded,
                  color: const Color(0xFFFBBF24), size: 18,
                )),
                const SizedBox(width: 6),
                Text(
                  '${doctor.averageRating.toStringAsFixed(1)}'
                  '${doctor.totalRatings > 0 ? ' (${doctor.totalRatings} reviews)' : ''}',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 13, color: Colors.white.withValues(alpha: 0.9),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ]),
        ),

        // Scrollable content
        Expanded(child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
          children: [
            if (p != null) ...[
              // Quick stat chips
              Row(children: [
                _StatChip(icon: Icons.local_hospital_outlined, label: p.hospital),
                const SizedBox(width: 10),
                if (p.yearsOfExperience > 0)
                  _StatChip(
                    icon: Icons.workspace_premium_outlined,
                    label: '${p.yearsOfExperience} yrs exp',
                  ),
              ]),
              const SizedBox(height: 10),
              Row(children: [
                _StatChip(
                  icon: Icons.payments_outlined,
                  label: p.consultationFee == 0
                      ? 'Free consultation'
                      : 'ZWL ${p.consultationFee.toStringAsFixed(0)}',
                  highlight: true,
                ),
                if (p.licenseNumber.isNotEmpty) ...[
                  const SizedBox(width: 10),
                  _StatChip(icon: Icons.verified_outlined, label: 'Lic: ${p.licenseNumber}'),
                ],
              ]),
              const SizedBox(height: 24),

              // Bio
              if (p.bio != null && p.bio!.isNotEmpty) ...[
                _SectionLabel('About'),
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white, borderRadius: BorderRadius.circular(16),
                    boxShadow: AppShadows.card,
                  ),
                  child: Text(p.bio!, style: GoogleFonts.plusJakartaSans(
                    fontSize: 14, color: AppColors.textSecondary, height: 1.6,
                  )),
                ),
                const SizedBox(height: 24),
              ],

              // Details card
              _SectionLabel('Details'),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white, borderRadius: BorderRadius.circular(16),
                  boxShadow: AppShadows.card,
                ),
                child: Column(children: [
                  _InfoRow(Icons.local_hospital_outlined, 'Hospital', p.hospital),
                  _Divider(),
                  _InfoRow(Icons.psychology_outlined, 'Specialization', p.specialization),
                  if (p.yearsOfExperience > 0) ...[
                    _Divider(),
                    _InfoRow(Icons.workspace_premium_outlined, 'Experience',
                        '${p.yearsOfExperience} years'),
                  ],
                  if (p.licenseNumber.isNotEmpty) ...[
                    _Divider(),
                    _InfoRow(Icons.badge_outlined, 'License', p.licenseNumber),
                  ],
                  _Divider(),
                  _InfoRow(
                    Icons.payments_outlined, 'Consultation Fee',
                    p.consultationFee == 0 ? 'Free' : 'ZWL ${p.consultationFee.toStringAsFixed(0)}',
                  ),
                ]),
              ),
              const SizedBox(height: 24),
            ],

            // Reviews section
            if (_reviewsLoading)
              const Center(child: Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(color: AppColors.primary, strokeWidth: 2),
              ))
            else if (_reviews.isNotEmpty) ...[
              Row(children: [
                _SectionLabel('Patient Reviews'),
                const Spacer(),
                Text('${_reviews.length} total', style: GoogleFonts.plusJakartaSans(
                  fontSize: 12, color: AppColors.textMuted,
                )),
              ]),
              const SizedBox(height: 10),
              ..._reviews.take(5).map((r) => _ReviewCard(review: r)),
              if (_reviews.length > 5) ...[
                const SizedBox(height: 4),
                Center(child: Text(
                  '+${_reviews.length - 5} more reviews',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 12, color: AppColors.textMuted,
                  ),
                )),
              ],
              const SizedBox(height: 24),
            ],

            // Book button
            AppButton(
              label: 'Book Appointment',
              icon: Icons.calendar_today_rounded,
              onTap: () => Navigator.push(context, MaterialPageRoute(
                builder: (_) => BookingScreen(doctor: doctor),
              )),
            ),
          ],
        )),
      ]),
    );
  }
}

// ── Review card ───────────────────────────────────────────────────────────────
class _ReviewCard extends StatelessWidget {
  final Map<String, dynamic> review;
  const _ReviewCard({required this.review});

  @override
  Widget build(BuildContext context) {
    final rating = (review['rating'] as num?)?.toInt() ?? 0;
    final text = review['review'] as String? ?? '';
    final name = review['patientName'] as String? ?? 'Patient';
    final dateStr = review['date'] as String?;
    final date = dateStr != null ? DateTime.tryParse(dateStr) : null;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(16),
        boxShadow: AppShadows.soft,
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(
              color: AppColors.primaryLight, borderRadius: BorderRadius.circular(10),
            ),
            child: Center(child: Text(
              name.isNotEmpty ? name[0].toUpperCase() : 'P',
              style: GoogleFonts.plusJakartaSans(
                fontWeight: FontWeight.w800, color: AppColors.primary, fontSize: 14,
              ),
            )),
          ),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(name, style: GoogleFonts.plusJakartaSans(
              fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary,
            )),
            if (date != null)
              Text(DateFormat('MMM d, y').format(date), style: GoogleFonts.plusJakartaSans(
                fontSize: 11, color: AppColors.textMuted,
              )),
          ])),
          Row(mainAxisSize: MainAxisSize.min, children: List.generate(5, (i) => Icon(
            i < rating ? Icons.star_rounded : Icons.star_outline_rounded,
            size: 14, color: const Color(0xFFF59E0B),
          ))),
        ]),
        if (text.isNotEmpty) ...[
          const SizedBox(height: 10),
          Text(text, style: GoogleFonts.plusJakartaSans(
            fontSize: 13, color: AppColors.textSecondary, height: 1.5,
          )),
        ],
      ]),
    );
  }
}

// ── Local helpers ─────────────────────────────────────────────────────────────
class _StatChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool highlight;
  const _StatChip({required this.icon, required this.label, this.highlight = false});

  @override
  Widget build(BuildContext context) => Expanded(child: Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
    decoration: BoxDecoration(
      color: highlight ? AppColors.primaryLight : Colors.white,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(
        color: highlight ? AppColors.primary.withValues(alpha: 0.3) : const Color(0xFFE5E7EB),
      ),
      boxShadow: AppShadows.soft,
    ),
    child: Row(children: [
      Icon(icon, size: 15, color: highlight ? AppColors.primary : AppColors.textSecondary),
      const SizedBox(width: 6),
      Expanded(child: Text(label, style: GoogleFonts.plusJakartaSans(
        fontSize: 12, fontWeight: FontWeight.w600,
        color: highlight ? AppColors.primary : AppColors.textSecondary,
      ), maxLines: 1, overflow: TextOverflow.ellipsis)),
    ]),
  ));
}

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);
  @override
  Widget build(BuildContext context) => Text(text, style: GoogleFonts.plusJakartaSans(
    fontSize: 11, fontWeight: FontWeight.w700,
    color: AppColors.textMuted, letterSpacing: 1.2,
  ));
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoRow(this.icon, this.label, this.value);

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 10),
    child: Row(children: [
      Icon(icon, size: 16, color: AppColors.primary),
      const SizedBox(width: 12),
      Text(label, style: GoogleFonts.plusJakartaSans(
        fontSize: 13, color: AppColors.textSecondary, fontWeight: FontWeight.w500,
      )),
      const Spacer(),
      Text(value, style: GoogleFonts.plusJakartaSans(
        fontSize: 13, color: AppColors.textPrimary, fontWeight: FontWeight.w700,
      )),
    ]),
  );
}

class _Divider extends StatelessWidget {
  @override
  Widget build(BuildContext context) => const Divider(height: 1, color: Color(0xFFF3F4F6));
}
