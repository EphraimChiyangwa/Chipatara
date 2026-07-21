import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../config/constants.dart';
import '../../services/api_service.dart';
import '../../widgets/widgets.dart';

class PaymentHistoryScreen extends StatefulWidget {
  const PaymentHistoryScreen({super.key});

  @override
  State<PaymentHistoryScreen> createState() => _PaymentHistoryScreenState();
}

class _PaymentHistoryScreenState extends State<PaymentHistoryScreen> {
  List<Map<String, dynamic>> _payments = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      _payments = await ApiService.getPaymentHistory();
    } catch (_) {}
    setState(() => _loading = false);
  }

  double get _total => _payments.fold(0, (sum, p) => sum + ((p['fee'] as num?)?.toDouble() ?? 0));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(children: [
        GradientHeader(
          eyebrow: 'PAYMENTS',
          title: 'Payment History',
          subtitle: _loading ? null : '${_payments.length} transaction${_payments.length == 1 ? '' : 's'}',
          onBack: () => Navigator.pop(context),
        ),
        Expanded(child: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : RefreshIndicator(
              onRefresh: _load,
              color: AppColors.primary,
              child: _payments.isEmpty
                ? ListView(children: [const EmptyState(
                    icon: Icons.receipt_long_outlined,
                    title: 'No payments yet',
                    description: 'Your paid consultation history will appear here',
                  )])
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      // Total spent card
                      Container(
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF2A44C8), Color(0xFF5B7AF5)],
                            begin: Alignment.topLeft, end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(children: [
                          Container(
                            width: 48, height: 48,
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: const Icon(Icons.account_balance_wallet_outlined, color: Colors.white, size: 22),
                          ),
                          const SizedBox(width: 16),
                          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text('Total Spent', style: GoogleFonts.plusJakartaSans(
                              fontSize: 12, color: Colors.white70, fontWeight: FontWeight.w600,
                            )),
                            Text('ZWL ${NumberFormat('#,##0.00').format(_total)}',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 24, fontWeight: FontWeight.w800, color: Colors.white,
                              )),
                          ]),
                        ]),
                      ),
                      ..._payments.map((p) => _PaymentCard(payment: p)),
                    ],
                  ),
            )),
      ]),
    );
  }
}

class _PaymentCard extends StatelessWidget {
  final Map<String, dynamic> payment;
  const _PaymentCard({required this.payment});

  @override
  Widget build(BuildContext context) {
    final date = DateTime.tryParse(payment['date']?.toString() ?? '');
    final fee = (payment['fee'] as num?)?.toDouble() ?? 0;
    final ref = payment['reference'] as String? ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: AppShadows.card,
      ),
      child: Row(children: [
        Container(
          width: 44, height: 44,
          decoration: BoxDecoration(
            color: AppColors.successLight,
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Icon(Icons.check_circle_outline_rounded, color: AppColors.success, size: 22),
        ),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(payment['doctorName']?.toString() ?? 'Doctor', style: GoogleFonts.plusJakartaSans(
            fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary,
          )),
          const SizedBox(height: 2),
          Text(payment['reason']?.toString() ?? '', style: GoogleFonts.plusJakartaSans(
            fontSize: 12, color: AppColors.textSecondary,
          ), maxLines: 1, overflow: TextOverflow.ellipsis),
          if (date != null) ...[
            const SizedBox(height: 2),
            Text(DateFormat('MMM d, y · h:mm a').format(date), style: GoogleFonts.plusJakartaSans(
              fontSize: 11, color: AppColors.textMuted,
            )),
          ],
          if (ref.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text('Ref: $ref', style: GoogleFonts.plusJakartaSans(
              fontSize: 10, color: AppColors.textMuted,
            ), maxLines: 1, overflow: TextOverflow.ellipsis),
          ],
        ])),
        const SizedBox(width: 12),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text('ZWL ${fee.toStringAsFixed(0)}', style: GoogleFonts.plusJakartaSans(
            fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary,
          )),
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: AppColors.successLight,
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text('Paid', style: GoogleFonts.plusJakartaSans(
              fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.success,
            )),
          ),
        ]),
      ]),
    );
  }
}
