import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../config/constants.dart';
import '../../models/models.dart';
import '../../services/api_service.dart';

class PatientHealthDataScreen extends StatefulWidget {
  final String patientId;
  final String patientName;

  const PatientHealthDataScreen({
    super.key,
    required this.patientId,
    required this.patientName,
  });

  @override
  State<PatientHealthDataScreen> createState() => _PatientHealthDataScreenState();
}

class _PatientHealthDataScreenState extends State<PatientHealthDataScreen> {
  List<HealthMetric> _metrics = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      _metrics = await ApiService.getPatientHealthMetrics(widget.patientId);
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
    }
    if (mounted) setState(() => _loading = false);
  }

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
              Text('PATIENT VITALS', style: GoogleFonts.plusJakartaSans(
                fontSize: 11, fontWeight: FontWeight.w700,
                color: Colors.white.withValues(alpha: 0.7), letterSpacing: 1.5,
              )),
              Text(widget.patientName, style: GoogleFonts.plusJakartaSans(
                fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white,
              )),
            ])),
            IconButton(onPressed: _load, icon: const Icon(Icons.refresh_rounded, color: Colors.white)),
          ]),
        ),
        Expanded(child: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _error != null
            ? Center(child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.error_outline, color: AppColors.danger, size: 48),
                  const SizedBox(height: 12),
                  Text(_error!, textAlign: TextAlign.center,
                    style: GoogleFonts.plusJakartaSans(fontSize: 14, color: AppColors.textSecondary)),
                  const SizedBox(height: 16),
                  TextButton(onPressed: _load, child: const Text('Retry')),
                ]),
              ))
            : _metrics.isEmpty
              ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Icon(Icons.monitor_heart_outlined, size: 64, color: AppColors.textMuted.withValues(alpha: 0.4)),
                  const SizedBox(height: 16),
                  Text('No health data yet', style: GoogleFonts.plusJakartaSans(
                    fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textSecondary)),
                  const SizedBox(height: 6),
                  Text('Patient hasn\'t synced from Health Connect',
                    style: GoogleFonts.plusJakartaSans(fontSize: 13, color: AppColors.textMuted)),
                ]))
              : ListView(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 40),
                  children: [
                    _LatestSummary(metrics: _metrics),
                    const SizedBox(height: 24),
                    Text('Recent Readings', style: GoogleFonts.plusJakartaSans(
                      fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textPrimary,
                    )),
                    const SizedBox(height: 12),
                    ..._metrics.map((m) => _MetricCard(metric: m)),
                  ],
                ),
        ),
      ]),
    );
  }
}

// ── Latest vitals summary grid ────────────────────────────────────────────────
class _LatestSummary extends StatelessWidget {
  final List<HealthMetric> metrics;
  const _LatestSummary({required this.metrics});

  @override
  Widget build(BuildContext context) {
    final latest = metrics.first;
    final chips = <_VitalChip>[];
    if (latest.heartRate != null) {
      chips.add(_VitalChip(icon: Icons.favorite_rounded, color: const Color(0xFFEF4444),
        label: 'Heart Rate', value: '${latest.heartRate!.round()}', unit: 'bpm'));
    }
    if (latest.spO2 != null) {
      chips.add(_VitalChip(icon: Icons.water_drop_rounded, color: const Color(0xFF3B82F6),
        label: 'SpO₂', value: '${latest.spO2!.round()}', unit: '%'));
    }
    if (latest.steps != null) {
      chips.add(_VitalChip(icon: Icons.directions_walk_rounded, color: const Color(0xFF10B981),
        label: 'Steps', value: _fmt(latest.steps!), unit: 'today'));
    }
    if (latest.temperature != null) {
      chips.add(_VitalChip(icon: Icons.thermostat_rounded, color: const Color(0xFFF59E0B),
        label: 'Temp', value: latest.temperature!.toStringAsFixed(1), unit: '°C'));
    }
    if (latest.systolic != null && latest.diastolic != null) {
      chips.add(_VitalChip(icon: Icons.speed_rounded, color: const Color(0xFF8B5CF6),
        label: 'BP', value: '${latest.systolic!.round()}/${latest.diastolic!.round()}', unit: 'mmHg'));
    }
    if (latest.sleepHours != null) {
      chips.add(_VitalChip(icon: Icons.bedtime_rounded, color: const Color(0xFF6366F1),
        label: 'Sleep', value: latest.sleepHours!.toStringAsFixed(1), unit: 'hrs'));
    }
    if (chips.isEmpty) return const SizedBox.shrink();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('Latest Vitals', style: GoogleFonts.plusJakartaSans(
        fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textPrimary,
      )),
      const SizedBox(height: 12),
      GridView.count(
        crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
        childAspectRatio: 1.7, mainAxisSpacing: 10, crossAxisSpacing: 10,
        children: chips,
      ),
    ]);
  }

  static String _fmt(double v) =>
      v >= 1000 ? '${(v / 1000).toStringAsFixed(1)}k' : v.round().toString();
}

class _VitalChip extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label, value, unit;

  const _VitalChip({
    required this.icon, required this.color,
    required this.label, required this.value, required this.unit,
  });

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: Colors.white, borderRadius: BorderRadius.circular(16),
      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 8, offset: const Offset(0, 2))],
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(9),
        ),
        child: Icon(icon, color: color, size: 16),
      ),
      const Spacer(),
      Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
        Flexible(child: Text(value, style: GoogleFonts.plusJakartaSans(
          fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.textPrimary,
        ))),
        const SizedBox(width: 3),
        Padding(
          padding: const EdgeInsets.only(bottom: 2),
          child: Text(unit, style: GoogleFonts.plusJakartaSans(fontSize: 11, color: AppColors.textSecondary)),
        ),
      ]),
      Text(label, style: GoogleFonts.plusJakartaSans(
        fontSize: 10, color: AppColors.textMuted, fontWeight: FontWeight.w600,
      )),
    ]),
  );
}

// ── Individual metric reading card ────────────────────────────────────────────
class _MetricCard extends StatelessWidget {
  final HealthMetric metric;
  const _MetricCard({required this.metric});

  @override
  Widget build(BuildContext context) {
    final date = DateFormat('MMM d, y · h:mm a').format(metric.timestamp);
    final rows = <_Row>[];
    if (metric.heartRate != null)  rows.add(_Row('Heart Rate', '${metric.heartRate!.round()} bpm', Icons.favorite_rounded, const Color(0xFFEF4444)));
    if (metric.spO2 != null)       rows.add(_Row('SpO₂', '${metric.spO2!.round()}%', Icons.water_drop_rounded, const Color(0xFF3B82F6)));
    if (metric.steps != null)      rows.add(_Row('Steps', '${metric.steps!.round()}', Icons.directions_walk_rounded, const Color(0xFF10B981)));
    if (metric.temperature != null) rows.add(_Row('Temperature', '${metric.temperature!.toStringAsFixed(1)} °C', Icons.thermostat_rounded, const Color(0xFFF59E0B)));
    if (metric.systolic != null && metric.diastolic != null) {
      rows.add(_Row('Blood Pressure', '${metric.systolic!.round()}/${metric.diastolic!.round()} mmHg', Icons.speed_rounded, const Color(0xFF8B5CF6)));
    }
    if (metric.sleepHours != null) rows.add(_Row('Sleep', '${metric.sleepHours!.toStringAsFixed(1)} hrs', Icons.bedtime_rounded, const Color(0xFF6366F1)));
    if (rows.isEmpty) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(date, style: GoogleFonts.plusJakartaSans(
          fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.w600,
        )),
        const SizedBox(height: 10),
        ...rows.map((r) => Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: r.color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(r.icon, color: r.color, size: 14),
            ),
            const SizedBox(width: 10),
            Expanded(child: Text(r.label, style: GoogleFonts.plusJakartaSans(
              fontSize: 12, color: AppColors.textSecondary,
            ))),
            Text(r.value, style: GoogleFonts.plusJakartaSans(
              fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary,
            )),
          ]),
        )),
      ]),
    );
  }
}

class _Row {
  final String label, value;
  final IconData icon;
  final Color color;
  const _Row(this.label, this.value, this.icon, this.color);
}
