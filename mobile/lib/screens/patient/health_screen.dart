import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../config/constants.dart';
import '../../models/models.dart';
import '../../services/api_service.dart';
import '../../services/health_connect_service.dart';
import '../../widgets/widgets.dart';

class HealthScreen extends StatefulWidget {
  const HealthScreen({super.key});

  @override
  State<HealthScreen> createState() => _HealthScreenState();
}

class _HealthScreenState extends State<HealthScreen> {
  List<HealthMetric> _metrics = [];
  bool _loading = true;
  bool _syncing = false;
  String? _syncMsg;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try { _metrics = await ApiService.getMyHealthMetrics(); } catch (_) {}
    setState(() => _loading = false);
  }

  Future<void> _syncFromWatch() async {
    setState(() { _syncing = true; _syncMsg = null; });
    try {
      final granted = await HealthConnectService.requestPermissions();
      if (!granted) {
        setState(() => _syncMsg = 'Permission denied. Grant access in Health Connect settings.');
        return;
      }
      final payload = await HealthConnectService.syncNow();
      if (payload == null) {
        setState(() => _syncMsg = 'No recent data found on your device.');
      } else {
        setState(() => _syncMsg = 'Synced ${payload.length} metric(s) from your watch.');
        await _load();
      }
    } catch (e) {
      setState(() => _syncMsg = e.toString().replaceAll('Exception: ', ''));
    } finally {
      setState(() => _syncing = false);
    }
  }

  bool _isAlert(HealthMetric m) =>
    (m.heartRate != null && (m.heartRate! > 120 || m.heartRate! < 40)) ||
    (m.spO2 != null && m.spO2! < 94) ||
    (m.temperature != null && m.temperature! > 38.5) ||
    (m.systolic != null && m.systolic! > 140);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(children: [
        GradientHeader(
          eyebrow: 'VITALS DASHBOARD',
          title: 'Health Monitoring',
          subtitle: 'Your real-time health metrics',
          onBack: () => Navigator.pop(context),
          colors: const [Color(0xFF065F46), Color(0xFF059669), Color(0xFF34D399)],
          trailing: GestureDetector(
            onTap: _load,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
              ),
              child: Text('Refresh', style: GoogleFonts.plusJakartaSans(
                fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white,
              )),
            ),
          ),
        ),
        // Sync from Watch banner
        Container(
          margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: _syncing ? null : _syncFromWatch,
              borderRadius: BorderRadius.circular(16),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF065F46), Color(0xFF059669)],
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [BoxShadow(color: const Color(0xFF059669).withValues(alpha: 0.3), blurRadius: 12, offset: const Offset(0, 4))],
                ),
                child: Row(children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.watch_outlined, color: Colors.white, size: 20),
                  ),
                  const SizedBox(width: 14),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Sync from Watch', style: GoogleFonts.plusJakartaSans(
                      fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white,
                    )),
                    Text('Reads from Health Connect (Samsung, Fitbit, Garmin…)', style: GoogleFonts.plusJakartaSans(
                      fontSize: 11, color: Colors.white.withValues(alpha: 0.75),
                    )),
                  ])),
                  _syncing
                    ? const SizedBox(width: 20, height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white, size: 14),
                ]),
              ),
            ),
          ),
        ),
        if (_syncMsg != null)
          Container(
            margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: _syncMsg!.startsWith('Synced')
                  ? const Color(0xFFD1FAE5)
                  : const Color(0xFFFEE2E2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(children: [
              Icon(
                _syncMsg!.startsWith('Synced') ? Icons.check_circle_outline : Icons.info_outline,
                size: 16,
                color: _syncMsg!.startsWith('Synced') ? const Color(0xFF059669) : AppColors.danger,
              ),
              const SizedBox(width: 8),
              Expanded(child: Text(_syncMsg!, style: GoogleFonts.plusJakartaSans(
                fontSize: 12, color: _syncMsg!.startsWith('Synced') ? const Color(0xFF065F46) : AppColors.danger,
              ))),
              GestureDetector(
                onTap: () => setState(() => _syncMsg = null),
                child: const Icon(Icons.close, size: 14, color: AppColors.textMuted),
              ),
            ]),
          ),
        Expanded(child: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF059669)))
          : _metrics.isEmpty
            ? EmptyState(
                icon: Icons.monitor_heart_outlined,
                title: 'No health data yet',
                description: 'Tap "Sync from Watch" above to pull data from Health Connect',
                buttonLabel: 'Refresh',
                onButton: _load,
              )
            : RefreshIndicator(
                onRefresh: _load,
                color: const Color(0xFF059669),
                child: ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    if (_metrics.isNotEmpty) ...[
                      Text('LATEST READINGS', style: GoogleFonts.plusJakartaSans(
                        fontSize: 11, fontWeight: FontWeight.w700,
                        color: AppColors.textMuted, letterSpacing: 1.2,
                      )),
                      const SizedBox(height: 12),
                      _MetricGrid(metric: _metrics.first),
                      const SizedBox(height: 8),
                      Text(
                        'Last update: ${DateFormat('MMM d, h:mm a').format(_metrics.first.timestamp)}',
                        style: GoogleFonts.plusJakartaSans(fontSize: 11, color: AppColors.textMuted),
                        textAlign: TextAlign.right,
                      ),
                      const SizedBox(height: 20),
                    ],
                    if (_metrics.length > 1) ...[
                      Text('HISTORY', style: GoogleFonts.plusJakartaSans(
                        fontSize: 11, fontWeight: FontWeight.w700,
                        color: AppColors.textMuted, letterSpacing: 1.2,
                      )),
                      const SizedBox(height: 12),
                      ..._metrics.skip(1).map((m) => Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white, borderRadius: BorderRadius.circular(16),
                          border: _isAlert(m) ? Border.all(color: AppColors.danger.withValues(alpha:0.5)) : null,
                          boxShadow: AppShadows.soft,
                        ),
                        child: Row(children: [
                          if (_isAlert(m)) const Icon(Icons.warning_amber_rounded, color: AppColors.danger, size: 16),
                          if (_isAlert(m)) const SizedBox(width: 8),
                          Expanded(child: Text(
                            DateFormat('MMM d, h:mm a').format(m.timestamp),
                            style: GoogleFonts.plusJakartaSans(fontSize: 12, color: AppColors.textSecondary),
                          )),
                          if (m.heartRate != null) _MiniStat('HR', '${m.heartRate!.toStringAsFixed(0)} bpm'),
                          if (m.spO2 != null) _MiniStat('SpO2', '${m.spO2!.toStringAsFixed(0)}%'),
                        ]),
                      )),
                    ],
                  ],
                ),
              )),
      ]),
    );
  }
}

class _MetricGrid extends StatelessWidget {
  final HealthMetric metric;
  const _MetricGrid({required this.metric});

  @override
  Widget build(BuildContext context) {
    final items = <_MetricItem>[
      if (metric.heartRate != null) _MetricItem(
        label: 'Heart Rate', value: metric.heartRate!.toStringAsFixed(0), unit: 'bpm',
        icon: Icons.favorite_outline_rounded,
        alert: metric.heartRate! > 120 || metric.heartRate! < 40,
      ),
      if (metric.spO2 != null) _MetricItem(
        label: 'Blood Oxygen', value: metric.spO2!.toStringAsFixed(0), unit: '%',
        icon: Icons.water_drop_outlined,
        alert: metric.spO2! < 94,
      ),
      if (metric.steps != null) _MetricItem(
        label: 'Steps', value: metric.steps!.toStringAsFixed(0), unit: 'steps',
        icon: Icons.directions_walk_outlined,
      ),
      if (metric.temperature != null) _MetricItem(
        label: 'Temperature', value: metric.temperature!.toStringAsFixed(1), unit: '°C',
        icon: Icons.thermostat_outlined,
        alert: metric.temperature! > 38.5,
      ),
      if (metric.systolic != null) _MetricItem(
        label: 'Blood Pressure',
        value: '${metric.systolic!.toStringAsFixed(0)}/${metric.diastolic?.toStringAsFixed(0) ?? '?'}',
        unit: 'mmHg',
        icon: Icons.monitor_heart_outlined,
        alert: metric.systolic! > 140,
      ),
      if (metric.sleepHours != null) _MetricItem(
        label: 'Sleep', value: metric.sleepHours!.toStringAsFixed(1), unit: 'hrs',
        icon: Icons.bedtime_outlined,
      ),
    ];

    return GridView.count(
      crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 10, mainAxisSpacing: 10, childAspectRatio: 1.4,
      children: items.map((item) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white, borderRadius: BorderRadius.circular(16),
          border: item.alert ? Border.all(color: AppColors.danger.withValues(alpha:0.5)) : null,
          boxShadow: AppShadows.soft,
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Icon(item.icon, size: 18, color: item.alert ? AppColors.danger : const Color(0xFF059669)),
            if (item.alert) const Icon(Icons.warning_amber_rounded, size: 14, color: AppColors.danger),
          ]),
          const Spacer(),
          Text(item.value, style: GoogleFonts.plusJakartaSans(
            fontSize: 22, fontWeight: FontWeight.w800,
            color: item.alert ? AppColors.danger : AppColors.textPrimary,
          )),
          Text(item.unit, style: GoogleFonts.plusJakartaSans(fontSize: 10, color: AppColors.textMuted)),
          Text(item.label, style: GoogleFonts.plusJakartaSans(fontSize: 11, color: AppColors.textSecondary)),
        ]),
      )).toList(),
    );
  }
}

class _MetricItem {
  final String label, value, unit;
  final IconData icon;
  final bool alert;
  const _MetricItem({required this.label, required this.value, required this.unit, required this.icon, this.alert = false});
}

class _MiniStat extends StatelessWidget {
  final String label, value;
  const _MiniStat(this.label, this.value);

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(left: 8),
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(color: AppColors.primaryLight, borderRadius: BorderRadius.circular(6)),
    child: Text('$label: $value', style: GoogleFonts.plusJakartaSans(
      fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.primary,
    )),
  );
}
