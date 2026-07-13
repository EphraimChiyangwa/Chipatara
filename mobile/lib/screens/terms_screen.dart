import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../config/constants.dart';

class TermsScreen extends StatelessWidget {
  const TermsScreen({super.key});

  @override
  Widget build(BuildContext context) => _LegalScreen(
    title: 'Terms of Service',
    eyebrow: 'LEGAL',
    sections: const [
      _Section('Acceptance of Terms',
        'By downloading or using Chipatara, you agree to be bound by these Terms of Service. If you do not agree, please do not use the app.'),
      _Section('Medical Disclaimer',
        'Chipatara is a platform that connects patients with healthcare professionals. The information provided through the app is for informational purposes only and does not constitute medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.'),
      _Section('User Accounts',
        'You are responsible for maintaining the confidentiality of your account credentials. You must notify us immediately of any unauthorised use of your account. You must be at least 18 years old or have parental consent to use this service.'),
      _Section('Appointments & Consultations',
        'Appointment bookings are subject to doctor availability. Cancellations must be made at least 2 hours before the scheduled appointment. Chipatara reserves the right to cancel appointments in cases of technical failure or practitioner unavailability.'),
      _Section('Payments',
        'Consultation fees are charged at the time of booking through our secure payment partner (Paystack). Refunds are processed within 5–7 business days for cancelled appointments where the doctor was unavailable.'),
      _Section('Privacy',
        'Your health data is encrypted and stored securely. We do not sell your personal information to third parties. See our Privacy Policy for full details on how we collect, use, and protect your data.'),
      _Section('Prohibited Use',
        'You may not use Chipatara to provide false medical information, impersonate a healthcare professional, attempt to gain unauthorised access to our systems, or use the service for any unlawful purpose.'),
      _Section('Limitation of Liability',
        'Chipatara shall not be liable for any indirect, incidental, special, or consequential damages resulting from your use of or inability to use the service, including any reliance on medical information provided through the platform.'),
      _Section('Changes to Terms',
        'We reserve the right to update these terms at any time. Continued use of the app after changes constitutes acceptance of the new terms. We will notify you of significant changes via in-app notification.'),
      _Section('Contact',
        'For questions about these Terms, contact us at legal@chipatara.health'),
    ],
  );
}

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) => _LegalScreen(
    title: 'Privacy Policy',
    eyebrow: 'LEGAL',
    sections: const [
      _Section('Introduction',
        'Chipatara Telemedicine ("we", "our", "us") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your data when you use our mobile application.'),
      _Section('Information We Collect',
        '• Account information: name, email address, and password (stored as a hashed value).\n• Health data: vital signs synced from your device via Health Connect (heart rate, SpO₂, steps, temperature, blood pressure, sleep).\n• Appointment data: consultation history, prescriptions, and doctor notes.\n• Device data: FCM token for push notifications.\n• Payment data: handled entirely by Paystack — we do not store card numbers.'),
      _Section('How We Use Your Information',
        'We use your information to provide and improve our services, connect you with healthcare providers, send appointment reminders and health alerts, process payments, and comply with legal obligations. We do not sell or rent your personal information to any third party.'),
      _Section('Health Data',
        'Health data synced from your device is stored securely and is only accessible to you and the doctors you have active appointments with. You may delete your health data at any time from your profile settings.'),
      _Section('Data Sharing',
        'Your information is shared only with: (1) healthcare providers you book appointments with, limited to what is necessary for your care; (2) Paystack for payment processing; (3) Firebase for push notifications; (4) service providers who assist us in operating the platform, all bound by confidentiality agreements.'),
      _Section('Data Security',
        'We implement industry-standard security measures including HTTPS encryption for all data in transit, bcrypt hashing for passwords, and JWT-based authentication. However, no method of electronic storage is 100% secure.'),
      _Section('Your Rights',
        'You have the right to access, correct, or delete your personal data at any time. You may also withdraw consent for health data syncing by revoking Health Connect permissions in your device settings. To request data deletion, contact us at privacy@chipatara.health.'),
      _Section('Data Retention',
        'We retain your account data for as long as your account is active. Appointment records are retained for 7 years to comply with medical record-keeping requirements. You may request deletion of non-medical data at any time.'),
      _Section('Children\'s Privacy',
        'Chipatara is not intended for use by individuals under 18 years of age without parental consent. We do not knowingly collect personal information from minors.'),
      _Section('Changes to This Policy',
        'We may update this Privacy Policy periodically. We will notify you of material changes via in-app notification. Continued use of the service after changes constitutes acceptance.'),
      _Section('Contact Us',
        'If you have questions about this Privacy Policy, please contact:\nChipatara Telemedicine\nemail: privacy@chipatara.health'),
    ],
  );
}

// ── Shared legal screen layout ────────────────────────────────────────────────
class _Section {
  final String title;
  final String body;
  const _Section(this.title, this.body);
}

class _LegalScreen extends StatelessWidget {
  final String title;
  final String eyebrow;
  final List<_Section> sections;

  const _LegalScreen({
    required this.title,
    required this.eyebrow,
    required this.sections,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(children: [
        Container(
          width: double.infinity,
          padding: EdgeInsets.only(
            top: MediaQuery.of(context).padding.top + 16,
            left: 24, right: 16, bottom: 24,
          ),
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF1E3A8A), Color(0xFF3B5BDB), Color(0xFF5B7AF5)],
              begin: Alignment.topLeft, end: Alignment.bottomRight,
            ),
          ),
          child: Row(children: [
            GestureDetector(
              onTap: () => Navigator.pop(context),
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 18),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(eyebrow, style: GoogleFonts.plusJakartaSans(
                fontSize: 11, fontWeight: FontWeight.w700,
                color: Colors.white.withValues(alpha: 0.7), letterSpacing: 1.5,
              )),
              Text(title, style: GoogleFonts.plusJakartaSans(
                fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white,
              )),
            ])),
          ]),
        ),
        Expanded(child: ListView.builder(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 40),
          itemCount: sections.length,
          itemBuilder: (_, i) {
            final s = sections[i];
            return Container(
              margin: const EdgeInsets.only(bottom: 14),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white, borderRadius: BorderRadius.circular(16),
                boxShadow: [BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 8, offset: const Offset(0, 2),
                )],
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('${i + 1}. ${s.title}', style: GoogleFonts.plusJakartaSans(
                  fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary,
                )),
                const SizedBox(height: 8),
                Text(s.body, style: GoogleFonts.plusJakartaSans(
                  fontSize: 13, color: AppColors.textSecondary, height: 1.6,
                )),
              ]),
            );
          },
        )),
      ]),
    );
  }
}
