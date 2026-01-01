import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controllers/home_controller.dart';

class HomeView extends GetView<HomeController> {
  const HomeView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFBFBFC),
      appBar: AppBar(
        title: const Text(
          'SIMLY Gateway',
          style: TextStyle(
            fontWeight: FontWeight.w800,
            fontSize: 16,
            letterSpacing: -0.5,
            color: Color(0xFF1A1A1A),
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        shape: Border(
          bottom: BorderSide(color: Colors.black.withOpacity(0.05), width: 1),
        ),
        actions: [
          IconButton(
            icon: const Icon(
              Icons.tune_rounded,
              size: 20,
              color: Color(0xFF666666),
            ),
            onPressed: () => Get.toNamed('/settings'),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildStatusCard(),
            const SizedBox(height: 32),
            _buildSectionHeader('Hardware Status', Icons.sensors_outlined),
            const SizedBox(height: 16),
            _buildHardwareStats(),
            const SizedBox(height: 32),
            _buildSectionHeader('Recent Activity', Icons.bolt_outlined),
            const SizedBox(height: 16),
            _buildActivityLogs(),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 18, color: const Color(0xFF999999)),
        const SizedBox(width: 8),
        Text(
          title.toUpperCase(),
          style: const TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 11,
            letterSpacing: 0.5,
            color: Color(0xFF999999),
          ),
        ),
      ],
    );
  }

  Widget _buildStatusCard() {
    return Obx(() {
      final bool isRunning = controller.isGatewayRunning.value;
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.black.withOpacity(0.06)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: (isRunning ? Colors.green : Colors.amber).withOpacity(
                  0.08,
                ),
                shape: BoxShape.circle,
              ),
              child: Icon(
                isRunning ? Icons.podcasts_rounded : Icons.pause_rounded,
                color: isRunning ? Colors.green : Colors.amber,
                size: 24,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isRunning ? 'Gateway Active' : 'Gateway Paused',
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 17,
                      letterSpacing: -0.3,
                      color: Color(0xFF1A1A1A),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    isRunning ? 'Transmitting data' : 'Not processing messages',
                    style: TextStyle(
                      color: Colors.black.withOpacity(0.4),
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            Transform.scale(
              scale: 0.8,
              child: Switch.adaptive(
                value: isRunning,
                onChanged: (_) => controller.toggleGateway(),
                activeColor: Colors.green,
                activeTrackColor: Colors.green.withOpacity(0.2),
              ),
            ),
          ],
        ),
      );
    });
  }

  Widget _buildHardwareStats() {
    return GridView.count(
      crossAxisCount: 2,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.5,
      children: [
        Obx(
          () => _buildStatItem(
            'Battery',
            '${controller.batteryLevel.value}%',
            Icons.battery_3_bar_rounded,
            const Color(0xFF3B82F6),
          ),
        ),
        Obx(
          () => _buildStatItem(
            'Signal',
            _getSignalText(controller.signalStrength.value),
            Icons.signal_cellular_alt_rounded,
            const Color(0xFFF59E0B),
          ),
        ),
        Obx(
          () => _buildStatItem(
            'Network',
            _getConnectivityText(controller.connectivityStatus.value),
            Icons.wifi_tethering_rounded,
            const Color(0xFF8B5CF6),
          ),
        ),
        _buildStatItem(
          'SIM Slots',
          '2 Active',
          Icons.sim_card_outlined,
          const Color(0xFF10B981),
        ),
      ],
    );
  }

  String _getSignalText(int value) {
    if (value == 0) return 'No Signal';
    if (value == 1) return 'Poor';
    if (value == 2) return 'Fair';
    if (value == 3) return 'Good';
    if (value == 4) return 'Excellent';
    return 'Unknown';
  }

  String _getConnectivityText(dynamic result) {
    final String name = result.toString().split('.').last;
    if (name == 'none') return 'Offline';
    return name[0].toUpperCase() + name.substring(1);
  }

  Widget _buildStatItem(
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.black.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: color),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  color: Colors.black.withOpacity(0.35),
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  letterSpacing: -0.1,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 15,
              color: Color(0xFF1A1A1A),
              letterSpacing: -0.3,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActivityLogs() {
    return Obx(() {
      if (controller.logs.isEmpty) {
        return Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 48),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.black.withOpacity(0.05)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF3F4F6),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.history_rounded,
                  size: 24,
                  color: Color(0xFF9CA3AF),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'No activity yet',
                style: TextStyle(
                  color: Color(0xFF1A1A1A),
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Recent tasks will appear here',
                style: TextStyle(
                  color: Colors.black.withOpacity(0.3),
                  fontSize: 12,
                ),
              ),
            ],
          ),
        );
      }

      return Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.black.withOpacity(0.05)),
        ),
        clipBehavior: Clip.antiAlias,
        child: ListView.separated(
          shrinkWrap: true,
          padding: EdgeInsets.zero,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: controller.logs.length,
          separatorBuilder: (context, index) =>
              Divider(height: 1, color: Colors.black.withOpacity(0.03)),
          itemBuilder: (context, index) {
            final log = controller.logs[index];
            final bool isSent = log['status'] == 'sent';
            final DateTime time = DateTime.parse(log['time']);

            return Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color:
                          (isSent
                                  ? const Color(0xFF10B981)
                                  : const Color(0xFFEF4444))
                              .withOpacity(0.08),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      isSent ? Icons.check_rounded : Icons.close_rounded,
                      size: 14,
                      color: isSent
                          ? const Color(0xFF10B981)
                          : const Color(0xFFEF4444),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          log['to'],
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                            letterSpacing: -0.2,
                            color: Color(0xFF1A1A1A),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${time.hour}:${time.minute.toString().padLeft(2, '0')} • ${isSent ? 'Successfully sent' : 'Delivery failed'}',
                          style: TextStyle(
                            color: Colors.black.withOpacity(0.35),
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: isSent
                          ? const Color(0xFF10B981).withOpacity(0.08)
                          : const Color(0xFFEF4444).withOpacity(0.08),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      isSent ? 'SENT' : 'FAIL',
                      style: TextStyle(
                        color: isSent
                            ? const Color(0xFF10B981)
                            : const Color(0xFFEF4444),
                        fontWeight: FontWeight.w800,
                        fontSize: 9,
                        letterSpacing: 0.2,
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      );
    });
  }
}
