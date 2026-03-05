import 'package:flutter/material.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';
import 'shared_widgets.dart';

class TopPanelWidget extends StatelessWidget {
  final bool isConnected;
  final AgentStatus? agentStatus;
  final VoidCallback onOpenSettings;
  final VoidCallback onOpenSidebar;

  const TopPanelWidget({
    super.key,
    required this.isConnected,
    required this.agentStatus,
    required this.onOpenSettings,
    required this.onOpenSidebar,
  });

  @override
  Widget build(BuildContext context) {
    final provider = agentStatus?.provider ?? '—';
    final model = agentStatus?.model ?? '—';
    final isWide = MediaQuery.of(context).size.width >= 768;

    return GlassPanel(
      borderRadius: BorderRadius.circular(12),
      child: SizedBox(
        height: isWide ? 64 : 56,
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: isWide ? 24 : 12),
          child: Row(
            children: [
              // Left — hamburger (mobile) + branding
              Row(
                children: [
                  if (!isWide)
                    _IconBtn(icon: Icons.menu_rounded, onTap: onOpenSidebar),
                  if (!isWide) const SizedBox(width: 4),
                  // Logo icon
                  Container(
                    width: isWide ? 36 : 32,
                    height: isWide ? 36 : 32,
                    decoration: BoxDecoration(
                      gradient: AppTheme.accentGradient,
                      borderRadius: BorderRadius.circular(8),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.accentPrimary.withOpacity(0.3),
                          blurRadius: 10,
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.nights_stay_rounded,
                      color: Colors.white,
                      size: 16,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      GradientText(
                        'Lunar Studio',
                        style: TextStyle(
                          fontSize: isWide ? 13 : 12,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.5,
                        ),
                      ),
                      Text(
                        'AI AGENT',
                        style: TextStyle(
                          fontSize: 9,
                          color: AppTheme.textMuted,
                          letterSpacing: 2,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              // Center — status pills (wide only)
              if (isWide) ...[
                const Spacer(),
                _StatusPill(isConnected: isConnected),
                const SizedBox(width: 8),
                _ProviderPill(provider: provider, onTap: onOpenSettings),
                const SizedBox(width: 8),
                _ModelPill(model: model),
                const Spacer(),
              ] else
                const Spacer(),

              // Right — actions
              Row(
                children: [
                  // Connection dot (mobile only)
                  if (!isWide) ...[
                    StatusDot(isOnline: isConnected, size: 8),
                    const SizedBox(width: 8),
                  ],
                  // WiFi badge (wide only)
                  if (isWide) ...[
                    _WifiBadge(isConnected: isConnected),
                    const SizedBox(width: 8),
                    _IconBtn(
                      icon: Icons.notifications_none_rounded,
                      onTap: () {},
                    ),
                    const SizedBox(width: 4),
                  ],
                  _IconBtn(
                    icon: Icons.settings_outlined,
                    onTap: onOpenSettings,
                  ),
                  const SizedBox(width: 8),
                  // Avatar
                  Container(
                    width: isWide ? 36 : 32,
                    height: isWide ? 36 : 32,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: [
                          AppTheme.accentPrimary.withOpacity(0.3),
                          AppTheme.accentSecondary.withOpacity(0.3),
                        ],
                      ),
                      border: Border.all(color: AppTheme.borderDefault),
                    ),
                    child: Center(
                      child: Text(
                        'A',
                        style: TextStyle(
                          color: AppTheme.accentPrimaryLight,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _IconBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _IconBtn({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Icon(icon, color: AppTheme.textSecondary, size: 18),
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  final bool isConnected;
  const _StatusPill({required this.isConnected});

  @override
  Widget build(BuildContext context) {
    return PillBadge(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          StatusDot(isOnline: isConnected, size: 7),
          const SizedBox(width: 6),
          Text(
            isConnected ? 'Agent Online' : 'Disconnected',
            style: TextStyle(
              color: AppTheme.textSecondary,
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _ProviderPill extends StatelessWidget {
  final String provider;
  final VoidCallback onTap;
  const _ProviderPill({required this.provider, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return PillBadge(
      onTap: onTap,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.memory_rounded,
            color: AppTheme.accentPrimaryLight,
            size: 12,
          ),
          const SizedBox(width: 5),
          Text(
            provider,
            style: TextStyle(
              color: AppTheme.textSecondary,
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(width: 4),
          Icon(
            Icons.keyboard_arrow_down_rounded,
            color: AppTheme.textMuted,
            size: 14,
          ),
        ],
      ),
    );
  }
}

class _ModelPill extends StatelessWidget {
  final String model;
  const _ModelPill({required this.model});

  @override
  Widget build(BuildContext context) {
    return PillBadge(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.bolt_rounded, color: AppTheme.accentSecondary, size: 12),
          const SizedBox(width: 5),
          Text(
            model,
            style: TextStyle(
              color: AppTheme.textSecondary,
              fontSize: 11,
              fontFamily: 'monospace',
            ),
          ),
        ],
      ),
    );
  }
}

class _WifiBadge extends StatelessWidget {
  final bool isConnected;
  const _WifiBadge({required this.isConnected});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: isConnected
            ? AppTheme.bgTertiary.withOpacity(0.4)
            : AppTheme.danger.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.borderDefault),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isConnected ? Icons.wifi_rounded : Icons.wifi_off_rounded,
            color: isConnected ? AppTheme.success : AppTheme.danger,
            size: 12,
          ),
          const SizedBox(width: 5),
          Text(
            isConnected ? 'Connected' : 'Offline',
            style: TextStyle(color: AppTheme.textMuted, fontSize: 10),
          ),
        ],
      ),
    );
  }
}
