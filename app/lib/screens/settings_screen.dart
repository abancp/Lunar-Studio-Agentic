import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../providers/agent_provider.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late TextEditingController _urlController;
  bool _saved = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final agent = context.read<AgentProvider>();
    _urlController = TextEditingController(text: agent.serverUrl);
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  void _save() {
    final url = _urlController.text.trim();
    if (url.isEmpty) {
      setState(() => _error = 'URL cannot be empty');
      return;
    }
    if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
      setState(() => _error = 'URL must start with ws:// or wss://');
      return;
    }
    setState(() {
      _error = null;
      _saved = true;
    });
    context.read<AgentProvider>().setServerUrl(url);
    Future.delayed(const Duration(milliseconds: 600), () {
      if (mounted) Navigator.pop(context);
    });
  }

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.of(context).size.width >= 640;

    return Scaffold(
      backgroundColor: Colors.black.withOpacity(0.7),
      body: Center(
        child: Container(
          width: isWide ? 520 : double.infinity,
          margin: isWide
              ? const EdgeInsets.all(24)
              : const EdgeInsets.fromLTRB(12, 40, 12, 12),
          decoration: BoxDecoration(
            color: AppTheme.bgSecondary,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppTheme.borderDefault),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.5),
                blurRadius: 40,
                spreadRadius: 2,
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Container(
                padding: const EdgeInsets.fromLTRB(24, 20, 16, 20),
                decoration: BoxDecoration(
                  border:
                      Border(bottom: BorderSide(color: AppTheme.borderDefault)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: AppTheme.accentPrimary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                            color: AppTheme.accentPrimary.withOpacity(0.2)),
                      ),
                      child: Icon(Icons.settings_outlined,
                          color: AppTheme.accentPrimaryLight, size: 16),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Settings',
                          style: TextStyle(
                            color: AppTheme.textPrimary,
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Text(
                          'Configure your agent connection',
                          style: TextStyle(
                              color: AppTheme.textMuted, fontSize: 11),
                        ),
                      ],
                    ),
                    const Spacer(),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: Icon(Icons.close_rounded,
                          color: AppTheme.textSecondary, size: 18),
                    ),
                  ],
                ),
              ),

              // Content
              Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Section: Server URL
                    _SectionTitle(
                        icon: Icons.cable_rounded, label: 'Server Connection'),
                    const SizedBox(height: 12),

                    // Info box
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppTheme.accentSecondary.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                            color: AppTheme.accentSecondary.withOpacity(0.15)),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.info_outline_rounded,
                              color: AppTheme.accentSecondary, size: 14),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Enter the WebSocket server URL',
                                  style: TextStyle(
                                    color: AppTheme.textPrimary,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                const SizedBox(height: 3),
                                RichText(
                                  text: TextSpan(
                                    style: TextStyle(
                                        color: AppTheme.textMuted,
                                        fontSize: 11,
                                        height: 1.5),
                                    children: const [
                                      TextSpan(text: 'This is the '),
                                      TextSpan(
                                        text: 'backend WebSocket port',
                                        style:
                                            TextStyle(color: Color(0xFF00D2FF)),
                                      ),
                                      TextSpan(
                                          text:
                                              ' (not the web UI port).\nDefault server port is '),
                                      TextSpan(
                                        text: '3210',
                                        style: TextStyle(
                                          fontFamily: 'monospace',
                                          color: Color(0xFFA78BFA),
                                        ),
                                      ),
                                      TextSpan(text: '.'),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // URL Label
                    Text(
                      'WebSocket URL',
                      style: TextStyle(
                        color: AppTheme.textSecondary,
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        letterSpacing: 0.3,
                      ),
                    ),
                    const SizedBox(height: 6),

                    // URL Input
                    Container(
                      decoration: BoxDecoration(
                        color: AppTheme.bgTertiary.withOpacity(0.5),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: _error != null
                              ? AppTheme.danger.withOpacity(0.4)
                              : AppTheme.borderDefault,
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 14),
                            decoration: BoxDecoration(
                              border: Border(
                                right:
                                    BorderSide(color: AppTheme.borderDefault),
                              ),
                            ),
                            child: Icon(Icons.link_rounded,
                                color: AppTheme.textMuted, size: 15),
                          ),
                          Expanded(
                            child: TextField(
                              controller: _urlController,
                              onChanged: (_) => setState(() => _error = null),
                              style: TextStyle(
                                color: AppTheme.textPrimary,
                                fontSize: 13,
                                fontFamily: 'monospace',
                              ),
                              decoration: InputDecoration(
                                hintText: 'ws://192.168.1.x:3210',
                                hintStyle: TextStyle(
                                    color: AppTheme.textMuted,
                                    fontFamily: 'monospace',
                                    fontSize: 13),
                                border: InputBorder.none,
                                contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 14),
                              ),
                              inputFormatters: [
                                FilteringTextInputFormatter.deny(RegExp(r'\s')),
                              ],
                            ),
                          ),
                          // Clear button
                          if (_urlController.text.isNotEmpty)
                            IconButton(
                              onPressed: () {
                                _urlController.clear();
                                setState(() {});
                              },
                              icon: Icon(Icons.clear_rounded,
                                  color: AppTheme.textMuted, size: 15),
                              splashRadius: 16,
                            ),
                        ],
                      ),
                    ),

                    if (_error != null) ...[
                      const SizedBox(height: 6),
                      Row(children: [
                        Icon(Icons.error_outline_rounded,
                            color: AppTheme.danger, size: 12),
                        const SizedBox(width: 4),
                        Text(_error!,
                            style: TextStyle(
                                color: AppTheme.danger, fontSize: 11)),
                      ]),
                    ],

                    const SizedBox(height: 6),

                    // Example hints
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: [
                        _ExampleChip(
                          label: 'Local',
                          url: 'ws://localhost:3210',
                          onTap: (url) {
                            _urlController.text = url;
                            setState(() {});
                          },
                        ),
                        _ExampleChip(
                          label: 'LAN',
                          url: 'ws://192.168.1.x:3210',
                          onTap: (url) {
                            _urlController.text = url;
                            setState(() {});
                          },
                        ),
                        _ExampleChip(
                          label: 'Secure',
                          url: 'wss://yourdomain.com:3210',
                          onTap: (url) {
                            _urlController.text = url;
                            setState(() {});
                          },
                        ),
                      ],
                    ),

                    const SizedBox(height: 28),

                    // Action buttons
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => Navigator.pop(context),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppTheme.textSecondary,
                              side: BorderSide(color: AppTheme.borderDefault),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                            child: const Text('Cancel',
                                style: TextStyle(fontSize: 13)),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          flex: 2,
                          child: ElevatedButton(
                            onPressed: _save,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _saved
                                  ? AppTheme.success
                                  : AppTheme.accentPrimary,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                              elevation: 0,
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  _saved
                                      ? Icons.check_rounded
                                      : Icons.save_rounded,
                                  size: 15,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  _saved ? 'Saved!' : 'Save & Connect',
                                  style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 20),

                    // Connection status
                    Consumer<AgentProvider>(
                      builder: (_, agent, __) => Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: agent.isConnected
                              ? AppTheme.success.withOpacity(0.05)
                              : AppTheme.danger.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: agent.isConnected
                                ? AppTheme.success.withOpacity(0.2)
                                : AppTheme.danger.withOpacity(0.2),
                          ),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 7,
                              height: 7,
                              decoration: BoxDecoration(
                                color: agent.isConnected
                                    ? AppTheme.success
                                    : AppTheme.danger,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                agent.isConnected
                                    ? 'Connected to ${agent.serverUrl}'
                                    : 'Disconnected — trying ${agent.serverUrl}',
                                style: TextStyle(
                                  color: agent.isConnected
                                      ? AppTheme.success
                                      : AppTheme.textMuted,
                                  fontSize: 11,
                                  fontFamily: 'monospace',
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final IconData icon;
  final String label;
  const _SectionTitle({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: AppTheme.accentPrimaryLight, size: 14),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(
            color: AppTheme.textSecondary,
            fontSize: 12,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.3,
          ),
        ),
      ],
    );
  }
}

class _ExampleChip extends StatelessWidget {
  final String label;
  final String url;
  final ValueChanged<String> onTap;

  const _ExampleChip(
      {required this.label, required this.url, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onTap(url),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: AppTheme.bgTertiary.withOpacity(0.5),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: AppTheme.borderDefault),
        ),
        child: RichText(
          text: TextSpan(
            style: TextStyle(fontSize: 10, fontFamily: 'monospace'),
            children: [
              TextSpan(
                  text: '$label: ',
                  style: TextStyle(color: AppTheme.textMuted)),
              TextSpan(
                  text: url,
                  style: TextStyle(color: AppTheme.accentPrimaryLight)),
            ],
          ),
        ),
      ),
    );
  }
}
