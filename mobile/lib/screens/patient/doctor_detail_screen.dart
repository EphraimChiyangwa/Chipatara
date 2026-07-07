import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/constants.dart';
import '../../models/models.dart';
import '../../widgets/widgets.dart';
import 'booking_screen.dart';

class DoctorDetailScreen extends StatelessWidget {
  final Doctor doctor;
  const DoctorDetailScreen({super.key, required this.doctor});

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
                    color: Colors.white.withValues(alpha:0.2),
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
                color: Colors.white.withValues(alpha:0.25),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.white.withValues(alpha:0.5), width: 2),
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
                fontSize: 14, color: Colors.white.withValues(alpha:0.85), fontWeight: FontWeight.w500,
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
                  color: const Color(0xFFFBBF24),
                  size: 18,
                )),
                const SizedBox(width: 6),
                Text(
                  '${doctor.averageRating.toStringAsFixed(1)}${doctor.totalRatings > 0 ? ' (${doctor.totalRatings} reviews)' : ''}',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 13, color: Colors.white.withValues(alpha:0.9), fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ]),
        ),

        // Content
        Expanded(child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            if (p != null) ...[
              // Quick stats
              Row(children: [
                _StatChip(icon: Icons.local_hospital_outlined, label: p.hospital),
                const SizedBox(width: 10),
                if (p.yearsOfExperience > 0)
                  _StatChip(icon: Icons.workspace_premium_outlined, label: '${p.yearsOfExperience} yrs exp'),
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
              const SizedBox(height: 20),

              // Bio
              if (p.bio != null && p.bio!.isNotEmpty) ...[
                _SectionHeader('About'),
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
                const SizedBox(height: 20),
              ],

              // Details
              _SectionHeader('Details'),
              const SizedBox(height: 10),
              _InfoCard(children: [
                _InfoRow(Icons.local_hospital_outlined, 'Hospital', p.hospital),
                _InfoRow(Icons.psychology_outlined, 'Specialization', p.specialization),
                if (p.yearsOfExperience > 0)
                  _InfoRow(Icons.workspace_premium_outlined, 'Experience', '${p.yearsOfExperience} years'),
                if (p.licenseNumber.isNotEmpty)
                  _InfoRow(Icons.badge_outlined, 'License', p.licenseNumber),
                _InfoRow(
                  Icons.payments_outlined,
                  'Consultation Fee',
                  p.consultationFee == 0 ? 'Free' : 'ZWL ${p.consultationFee.toStringAsFixed(0)}',
                ),
              ]),
            ],
            const SizedBox(height: 24),

            AppButton(
              label: 'Book Appointment',
              icon: Icons.calendar_today_rounded,
              onTap: () => Navigator.push(context, MaterialPageRoute(
                builder: (_) => BookingScreen(doctor: doctor),
              )),
            ),
            const SizedBox(height: 32),
          ],
        )),
      ]),
    );
  }
}

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
      border: Border.all(color: highlight ? AppColors.primary.withValues(alpha:0.3) : const Color(0xFFE5E7EB)),
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

class _SectionHeader extends StatelessWidget {
  final String text;
  const _SectionHeader(this.text);
  @override
  Widget build(BuildContext context) => Text(text, style: GoogleFonts.plusJakartaSans(
    fontSize: 11, fontWeight: FontWeight.w700,
    color: AppColors.textMuted, letterSpacing: 1.2,
  ));
}

class _InfoCard extends StatelessWidget {
  final List<Widget> children;
  const _InfoCard({required this.children});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Colors.white, borderRadius: BorderRadius.circular(16),
      boxShadow: AppShadows.card,
    ),
    child: Column(children: children),
  );
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoRow(this.icon, this.label, this.value);

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
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
