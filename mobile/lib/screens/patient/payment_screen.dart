import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../config/constants.dart';
import '../../services/api_service.dart';
import '../../widgets/widgets.dart';

class PaymentScreen extends StatefulWidget {
  final String authorizationUrl;
  final String reference;
  final String doctorId;
  final String date;
  final String reason;
  final String doctorName;
  final double fee;

  const PaymentScreen({
    super.key,
    required this.authorizationUrl,
    required this.reference,
    required this.doctorId,
    required this.date,
    required this.reason,
    required this.doctorName,
    required this.fee,
  });

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  late final WebViewController _ctrl;
  bool _verifying = false;
  bool _success = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _ctrl = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..setNavigationDelegate(NavigationDelegate(
        onNavigationRequest: (req) {
          if (_isCallback(req.url)) {
            _verify(req.url);
            return NavigationDecision.prevent;
          }
          return NavigationDecision.navigate;
        },
      ))
      ..loadRequest(Uri.parse(widget.authorizationUrl));
  }

  bool _isCallback(String url) =>
      url.contains('payment-callback') ||
      url.contains('trxref=') ||
      url.contains('paystack.com/close');

  Future<void> _verify(String url) async {
    setState(() => _verifying = true);
    final uri = Uri.tryParse(url);
    final ref = uri?.queryParameters['reference'] ??
        uri?.queryParameters['trxref'] ??
        widget.reference;
    try {
      await ApiService.verifyPayment(
        reference: ref,
        doctorId: widget.doctorId,
        date: widget.date,
        reason: widget.reason,
      );
      if (mounted) setState(() => _success = true);
    } catch (e) {
      if (mounted) setState(() {
        _verifying = false;
        _error = e.toString().replaceAll('Exception: ', '');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_success) return _SuccessScreen(doctorName: widget.doctorName, fee: widget.fee);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text('Secure Payment', style: GoogleFonts.plusJakartaSans(
          fontWeight: FontWeight.w700, color: Colors.white,
        )),
        leading: IconButton(
          onPressed: () => Navigator.pop(context),
          icon: const Icon(Icons.close_rounded),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 12),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.lock_outline_rounded, size: 12, color: Colors.white),
              const SizedBox(width: 4),
              Text('Paystack', style: GoogleFonts.plusJakartaSans(
                fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white,
              )),
            ]),
          ),
        ],
      ),
      body: Stack(children: [
        WebViewWidget(controller: _ctrl),
        if (_verifying) Container(
          color: Colors.white,
          child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
            const CircularProgressIndicator(color: AppColors.primary),
            const SizedBox(height: 16),
            Text('Verifying payment…', style: GoogleFonts.plusJakartaSans(
              fontSize: 15, color: AppColors.textSecondary,
            )),
          ])),
        ),
        if (_error != null) Container(
          color: Colors.white,
          padding: const EdgeInsets.all(32),
          child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.error_outline_rounded, color: AppColors.danger, size: 56),
            const SizedBox(height: 16),
            Text('Payment failed', style: GoogleFonts.plusJakartaSans(
              fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.textPrimary,
            )),
            const SizedBox(height: 8),
            Text(_error!, textAlign: TextAlign.center, style: GoogleFonts.plusJakartaSans(
              fontSize: 13, color: AppColors.textSecondary,
            )),
            const SizedBox(height: 24),
            AppButton(label: 'Try Again', onTap: () {
              setState(() => _error = null);
              _ctrl.loadRequest(Uri.parse(widget.authorizationUrl));
            }),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('Cancel', style: GoogleFonts.plusJakartaSans(color: AppColors.textSecondary)),
            ),
          ])),
        ),
      ]),
    );
  }
}

class _SuccessScreen extends StatelessWidget {
  final String doctorName;
  final double fee;
  const _SuccessScreen({required this.doctorName, required this.fee});

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.surface,
    body: SafeArea(child: Center(child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Container(
          width: 96, height: 96,
          decoration: const BoxDecoration(color: AppColors.successLight, shape: BoxShape.circle),
          child: const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 52),
        ),
        const SizedBox(height: 24),
        Text('Payment confirmed!', style: GoogleFonts.plusJakartaSans(
          fontSize: 26, fontWeight: FontWeight.w800, color: AppColors.textPrimary,
        )),
        const SizedBox(height: 8),
        Text(
          'Your appointment with $doctorName has been booked and payment of \$${fee.toStringAsFixed(2)} received.',
          textAlign: TextAlign.center,
          style: GoogleFonts.plusJakartaSans(fontSize: 14, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 32),
        AppButton(
          label: 'Done',
          onTap: () => Navigator.of(context).popUntil((r) => r.isFirst),
        ),
      ]),
    ))),
  );
}
