import 'package:flutter/material.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';
import 'shared_widgets.dart';

class SidePanelWidget extends StatefulWidget {
  final AgentStatus? agentStatus;
  final NavPage activePage;
  final ValueChanged<NavPage> onNavigate;

  const SidePanelWidget({
    super.key,
    required this.agentStatus,
    required this.activePage,
    required this.onNavigate,
  });

  @override
  State<SidePanelWidget> createState() => _SidePanelWidgetState();
}

class _SidePanelWidgetState extends State<SidePanelWidget> {
  bool _toolsExpanded = true;
  bool _chatsExpanded = true;

  static const _navItems = [
    (
      icon: Icons.chat_bubble_outline_rounded,
      label: 'Chat',
      page: NavPage.chat,
    ),
    (icon: Icons.psychology_outlined, label: 'Memory', page: NavPage.memory),
    (icon: Icons.build_outlined, label: 'Tools', page: NavPage.tools),
    (icon: Icons.receipt_long_outlined, label: 'Logs', page: NavPage.logs),
    (icon: Icons.message_outlined, label: 'Context', page: NavPage.context),
    (icon: Icons.phone_android_rounded, label: 'Apps', page: NavPage.apps),
  ];

  @override
  Widget build(BuildContext context) {
    final toolNames = widget.agentStatus?.tools ?? [];

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.bgSecondary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.borderDefault),
      ),
      child: Column(
        children: [
          // If this is shown inline (not drawer), no close header
          // Search + New Chat
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: AppTheme.bgTertiary.withOpacity(0.5),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppTheme.borderDefault),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.search_rounded,
                          color: AppTheme.textMuted,
                          size: 14,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Search...',
                          style: TextStyle(
                            color: AppTheme.textMuted,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppTheme.accentPrimary.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: AppTheme.accentPrimary.withOpacity(0.2),
                    ),
                  ),
                  child: Icon(
                    Icons.add_rounded,
                    color: AppTheme.accentPrimaryLight,
                    size: 14,
                  ),
                ),
              ],
            ),
          ),

          // Navigation
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Column(
              children: _navItems.map((item) {
                final isActive = widget.activePage == item.page;
                return _NavItem(
                  icon: item.icon,
                  label: item.label,
                  isActive: isActive,
                  onTap: () => widget.onNavigate(item.page),
                );
              }).toList(),
            ),
          ),

          // Divider
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Divider(color: AppTheme.borderDefault, height: 1),
          ),

          // Scrollable content
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                children: [
                  // Recent Chats
                  _SectionHeader(
                    label: 'Recent',
                    trailingIcon: Icons.access_time_rounded,
                    expanded: _chatsExpanded,
                    onToggle: () =>
                        setState(() => _chatsExpanded = !_chatsExpanded),
                  ),
                  if (_chatsExpanded)
                    _ChatItem(
                      label: 'Current Session',
                      onTap: () => widget.onNavigate(NavPage.chat),
                    ),

                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 4,
                    ),
                    child: Divider(color: AppTheme.borderDefault, height: 1),
                  ),

                  // Tools
                  _SectionHeader(
                    label: 'Tools',
                    trailingIcon: Icons.auto_awesome_rounded,
                    expanded: _toolsExpanded,
                    onToggle: () =>
                        setState(() => _toolsExpanded = !_toolsExpanded),
                  ),
                  if (_toolsExpanded) ...[
                    if (toolNames.isEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                        child: Text(
                          'Connecting...',
                          style: TextStyle(
                            color: AppTheme.textMuted,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ...toolNames.map((name) => _ToolItem(name: name)),
                  ],
                ],
              ),
            ),
          ),

          // Bottom — WhatsApp status
          _WhatsAppStatus(agentStatus: widget.agentStatus),
        ],
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;
  final VoidCallback onTap;

  const _NavItem({
    required this.icon,
    required this.label,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(bottom: 2),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        decoration: BoxDecoration(
          color: isActive
              ? AppTheme.accentPrimary.withOpacity(0.12)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isActive
                ? AppTheme.accentPrimary.withOpacity(0.15)
                : Colors.transparent,
          ),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              size: 16,
              color:
                  isActive ? AppTheme.accentPrimaryLight : AppTheme.textMuted,
            ),
            const SizedBox(width: 10),
            Text(
              label,
              style: TextStyle(
                color: isActive
                    ? AppTheme.accentPrimaryLight
                    : AppTheme.textSecondary,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String label;
  final IconData trailingIcon;
  final bool expanded;
  final VoidCallback onToggle;

  const _SectionHeader({
    required this.label,
    required this.trailingIcon,
    required this.expanded,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onToggle,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(
          children: [
            AnimatedRotation(
              turns: expanded ? 0.25 : 0,
              duration: const Duration(milliseconds: 200),
              child: Icon(
                Icons.chevron_right_rounded,
                color: AppTheme.textMuted,
                size: 13,
              ),
            ),
            const SizedBox(width: 6),
            Text(
              label.toUpperCase(),
              style: TextStyle(
                color: AppTheme.textMuted,
                fontSize: 10,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.5,
              ),
            ),
            const Spacer(),
            Icon(trailingIcon, color: AppTheme.textMuted, size: 11),
          ],
        ),
      ),
    );
  }
}

class _ChatItem extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _ChatItem({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(
          children: [
            Icon(Icons.tag_rounded, color: AppTheme.textMuted, size: 13),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  color: AppTheme.textSecondary,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            Icon(
              Icons.star_rounded,
              color: AppTheme.warning.withOpacity(0.6),
              size: 11,
            ),
          ],
        ),
      ),
    );
  }
}

class _ToolItem extends StatelessWidget {
  final String name;
  const _ToolItem({required this.name});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Icon(Icons.build_outlined, color: AppTheme.textMuted, size: 13),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              name,
              style: TextStyle(
                color: AppTheme.textSecondary,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: AppTheme.success.withOpacity(0.7),
              shape: BoxShape.circle,
            ),
          ),
        ],
      ),
    );
  }
}

class _WhatsAppStatus extends StatelessWidget {
  final AgentStatus? agentStatus;
  const _WhatsAppStatus({required this.agentStatus});

  @override
  Widget build(BuildContext context) {
    final isConnected = agentStatus?.whatsapp == 'connected';
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: AppTheme.borderDefault)),
      ),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: AppTheme.bgTertiary.withOpacity(0.4),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppTheme.borderDefault),
        ),
        child: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: isConnected
                    ? AppTheme.success.withOpacity(0.1)
                    : AppTheme.textMuted.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.phone_android_rounded,
                size: 14,
                color: isConnected ? AppTheme.success : AppTheme.textMuted,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'WhatsApp',
                    style: TextStyle(
                      color: AppTheme.textPrimary,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  Text(
                    isConnected ? 'Connected' : 'Disabled',
                    style: TextStyle(
                      color:
                          isConnected ? AppTheme.success : AppTheme.textMuted,
                      fontSize: 10,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            if (isConnected) StatusDot(isOnline: true, size: 7),
          ],
        ),
      ),
    );
  }
}
