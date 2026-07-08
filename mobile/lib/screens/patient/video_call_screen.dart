import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import '../../config/constants.dart';
import '../../models/models.dart';

class VideoCallScreen extends StatefulWidget {
  final Appointment appointment;
  const VideoCallScreen({super.key, required this.appointment});

  @override
  State<VideoCallScreen> createState() => _VideoCallScreenState();
}

class _VideoCallScreenState extends State<VideoCallScreen> {
  late final WebViewController _controller;
  bool _loading = true;
  bool _confirmingEnd = false;

  String get _roomUrl =>
      'https://meet.jit.si/chipatara-${widget.appointment.id}';

  @override
  void initState() {
    super.initState();
    // Force landscape + full screen for the call
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.black)
      ..setNavigationDelegate(NavigationDelegate(
        onPageStarted: (_) => setState(() => _loading = true),
        onPageFinished: (_) => setState(() => _loading = false),
      ))
      ..loadRequest(Uri.parse(_roomUrl));

    // Grant camera + mic to web content on Android
    if (Platform.isAndroid) {
      final androidController =
          _controller.platform as AndroidWebViewController;
      androidController
        ..setMediaPlaybackRequiresUserGesture(false)
        ..setOnPlatformPermissionRequest((request) => request.grant());
    }
  }

  @override
  void dispose() {
    // Restore portrait + system UI on exit
    SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }

  void _endCall() {
    setState(() => _confirmingEnd = true);
  }

  void _cancelEnd() {
    setState(() => _confirmingEnd = false);
  }

  void _confirmEnd() {
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _endCall();
      },
      child: Scaffold(
        backgroundColor: Colors.black,
        body: Stack(children: [
          // WebView — full screen
          WebViewWidget(controller: _controller),

          // Loading overlay
          if (_loading)
            Container(
              color: Colors.black,
              child: Center(child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const CircularProgressIndicator(color: Colors.white),
                  const SizedBox(height: 20),
                  Text('Connecting to call…', style: GoogleFonts.plusJakartaSans(
                    color: Colors.white70, fontSize: 14,
                  )),
                  const SizedBox(height: 8),
                  Text(widget.appointment.doctorName,
                    style: GoogleFonts.plusJakartaSans(
                      color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700,
                    )),
                ],
              )),
            ),

          // Top bar (doctor name + end call)
          if (!_loading)
            Positioned(
              top: 0, left: 0, right: 0,
              child: SafeArea(
                child: Container(
                  margin: const EdgeInsets.all(12),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.55),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(children: [
                    Container(
                      width: 8, height: 8,
                      decoration: const BoxDecoration(
                        color: Color(0xFF34D399), shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(widget.appointment.doctorName,
                        style: GoogleFonts.plusJakartaSans(
                          color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14,
                        )),
                      Text('Video consultation', style: GoogleFonts.plusJakartaSans(
                        color: Colors.white60, fontSize: 11,
                      )),
                    ])),
                  ]),
                ),
              ),
            ),

          // End call button
          if (!_loading)
            Positioned(
              bottom: 32, left: 0, right: 0,
              child: SafeArea(
                child: Center(child: GestureDetector(
                  onTap: _endCall,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                    decoration: BoxDecoration(
                      color: AppColors.danger,
                      borderRadius: BorderRadius.circular(40),
                      boxShadow: [
                        BoxShadow(color: AppColors.danger.withValues(alpha: 0.4),
                          blurRadius: 20, offset: const Offset(0, 6)),
                      ],
                    ),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.call_end_rounded, color: Colors.white, size: 20),
                      const SizedBox(width: 10),
                      Text('End Call', style: GoogleFonts.plusJakartaSans(
                        color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14,
                      )),
                    ]),
                  ),
                )),
              ),
            ),

          // End call confirmation dialog
          if (_confirmingEnd)
            Container(
              color: Colors.black.withValues(alpha: 0.7),
              child: Center(child: Container(
                margin: const EdgeInsets.all(32),
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: const Color(0xFF1F2937),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.call_end_rounded, color: AppColors.danger, size: 40),
                  const SizedBox(height: 16),
                  Text('End the call?', style: GoogleFonts.plusJakartaSans(
                    color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700,
                  )),
                  const SizedBox(height: 8),
                  Text('You will leave the video consultation.',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.plusJakartaSans(color: Colors.white60, fontSize: 13)),
                  const SizedBox(height: 24),
                  Row(children: [
                    Expanded(child: GestureDetector(
                      onTap: _cancelEnd,
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Center(child: Text('Stay', style: GoogleFonts.plusJakartaSans(
                          color: Colors.white, fontWeight: FontWeight.w600,
                        ))),
                      ),
                    )),
                    const SizedBox(width: 12),
                    Expanded(child: GestureDetector(
                      onTap: _confirmEnd,
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: AppColors.danger,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Center(child: Text('End Call', style: GoogleFonts.plusJakartaSans(
                          color: Colors.white, fontWeight: FontWeight.w700,
                        ))),
                      ),
                    )),
                  ]),
                ]),
              )),
            ),
        ]),
      ),
    );
  }
}
