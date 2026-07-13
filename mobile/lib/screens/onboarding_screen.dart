import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/constants.dart';
import 'auth/login_screen.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _pageCtrl = PageController();
  int _page = 0;

  static const _slides = [
    _Slide(
      gradient: [Color(0xFF1E3A8A), Color(0xFF3B5BDB), Color(0xFF5B7AF5)],
      icon: Icons.health_and_safety_rounded,
      title: 'Your Health,\nOn Demand',
      body: 'Browse verified doctors, book same-day consultations, and manage all your health appointments in one place.',
    ),
    _Slide(
      gradient: [Color(0xFF065F46), Color(0xFF059669), Color(0xFF34D399)],
      icon: Icons.videocam_rounded,
      title: 'See a Doctor\nFrom Home',
      body: 'Crystal-clear video consultations with no waiting rooms, no travel — just care when and where you need it.',
    ),
    _Slide(
      gradient: [Color(0xFF4C1D95), Color(0xFF7C3AED), Color(0xFFA78BFA)],
      icon: Icons.monitor_heart_rounded,
      title: 'Track Your\nVitals Daily',
      body: 'Sync your smartwatch with Health Connect and share real-time heart rate, SpO₂, and sleep data with your doctor.',
    ),
  ];

  Future<void> _finish() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('onboarding_complete', true);
    if (!mounted) return;
    Navigator.pushReplacement(context,
        MaterialPageRoute(builder: (_) => const LoginScreen()));
  }

  @override
  void initState() {
    super.initState();
    SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(children: [
        // Slides
        PageView.builder(
          controller: _pageCtrl,
          itemCount: _slides.length,
          onPageChanged: (i) => setState(() => _page = i),
          itemBuilder: (_, i) => _SlideView(slide: _slides[i]),
        ),

        // Bottom controls
        Positioned(
          left: 0, right: 0, bottom: 0,
          child: Container(
            padding: EdgeInsets.only(
              left: 32, right: 32,
              bottom: MediaQuery.of(context).padding.bottom + 32,
              top: 24,
            ),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.transparent, Colors.black26],
                begin: Alignment.topCenter, end: Alignment.bottomCenter,
              ),
            ),
            child: Column(children: [
              // Dot indicators
              Row(mainAxisAlignment: MainAxisAlignment.center, children: List.generate(
                _slides.length,
                (i) => AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: _page == i ? 24 : 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: _page == i ? 1 : 0.4),
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              )),
              const SizedBox(height: 28),
              // Buttons
              if (_page < _slides.length - 1)
                Row(children: [
                  Expanded(child: GestureDetector(
                    onTap: _finish,
                    child: Text('Skip', style: GoogleFonts.plusJakartaSans(
                      fontSize: 15, fontWeight: FontWeight.w600,
                      color: Colors.white.withValues(alpha: 0.7),
                    ), textAlign: TextAlign.center),
                  )),
                  Expanded(child: _NextButton(
                    label: 'Next',
                    onTap: () => _pageCtrl.nextPage(
                      duration: const Duration(milliseconds: 350),
                      curve: Curves.easeInOut,
                    ),
                  )),
                ])
              else
                _NextButton(label: 'Get Started', onTap: _finish, full: true),
            ]),
          ),
        ),
      ]),
    );
  }
}

class _Slide {
  final List<Color> gradient;
  final IconData icon;
  final String title;
  final String body;
  const _Slide({required this.gradient, required this.icon, required this.title, required this.body});
}

class _SlideView extends StatelessWidget {
  final _Slide slide;
  const _SlideView({required this.slide});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: slide.gradient,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(32, 60, 32, 160),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Icon container
              Container(
                width: 80, height: 80,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                ),
                child: Icon(slide.icon, color: Colors.white, size: 40),
              ),
              const SizedBox(height: 40),
              Text(slide.title, style: GoogleFonts.plusJakartaSans(
                fontSize: 38, fontWeight: FontWeight.w800,
                color: Colors.white, height: 1.1,
              )),
              const SizedBox(height: 20),
              Text(slide.body, style: GoogleFonts.plusJakartaSans(
                fontSize: 16, color: Colors.white.withValues(alpha: 0.8),
                height: 1.6,
              )),
            ],
          ),
        ),
      ),
    );
  }
}

class _NextButton extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  final bool full;
  const _NextButton({required this.label, required this.onTap, this.full = false});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: full ? double.infinity : null,
      child: ElevatedButton(
        onPressed: onTap,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.white,
          foregroundColor: AppColors.primary,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
        child: Text(label, style: GoogleFonts.plusJakartaSans(
          fontSize: 15, fontWeight: FontWeight.w800,
        )),
      ),
    );
  }
}
