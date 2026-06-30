import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../config/constants.dart';
import '../../models/models.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../widgets/widgets.dart';
import 'booking_screen.dart';
import 'health_screen.dart';
import 'ai_checker_screen.dart';

class HomeTab extends StatefulWidget {
  const HomeTab({super.key});

  @override
  State<HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<HomeTab> {
  List<Doctor> _doctors = [];
  bool _loading = true;
  String _search = '';
  String _spec = '';
  List<String> _specs = [];
  final _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        ApiService.getDoctors(search: _search, specialization: _spec),
        ApiService.getSpecializations(),
      ]);
      setState(() {
        _doctors = results[0] as List<Doctor>;
        _specs   = results[1] as List<String>;
      });
    } catch (_) {}
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    return ListView(children: [
      // Header
      Container(
        padding: EdgeInsets.only(
          top: MediaQuery.of(context).padding.top + 16,
          left: 24, right: 24, bottom: 28,
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
              Text('Good day,', style: GoogleFonts.plusJakartaSans(
                fontSize: 13, color: Colors.white.withOpacity(0.7),
              )),
              Text(user?.name.split(' ').first ?? 'there', style: GoogleFonts.plusJakartaSans(
                fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white,
              )),
            ]),
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.18),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.white.withOpacity(0.25)),
              ),
              child: const Icon(Icons.person_outline, color: Colors.white),
            ),
          ]),
          const SizedBox(height: 20),
          // Quick actions
          Row(children: [
            _QuickAction(icon: Icons.health_and_safety_outlined, label: 'Health', onTap: () =>
              Navigator.push(context, MaterialPageRoute(builder: (_) => const HealthScreen()))),
            const SizedBox(width: 10),
            _QuickAction(icon: Icons.psychology_outlined, label: 'AI Check', onTap: () =>
              Navigator.push(context, MaterialPageRoute(builder: (_) => const AiCheckerScreen()))),
            const SizedBox(width: 10),
            _QuickAction(icon: Icons.videocam_outlined, label: 'Video', onTap: () {}),
            const SizedBox(width: 10),
            _QuickAction(icon: Icons.emergency_outlined, label: 'Emergency', onTap: () {}),
          ]),
        ]),
      ),

      Padding(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Search bar
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              boxShadow: AppShadows.soft,
            ),
            child: TextField(
              controller: _searchCtrl,
              onChanged: (v) { _search = v; _load(); },
              style: GoogleFonts.plusJakartaSans(fontSize: 14),
              decoration: InputDecoration(
                hintText: 'Search doctors…',
                hintStyle: GoogleFonts.plusJakartaSans(color: AppColors.textMuted),
                prefixIcon: const Icon(Icons.search, color: AppColors.textMuted),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Specialization pills
          if (_specs.isNotEmpty) SizedBox(
            height: 36,
            child: ListView(scrollDirection: Axis.horizontal, children: [
              _SpecChip(label: 'All', selected: _spec.isEmpty, onTap: () { setState(() => _spec = ''); _load(); }),
              ..._specs.map((s) => _SpecChip(
                label: s, selected: _spec == s,
                onTap: () { setState(() => _spec = s); _load(); },
              )),
            ]),
          ),
          const SizedBox(height: 20),

          Text('Available Doctors', style: GoogleFonts.plusJakartaSans(
            fontSize: 11, fontWeight: FontWeight.w700,
            color: AppColors.textMuted, letterSpacing: 1.2,
          )),
          const SizedBox(height: 12),

          if (_loading) ...List.generate(3, (_) => _DoctorSkeleton()),

          if (!_loading && _doctors.isEmpty)
            const EmptyState(
              icon: Icons.person_search_outlined,
              title: 'No doctors found',
              description: 'Try a different search or specialization',
            ),

          ..._doctors.map((d) => _DoctorCard(
            doctor: d,
            onTap: () => Navigator.push(context, MaterialPageRoute(
              builder: (_) => BookingScreen(doctor: d),
            )).then((_) => setState(() {})),
          )),
        ]),
      ),
    ]);
  }
}

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _QuickAction({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(child: GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.15),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withOpacity(0.2)),
        ),
        child: Column(children: [
          Icon(icon, color: Colors.white, size: 22),
          const SizedBox(height: 4),
          Text(label, style: GoogleFonts.plusJakartaSans(
            fontSize: 10, fontWeight: FontWeight.w600, color: Colors.white.withOpacity(0.9),
          )),
        ]),
      ),
    ));
  }
}

class _SpecChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _SpecChip({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: selected ? AppColors.primary : const Color(0xFFE5E7EB)),
        ),
        child: Text(label, style: GoogleFonts.plusJakartaSans(
          fontSize: 12, fontWeight: FontWeight.w600,
          color: selected ? Colors.white : AppColors.textSecondary,
        )),
      ),
    );
  }
}

class _DoctorCard extends StatelessWidget {
  final Doctor doctor;
  final VoidCallback onTap;

  const _DoctorCard({required this.doctor, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: AppShadows.card,
        ),
        child: Row(children: [
          // Avatar
          Container(
            width: 52, height: 52,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColors.gradientStart, AppColors.gradientEnd],
                begin: Alignment.topLeft, end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Center(child: Text(
              doctor.name.isNotEmpty ? doctor.name[0].toUpperCase() : 'D',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white,
              ),
            )),
          ),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(doctor.name, style: GoogleFonts.plusJakartaSans(
              fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary,
            )),
            if (doctor.profile != null) ...[
              const SizedBox(height: 2),
              Text(doctor.profile!.specialization, style: GoogleFonts.plusJakartaSans(
                fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w600,
              )),
              const SizedBox(height: 2),
              Text(doctor.profile!.hospital, style: GoogleFonts.plusJakartaSans(
                fontSize: 12, color: AppColors.textSecondary,
              )),
            ],
            const SizedBox(height: 6),
            Row(children: [
              if (doctor.averageRating > 0) ...[
                const Icon(Icons.star_rounded, size: 14, color: Color(0xFFF59E0B)),
                const SizedBox(width: 3),
                Text(doctor.averageRating.toStringAsFixed(1), style: GoogleFonts.plusJakartaSans(
                  fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textPrimary,
                )),
                const SizedBox(width: 8),
              ],
              if (doctor.profile != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text('ZWL ${doctor.profile!.consultationFee.toStringAsFixed(0)}',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primary,
                    )),
                ),
            ]),
          ])),
          const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
        ]),
      ),
    );
  }
}

class _DoctorSkeleton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(20),
        boxShadow: AppShadows.card,
      ),
      child: Row(children: [
        SkeletonBox(width: 52, height: 52, radius: 16),
        const SizedBox(width: 14),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SkeletonBox(width: 140),
          const SizedBox(height: 8),
          SkeletonBox(width: 100),
          const SizedBox(height: 8),
          SkeletonBox(width: 80),
        ]),
      ]),
    );
  }
}
