import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../config/constants.dart';
import '../../services/api_service.dart';

class DoctorEarningsTab extends StatefulWidget {
  const DoctorEarningsTab({super.key});

  @override
  State<DoctorEarningsTab> createState() => _DoctorEarningsTabState();
}

class _DoctorEarningsTabState extends State<DoctorEarningsTab> {
  Map<String, dynamic>? _stats;
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try { _stats = await ApiService.getDoctorStats(); } catch (_) {}
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      // Header
      Container(
        width: double.infinity,
        padding: EdgeInsets.only(
          top: MediaQuery.of(context).padding.top + 20,
          left: 24, right: 24, bottom: 28,
        ),
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF065F46), Color(0xFF059669), Color(0xFF34D399)],
            begin: Alignment.topLeft, end: Alignment.bottomRight,
          ),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('EARNINGS', style: GoogleFonts.plusJakartaSans(
            fontSize: 11, fontWeight: FontWeight.w700,
            color: Colors.white.withValues(alpha: 0.7), letterSpacing: 1.5,
          )),
          const SizedBox(height: 4),
          Text('Dashboard', style: GoogleFonts.plusJakartaSans(
            fontSize: 26, fontWeight: FontWeight.w800, color: Colors.white,
          )),
          const SizedBox(height: 20),
          // Total earnings hero
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
            ),
            child: Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Total Earned', style: GoogleFonts.plusJakartaSans(
                  fontSize: 12, color: Colors.white.withValues(alpha: 0.8),
                )),
                const SizedBox(height: 4),
                Text(
                  _loading ? '—' : 'ZWL ${_fmt(_stats?['totalEarnings'])}',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 30, fontWeight: FontWeight.w800, color: Colors.white,
                  ),
                ),
                if (!_loading && (_stats?['pendingEarnings'] ?? 0) > 0)
                  Text(
                    'ZWL ${_fmt(_stats?['pendingEarnings'])} pending',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 12, color: Colors.white.withValues(alpha: 0.7),
                    ),
                  ),
              ])),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(Icons.account_balance_wallet_outlined,
                  color: Colors.white, size: 28),
              ),
            ]),
          ),
        ]),
      ),

      Expanded(child: _loading
        ? const Center(child: CircularProgressIndicator(color: Color(0xFF059669)))
        : _stats == null
          ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.bar_chart_outlined, size: 48, color: AppColors.textMuted),
              const SizedBox(height: 12),
              Text('Could not load stats', style: GoogleFonts.plusJakartaSans(color: AppColors.textMuted)),
              const SizedBox(height: 12),
              TextButton(onPressed: _load, child: const Text('Retry')),
            ]))
          : RefreshIndicator(
              onRefresh: _load,
              color: const Color(0xFF059669),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                children: [
                  // Stats row
                  Row(children: [
                    _StatCard('Completed', '${_stats!['completedCount'] ?? 0}',
                        Icons.check_circle_outline, AppColors.success),
                    const SizedBox(width: 10),
                    _StatCard('Pending', '${_stats!['pendingCount'] ?? 0}',
                        Icons.schedule_outlined, AppColors.warning),
                    const SizedBox(width: 10),
                    _StatCard('Cancelled', '${_stats!['cancelledCount'] ?? 0}',
                        Icons.cancel_outlined, AppColors.danger),
                  ]),
                  const SizedBox(height: 14),

                  // Rating card
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white, borderRadius: BorderRadius.circular(18),
                      boxShadow: AppShadows.card,
                    ),
                    child: Row(children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFFBEB),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.star_rounded,
                          color: Color(0xFFF59E0B), size: 22),
                      ),
                      const SizedBox(width: 14),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('Average Rating', style: GoogleFonts.plusJakartaSans(
                          fontSize: 12, color: AppColors.textSecondary,
                        )),
                        Text(
                          _stats!['averageRating'] != null
                              ? '${_stats!['averageRating']} / 5'
                              : 'No ratings yet',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 20, fontWeight: FontWeight.w800,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ])),
                      Text('${_stats!['totalRatings'] ?? 0} reviews',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 12, color: AppColors.textMuted,
                        )),
                    ]),
                  ),
                  const SizedBox(height: 14),

                  // Monthly chart
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white, borderRadius: BorderRadius.circular(18),
                      boxShadow: AppShadows.card,
                    ),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('Monthly Earnings', style: GoogleFonts.plusJakartaSans(
                        fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary,
                      )),
                      Text('Last 6 months', style: GoogleFonts.plusJakartaSans(
                        fontSize: 11, color: AppColors.textMuted,
                      )),
                      const SizedBox(height: 16),
                      _MonthlyChart(months: List<Map<String, dynamic>>.from(
                        _stats!['monthlyEarnings'] ?? [],
                      )),
                    ]),
                  ),
                  const SizedBox(height: 14),

                  // Recent completed
                  if ((_stats!['recentCompleted'] as List?)?.isNotEmpty == true) ...[
                    Text('RECENT CONSULTATIONS', style: GoogleFonts.plusJakartaSans(
                      fontSize: 11, fontWeight: FontWeight.w700,
                      color: AppColors.textMuted, letterSpacing: 1.2,
                    )),
                    const SizedBox(height: 10),
                    ...List<Map<String, dynamic>>.from(_stats!['recentCompleted'])
                      .map((a) => _RecentCard(appt: a)),
                  ],
                ],
              ),
            ),
      ),
    ]);
  }

  String _fmt(dynamic v) {
    if (v == null) return '0';
    final n = (v as num).toDouble();
    if (n >= 1000) return NumberFormat('#,###').format(n);
    return n.toStringAsFixed(0);
  }
}

class _StatCard extends StatelessWidget {
  final String label, value;
  final IconData icon;
  final Color color;
  const _StatCard(this.label, this.value, this.icon, this.color);

  @override
  Widget build(BuildContext context) => Expanded(child: Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
    decoration: BoxDecoration(
      color: Colors.white, borderRadius: BorderRadius.circular(16),
      boxShadow: AppShadows.soft,
    ),
    child: Column(children: [
      Icon(icon, color: color, size: 20),
      const SizedBox(height: 6),
      Text(value, style: GoogleFonts.plusJakartaSans(
        fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.textPrimary,
      )),
      Text(label, style: GoogleFonts.plusJakartaSans(
        fontSize: 10, color: AppColors.textSecondary,
      )),
    ]),
  ));
}

class _MonthlyChart extends StatelessWidget {
  final List<Map<String, dynamic>> months;
  const _MonthlyChart({required this.months});

  @override
  Widget build(BuildContext context) {
    if (months.isEmpty) {
      return Text('No data yet', style: GoogleFonts.plusJakartaSans(
        color: AppColors.textMuted, fontSize: 13,
      ));
    }
    final maxVal = months.map((m) => (m['earnings'] as num).toDouble()).fold(0.0, (a, b) => a > b ? a : b);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: months.map((m) {
        final val = (m['earnings'] as num).toDouble();
        final pct = maxVal > 0 ? val / maxVal : 0.0;
        final isLast = m == months.last;
        return Expanded(child: Padding(
          padding: EdgeInsets.only(right: isLast ? 0 : 6),
          child: Column(children: [
            if (val > 0)
              Text(
                val >= 1000 ? '${(val / 1000).toStringAsFixed(1)}k' : val.toStringAsFixed(0),
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 9, fontWeight: FontWeight.w700, color: AppColors.textMuted,
                ),
              ),
            const SizedBox(height: 4),
            AnimatedContainer(
              duration: const Duration(milliseconds: 600),
              height: pct > 0 ? (80 * pct).clamp(4.0, 80.0) : 4,
              decoration: BoxDecoration(
                color: isLast
                    ? const Color(0xFF059669)
                    : const Color(0xFF059669).withValues(alpha: 0.35 + 0.4 * pct),
                borderRadius: BorderRadius.circular(6),
              ),
            ),
            const SizedBox(height: 6),
            Text(m['month'] as String, style: GoogleFonts.plusJakartaSans(
              fontSize: 10, color: AppColors.textMuted,
            )),
          ]),
        ));
      }).toList(),
    );
  }
}

class _RecentCard extends StatelessWidget {
  final Map<String, dynamic> appt;
  const _RecentCard({required this.appt});

  @override
  Widget build(BuildContext context) {
    final date = DateTime.tryParse(appt['date'].toString());
    final fee  = (appt['fee'] as num?)?.toDouble() ?? 0;
    final paid = appt['paid'] == true;
    final rating = appt['rating'];

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(16),
        boxShadow: AppShadows.soft,
      ),
      child: Row(children: [
        CircleAvatar(
          radius: 20,
          backgroundColor: AppColors.primaryLight,
          child: Text(
            (appt['patientName'] as String? ?? 'P')[0].toUpperCase(),
            style: GoogleFonts.plusJakartaSans(
              fontWeight: FontWeight.w800, color: AppColors.primary,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(appt['patientName'] as String? ?? 'Patient',
            style: GoogleFonts.plusJakartaSans(
              fontWeight: FontWeight.w700, color: AppColors.textPrimary, fontSize: 13,
            )),
          if (date != null)
            Text(DateFormat('MMM d, y').format(date),
              style: GoogleFonts.plusJakartaSans(fontSize: 11, color: AppColors.textSecondary)),
          if (rating != null)
            Row(children: List.generate(5, (i) => Icon(
              i < (rating as num) ? Icons.star_rounded : Icons.star_outline_rounded,
              size: 12, color: const Color(0xFFF59E0B),
            ))),
        ])),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text('ZWL ${fee.toStringAsFixed(0)}',
            style: GoogleFonts.plusJakartaSans(
              fontWeight: FontWeight.w800, fontSize: 14,
              color: paid ? AppColors.success : AppColors.textMuted,
            )),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: paid ? AppColors.successLight : const Color(0xFFF3F4F6),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(paid ? 'Paid' : 'Unpaid',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 10, fontWeight: FontWeight.w700,
                color: paid ? AppColors.success : AppColors.textMuted,
              )),
          ),
        ]),
      ]),
    );
  }
}
