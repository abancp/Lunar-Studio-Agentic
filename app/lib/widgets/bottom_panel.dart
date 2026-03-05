import 'package:flutter/material.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';

class BottomPanelWidget extends StatefulWidget {
  final ValueChanged<String> onSend;
  final VoidCallback onStop;
  final bool isGenerating;
  final bool isConnected;
  final AgentStatus? agentStatus;

  const BottomPanelWidget({
    super.key,
    required this.onSend,
    required this.onStop,
    required this.isGenerating,
    required this.isConnected,
    required this.agentStatus,
  });

  @override
  State<BottomPanelWidget> createState() => _BottomPanelWidgetState();
}

class _BottomPanelWidgetState extends State<BottomPanelWidget> {
  final TextEditingController _controller = TextEditingController();
  bool _hasText = false;

  @override
  void initState() {
    super.initState();
    _controller.addListener(
      () => setState(() => _hasText = _controller.text.trim().isNotEmpty),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handleSend() {
    if (!_hasText || !widget.isConnected) return;
    widget.onSend(_controller.text.trim());
    _controller.clear();
  }

  @override
  Widget build(BuildContext context) {
    final model = widget.agentStatus?.model ?? '—';
    final toolCount = widget.agentStatus?.tools.length ?? 0;
    final isWide = MediaQuery.of(context).size.width >= 600;

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: isWide ? 24 : 12,
        vertical: isWide ? 20 : 12,
      ),
      decoration: BoxDecoration(
        color: AppTheme.bgSecondary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.borderDefault),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Input Row
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              // Attachment — wide only
              if (isWide) ...[
                _ActionButton(icon: Icons.attach_file_rounded, onTap: () {}),
                const SizedBox(width: 12),
              ],

              // Text input
              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    color: AppTheme.bgTertiary.withOpacity(0.6),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppTheme.borderDefault),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxHeight: 128),
                          child: TextField(
                            controller: _controller,
                            onSubmitted: (_) => _handleSend(),
                            maxLines: null,
                            enabled: widget.isConnected,
                            style: TextStyle(
                              color: AppTheme.textPrimary,
                              fontSize: 13,
                            ),
                            decoration: InputDecoration(
                              hintText: widget.isConnected
                                  ? 'Message Lunar Studio...'
                                  : 'Connecting to agent...',
                              hintStyle: TextStyle(
                                color: AppTheme.textMuted,
                                fontSize: 13,
                              ),
                              border: InputBorder.none,
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 14,
                              ),
                            ),
                          ),
                        ),
                      ),

                      // Right action buttons inside input
                      Padding(
                        padding: const EdgeInsets.fromLTRB(0, 0, 8, 8),
                        child: Row(
                          children: [
                            // Mic — wide only
                            if (isWide)
                              _SmallIconBtn(
                                icon: Icons.mic_none_rounded,
                                onTap: () {},
                              ),

                            const SizedBox(width: 4),

                            // Send / Stop
                            if (widget.isGenerating)
                              _SendBtn(
                                icon: Icons.stop_circle_outlined,
                                color: AppTheme.danger.withOpacity(0.15),
                                iconColor: AppTheme.danger,
                                onTap: widget.onStop,
                              )
                            else
                              _SendBtn(
                                icon: Icons.send_rounded,
                                color: (_hasText && widget.isConnected)
                                    ? AppTheme.accentPrimary
                                    : AppTheme.bgHover,
                                iconColor: (_hasText && widget.isConnected)
                                    ? Colors.white
                                    : AppTheme.textMuted,
                                onTap: _handleSend,
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          // Bottom status bar
          const SizedBox(height: 10),
          _BottomBar(
            model: model,
            toolCount: toolCount,
            isGenerating: widget.isGenerating,
            isWide: isWide,
          ),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _ActionButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Icon(icon, color: AppTheme.textMuted, size: 20),
      ),
    );
  }
}

class _SmallIconBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _SmallIconBtn({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Icon(icon, color: AppTheme.textMuted, size: 17),
      ),
    );
  }
}

class _SendBtn extends StatelessWidget {
  final IconData icon;
  final Color color;
  final Color iconColor;
  final VoidCallback onTap;

  const _SendBtn({
    required this.icon,
    required this.color,
    required this.iconColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(10),
          boxShadow: color == AppTheme.accentPrimary
              ? [
                  BoxShadow(
                    color: AppTheme.accentPrimary.withOpacity(0.2),
                    blurRadius: 8,
                  ),
                ]
              : null,
        ),
        child: Icon(icon, color: iconColor, size: 16),
      ),
    );
  }
}

class _BottomBar extends StatelessWidget {
  final String model;
  final int toolCount;
  final bool isGenerating;
  final bool isWide;

  const _BottomBar({
    required this.model,
    required this.toolCount,
    required this.isGenerating,
    required this.isWide,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        // Left
        if (isGenerating) ...[
          _DotsRow(),
          const SizedBox(width: 8),
          Text(
            'Generating...',
            style: TextStyle(
              color: AppTheme.accentPrimaryLight,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ] else ...[
          Icon(Icons.auto_awesome_rounded, color: AppTheme.textMuted, size: 13),
          const SizedBox(width: 6),
          ConstrainedBox(
            constraints: BoxConstraints(
              maxWidth: isWide ? double.infinity : 120,
            ),
            child: Text(
              model,
              style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (isWide) ...[
            Text(
              '  ·  ',
              style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
            ),
            Text(
              '$toolCount tools active',
              style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
            ),
          ],
        ],
        const Spacer(),

        // Keyboard shortcuts — wide only
        if (isWide) ...[
          _Kbd(label: '⏎', hint: 'Send'),
          const SizedBox(width: 12),
          _Kbd(label: 'Shift+⏎', hint: 'New line'),
          const SizedBox(width: 12),
          _Kbd(label: '⌘K', hint: 'Commands'),
        ],
      ],
    );
  }
}

class _DotsRow extends StatefulWidget {
  @override
  State<_DotsRow> createState() => _DotsRowState();
}

class _DotsRowState extends State<_DotsRow>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (_, __) => Row(
        children: List.generate(3, (i) {
          final delay = i * 0.33;
          final t = (_ctrl.value - delay).clamp(0.0, 1.0);
          final bounce = (t < 0.5 ? t * 2 : (1.0 - t) * 2);
          return Container(
            margin: const EdgeInsets.symmetric(horizontal: 1.5),
            width: 5,
            height: 5,
            decoration: BoxDecoration(
              color: AppTheme.accentPrimary,
              shape: BoxShape.circle,
            ),
            transform: Matrix4.translationValues(0, -3 * bounce, 0),
          );
        }),
      ),
    );
  }
}

class _Kbd extends StatelessWidget {
  final String label;
  final String hint;
  const _Kbd({required this.label, required this.hint});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 3),
          decoration: BoxDecoration(
            color: AppTheme.bgTertiary.withOpacity(0.4),
            borderRadius: BorderRadius.circular(4),
            border: Border.all(color: AppTheme.borderDefault),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: AppTheme.textMuted,
              fontSize: 9,
              fontFamily: 'monospace',
            ),
          ),
        ),
        const SizedBox(width: 4),
        Text(hint, style: TextStyle(color: AppTheme.textMuted, fontSize: 10)),
      ],
    );
  }
}
