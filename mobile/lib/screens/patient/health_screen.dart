import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../config/constants.dart';
import '../../models/models.dart';
import '../../services/api_service.dart';
import '../../services/background_sync_service.dart';
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
  bool _autoSync = false;
  DateTime? _lastSync;

  @override
  void initState() {
    super.initState();
    _load();
    _loadAutoSyncState();
  }

  Future<void> _loadAutoSyncState() async {
    final enabled = await BackgroundSyncService.isEnabled();
    final last    = await BackgroundSyncService.lastSyncTime();
    if (mounted) setState(() { _autoSync = enabled; _lastSync = last; });
  }

  Future<void> _toggleAutoSync(bool value) async {
    if (value) {
      final granted = await HealthConnectService.requestPermissions();
      if (!granted) {
        setState(() => _syncMsg = 'Health Connect permission required for auto-sync.');
        return;
      }
      await BackgroundSyncService.enable();
    } else {
      await BackgroundSyncService.disable();
    }
    if (mounted) setState(() => _autoSync = value);
  }

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
        await BackgroundSyncService.recordSync();
        final last = await BackgroundSyncService.lastSyncTime();
        setState(() {
          _syncMsg = 'Synced ${payload.length} metric(s) from your watch.';
          _lastSync = last;
        });
        await _load();
      }
    } catch (e) {
      setState(() => _syncMsg = e.toString().replaceAll('Exception: ', ''));
    } finally {
      setState(() => _syncing = false);
    }
  }

  String _timeAgo(DateTime t) {
    final diff = DateTime.now().difference(t);
    if (diff.inMinutes < 1)  return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24)   return '${diff.inHours}h ago';
    return DateFormat('MMM d, h:mm a').format(t);
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
        // Auto-sync toggle card
        Container(
          margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: AppShadows.soft,
          ),
          child: Row(children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: _autoSync ? const Color(0xFFD1FAE5) : const Color(0xFFF3F4F6),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(Icons.sync_rounded,
                size: 18,
                color: _autoSync ? const Color(0xFF059669) : AppColors.textMuted,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Auto-Sync', style: GoogleFonts.plusJakartaSans(
                fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary,
              )),
              Text(
                _autoSync
                  ? (_lastSync != null ? 'Last synced ${_timeAgo(_lastSync!)}' : 'Syncing every 15 minutes')
                  : 'Tap to sync automatically every 15 min',
                style: GoogleFonts.plusJakartaSans(fontSize: 11, color: AppColors.textSecondary),
              ),
            ])),
            Switch(
              value: _autoSync,
              onChanged: _toggleAutoSync,
              activeThumbColor: const Color(0xFF059669),
            ),
          ]),
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
                      Text('7-DAY TRENDS', style: GoogleFonts.plusJakartaSans(
                        fontSize: 11, fontWeight: FontWeight.w700,
                        color: AppColors.textMuted, letterSpacing: 1.2,
                      )),
                      const SizedBox(height: 12),
                      _TrendChart(metrics: _metrics.reversed.toList()),
                      const SizedBox(height: 20),
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

// ── 7-day trend chart ─────────────────────────────────────────────────────────
class _TrendChart extends StatefulWidget {
  final List<HealthMetric> metrics;
  const _TrendChart({required this.metrics});

  @override
  State<_TrendChart> createState() => _TrendChartState();
}

class _TrendChartState extends State<_TrendChart> {
  int _selected = 0; // 0=HR, 1=SpO2, 2=Steps, 3=Temp

  static const _tabs = ['Heart Rate', 'SpO₂', 'Steps', 'Temp'];
  static const _units = ['bpm', '%', 'steps', '°C'];
  static const _colors = [Color(0xFFDC2626), Color(0xFF3B5BDB), Color(0xFF059669), Color(0xFFF59E0B)];

  List<double?> get _values => widget.metrics.map((m) {
    return switch (_selected) {
      0 => m.heartRate,
      1 => m.spO2,
      2 => m.steps,
      3 => m.temperature,
      _ => null,
    };
  }).toList();

  @override
  Widget build(BuildContext context) {
    final vals = _values;
    final nonNull = vals.whereType<double>().toList();
    if (nonNull.isEmpty) {
      return Container(
        height: 160,
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: AppShadows.soft),
        child: Center(child: Text('No data yet', style: GoogleFonts.plusJakartaSans(color: AppColors.textMuted))),
      );
    }

    final minY = (nonNull.reduce((a, b) => a < b ? a : b) * 0.95).floorToDouble();
    final maxY = (nonNull.reduce((a, b) => a > b ? a : b) * 1.05).ceilToDouble();
    final color = _colors[_selected];

    final spots = <FlSpot>[];
    for (int i = 0; i < vals.length; i++) {
      if (vals[i] != null) spots.add(FlSpot(i.toDouble(), vals[i]!));
    }

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: AppShadows.soft,
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Tab pills
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(children: List.generate(_tabs.length, (i) {
            final active = _selected == i;
            return GestureDetector(
              onTap: () => setState(() => _selected = i),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                margin: const EdgeInsets.only(right: 8),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                decoration: BoxDecoration(
                  color: active ? _colors[i].withValues(alpha: 0.12) : AppColors.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: active ? _colors[i] : Colors.transparent),
                ),
                child: Text(_tabs[i], style: GoogleFonts.plusJakartaSans(
                  fontSize: 12, fontWeight: FontWeight.w700,
                  color: active ? _colors[i] : AppColors.textMuted,
                )),
              ),
            );
          })),
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 140,
          child: LineChart(LineChartData(
            minY: minY,
            maxY: maxY,
            gridData: FlGridData(
              show: true,
              drawVerticalLine: false,
              getDrawingHorizontalLine: (_) => FlLine(color: const Color(0xFFF3F4F6), strokeWidth: 1),
            ),
            borderData: FlBorderData(show: false),
            titlesData: FlTitlesData(
              leftTitles: AxisTitles(sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 36,
                getTitlesWidget: (v, _) => Text(
                  v.toStringAsFixed(_selected == 2 ? 0 : 1),
                  style: GoogleFonts.plusJakartaSans(fontSize: 9, color: AppColors.textMuted),
                ),
              )),
              bottomTitles: AxisTitles(sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (v, _) {
                  final i = v.toInt();
                  if (i < 0 || i >= widget.metrics.length) return const SizedBox.shrink();
                  return Text(
                    DateFormat('d/M').format(widget.metrics[i].timestamp),
                    style: GoogleFonts.plusJakartaSans(fontSize: 9, color: AppColors.textMuted),
                  );
                },
              )),
              topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            ),
            lineTouchData: LineTouchData(
              touchTooltipData: LineTouchTooltipData(
                getTooltipItems: (spots) => spots.map((s) => LineTooltipItem(
                  '${s.y.toStringAsFixed(_selected == 2 ? 0 : 1)} ${_units[_selected]}',
                  GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
                )).toList(),
              ),
            ),
            lineBarsData: [LineChartBarData(
              spots: spots,
              isCurved: true,
              color: color,
              barWidth: 2.5,
              dotData: FlDotData(
                getDotPainter: (_, __, _, _) => FlDotCirclePainter(
                  radius: 3, color: color, strokeWidth: 1.5, strokeColor: Colors.white,
                ),
              ),
              belowBarData: BarAreaData(
                show: true,
                gradient: LinearGradient(
                  colors: [color.withValues(alpha: 0.18), color.withValues(alpha: 0.0)],
                  begin: Alignment.topCenter, end: Alignment.bottomCenter,
                ),
              ),
            )],
          )),
        ),
        const SizedBox(height: 4),
        Text('${nonNull.length} reading${nonNull.length == 1 ? '' : 's'} · ${_units[_selected]}',
          style: GoogleFonts.plusJakartaSans(fontSize: 10, color: AppColors.textMuted)),
      ]),
    );
  }
}
