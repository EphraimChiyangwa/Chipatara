import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../config/constants.dart';
import '../../providers/badge_provider.dart';
import 'home_tab.dart';
import 'appointments_tab.dart';
import 'messages_tab.dart';
import 'profile_tab.dart';

class PatientShell extends StatefulWidget {
  const PatientShell({super.key});

  @override
  State<PatientShell> createState() => _PatientShellState();
}

class _PatientShellState extends State<PatientShell> {
  int _tab = 0;

  final _tabs = const [
    HomeTab(),
    AppointmentsTab(),
    MessagesTab(),
    ProfileTab(),
  ];

  @override
  Widget build(BuildContext context) {
    final msgBadge = context.watch<BadgeProvider>().messagesBadge;
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: IndexedStack(index: _tab, children: _tabs),
      bottomNavigationBar: _FloatingNav(
        selected: _tab,
        onTap: (i) => setState(() => _tab = i),
        messagesBadge: msgBadge,
      ),
    );
  }
}

class _FloatingNav extends StatelessWidget {
  final int selected;
  final ValueChanged<int> onTap;
  final int messagesBadge;

  const _FloatingNav({
    required this.selected,
    required this.onTap,
    this.messagesBadge = 0,
  });

  static const _items = [
    (icon: Icons.home_outlined, activeIcon: Icons.home_rounded, label: 'Home'),
    (icon: Icons.calendar_today_outlined, activeIcon: Icons.calendar_today_rounded, label: 'Appointments'),
    (icon: Icons.chat_bubble_outline_rounded, activeIcon: Icons.chat_bubble_rounded, label: 'Messages'),
    (icon: Icons.person_outline_rounded, activeIcon: Icons.person_rounded, label: 'Profile'),
  ];

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).padding.bottom;
    return Container(
      margin: EdgeInsets.only(left: 20, right: 20, bottom: bottom + 16, top: 8),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.15),
            blurRadius: 24, offset: const Offset(0, 8),
          ),
          const BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0, 2)),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: List.generate(_items.length, (i) {
          final item   = _items[i];
          final active = selected == i;
          // Badge only on Messages tab (index 2) when inactive
          final badge  = (i == 2 && !active) ? messagesBadge : 0;

          return GestureDetector(
            onTap: () => onTap(i),
            behavior: HitTestBehavior.opaque,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 220),
              curve: Curves.easeInOut,
              padding: EdgeInsets.symmetric(horizontal: active ? 16 : 12, vertical: 8),
              decoration: BoxDecoration(
                color: active ? AppColors.primary : Colors.transparent,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Icon(
                      active ? item.activeIcon : item.icon,
                      size: 20,
                      color: active ? Colors.white : AppColors.textMuted,
                    ),
                    if (badge > 0) Positioned(
                      top: -5, right: -5,
                      child: Container(
                        width: 14, height: 14,
                        decoration: BoxDecoration(
                          color: AppColors.danger,
                          shape: BoxShape.circle,
                          border: Border.all(color: active ? AppColors.primary : Colors.white, width: 1.5),
                        ),
                        child: Center(child: Text(
                          badge > 9 ? '9+' : '$badge',
                          style: GoogleFonts.plusJakartaSans(fontSize: 8, fontWeight: FontWeight.w800, color: Colors.white),
                        )),
                      ),
                    ),
                  ],
                ),
                if (active) ...[
                  const SizedBox(width: 6),
                  Text(item.label, style: GoogleFonts.plusJakartaSans(
                    fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white,
                  )),
                ],
              ]),
            ),
          );
        }),
      ),
    );
  }
}
