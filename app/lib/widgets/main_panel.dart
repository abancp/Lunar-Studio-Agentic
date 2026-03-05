import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';
import 'shared_widgets.dart';

class MainPanelWidget extends StatefulWidget {
  final List<ChatMessage> messages;
  final bool isGenerating;
  final AgentStatus? agentStatus;

  const MainPanelWidget({
    super.key,
    required this.messages,
    required this.isGenerating,
    required this.agentStatus,
  });

  @override
  State<MainPanelWidget> createState() => _MainPanelWidgetState();
}

class _MainPanelWidgetState extends State<MainPanelWidget> {
  final ScrollController _scrollController = ScrollController();
  bool _showScrollBtn = false;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void didUpdateWidget(MainPanelWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.messages.length != oldWidget.messages.length) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
    }
  }

  void _onScroll() {
    final atBottom =
        _scrollController.position.maxScrollExtent - _scrollController.offset <
        100;
    if (atBottom != !_showScrollBtn) {
      setState(() => _showScrollBtn = !atBottom);
    }
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final model = widget.agentStatus?.model ?? '—';
    final toolCount = widget.agentStatus?.tools.length ?? 0;
    final isWide = MediaQuery.of(context).size.width >= 768;

    return GlassPanel(
      child: Stack(
        children: [
          Column(
            children: [
              // Chat Header
              Container(
                padding: EdgeInsets.symmetric(
                  horizontal: isWide ? 24 : 16,
                  vertical: isWide ? 16 : 12,
                ),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(color: AppTheme.borderDefault),
                  ),
                  color: AppTheme.bgSecondary.withOpacity(0.5),
                ),
                child: Row(
                  children: [
                    Container(
                      width: isWide ? 28 : 24,
                      height: isWide ? 28 : 24,
                      decoration: BoxDecoration(
                        color: AppTheme.accentPrimary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Icon(
                        Icons.auto_awesome_rounded,
                        color: AppTheme.accentPrimaryLight,
                        size: 12,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'New Conversation',
                            style: TextStyle(
                              color: AppTheme.textPrimary,
                              fontSize: isWide ? 13 : 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          if (isWide)
                            Text(
                              'Model: $model · Tools: $toolCount active',
                              style: TextStyle(
                                color: AppTheme.textMuted,
                                fontSize: 10,
                              ),
                            ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: AppTheme.bgTertiary.withOpacity(0.5),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppTheme.borderDefault),
                      ),
                      child: Text(
                        '${widget.messages.length} msg',
                        style: TextStyle(
                          color: AppTheme.textMuted,
                          fontSize: 10,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Messages Area
              Expanded(
                child: widget.messages.isEmpty
                    ? _WelcomeScreen()
                    : ListView.builder(
                        controller: _scrollController,
                        padding: EdgeInsets.symmetric(
                          horizontal: isWide ? 40 : 12,
                          vertical: isWide ? 32 : 16,
                        ),
                        itemCount:
                            widget.messages.length +
                            (widget.isGenerating ? 1 : 0),
                        itemBuilder: (context, i) {
                          if (i == widget.messages.length) {
                            return _GeneratingBubble();
                          }
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 20),
                            child: _MessageBubble(message: widget.messages[i]),
                          );
                        },
                      ),
              ),
            ],
          ),

          // Scroll to bottom button
          if (_showScrollBtn)
            Positioned(
              bottom: 16,
              left: 0,
              right: 0,
              child: Center(
                child: GestureDetector(
                  onTap: _scrollToBottom,
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppTheme.bgElevated.withOpacity(0.9),
                      shape: BoxShape.circle,
                      border: Border.all(color: AppTheme.borderDefault),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.3),
                          blurRadius: 8,
                        ),
                      ],
                    ),
                    child: Icon(
                      Icons.keyboard_arrow_down_rounded,
                      color: AppTheme.textSecondary,
                      size: 18,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _WelcomeScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 70,
            height: 70,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppTheme.accentPrimary.withOpacity(0.2),
                  AppTheme.accentSecondary.withOpacity(0.2),
                ],
              ),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppTheme.borderDefault),
              boxShadow: [
                BoxShadow(
                  color: AppTheme.accentPrimary.withOpacity(0.2),
                  blurRadius: 20,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: Icon(
              Icons.smart_toy_outlined,
              color: AppTheme.accentPrimaryLight,
              size: 30,
            ),
          ),
          const SizedBox(height: 20),
          ShaderMask(
            blendMode: BlendMode.srcIn,
            shaderCallback: (b) => AppTheme.textGradient.createShader(b),
            child: const Text(
              'Lunar Studio Agent',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 40),
            child: Text(
              'Your AI assistant with tools for calculation, weather, workspace management, and more. Start typing to begin.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppTheme.textMuted,
                fontSize: 13,
                height: 1.6,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  final ChatMessage message;
  const _MessageBubble({required this.message});

  @override
  Widget build(BuildContext context) {
    final isUser = message.role == MessageRole.user;
    final w = MediaQuery.of(context).size.width;
    final maxWidth = w < 600
        ? w * 0.85
        : w < 900
        ? w * 0.75
        : w * 0.6;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: isUser
          ? MainAxisAlignment.end
          : MainAxisAlignment.start,
      children: [
        if (!isUser) ...[_Avatar(isUser: false), const SizedBox(width: 10)],
        Flexible(
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: maxWidth),
            child: Column(
              crossAxisAlignment: isUser
                  ? CrossAxisAlignment.end
                  : CrossAxisAlignment.start,
              children: [
                if (message.content.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: isUser
                          ? AppTheme.accentPrimary.withOpacity(0.12)
                          : AppTheme.bgTertiary.withOpacity(0.6),
                      borderRadius: BorderRadius.only(
                        topLeft: Radius.circular(isUser ? 16 : 4),
                        topRight: Radius.circular(isUser ? 4 : 16),
                        bottomLeft: const Radius.circular(16),
                        bottomRight: const Radius.circular(16),
                      ),
                      border: Border.all(
                        color: isUser
                            ? AppTheme.accentPrimary.withOpacity(0.15)
                            : AppTheme.borderDefault,
                      ),
                    ),
                    child: isUser
                        ? SelectableText(
                            message.content,
                            style: TextStyle(
                              color: AppTheme.textPrimary,
                              fontSize: 13,
                              height: 1.6,
                            ),
                          )
                        : _MarkdownBody(content: message.content),
                  ),

                // Tool calls
                if (message.toolCalls.isNotEmpty)
                  _ToolCallStack(tools: message.toolCalls),

                // Timestamp
                Padding(
                  padding: const EdgeInsets.only(top: 6, left: 4, right: 4),
                  child: Text(
                    message.timestamp,
                    style: TextStyle(
                      color: AppTheme.textMuted,
                      fontSize: 10,
                      fontFamily: 'monospace',
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (isUser) ...[const SizedBox(width: 10), _Avatar(isUser: true)],
      ],
    );
  }
}

class _Avatar extends StatelessWidget {
  final bool isUser;
  const _Avatar({required this.isUser});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 34,
      height: 34,
      decoration: BoxDecoration(
        color: isUser
            ? AppTheme.accentPrimary.withOpacity(0.15)
            : AppTheme.accentSecondary.withOpacity(0.1),
        shape: BoxShape.circle,
        border: Border.all(
          color: isUser
              ? AppTheme.accentPrimary.withOpacity(0.2)
              : AppTheme.accentSecondary.withOpacity(0.15),
        ),
      ),
      child: Icon(
        isUser ? Icons.person_outline_rounded : Icons.smart_toy_outlined,
        size: 15,
        color: isUser ? AppTheme.accentPrimaryLight : AppTheme.accentSecondary,
      ),
    );
  }
}

class _MarkdownBody extends StatelessWidget {
  final String content;
  const _MarkdownBody({required this.content});

  @override
  Widget build(BuildContext context) {
    return MarkdownBody(
      data: content,
      selectable: true,
      styleSheet: MarkdownStyleSheet(
        p: TextStyle(color: AppTheme.textPrimary, fontSize: 13, height: 1.6),
        h1: TextStyle(
          color: AppTheme.textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
        h2: TextStyle(
          color: AppTheme.textPrimary,
          fontSize: 16,
          fontWeight: FontWeight.bold,
        ),
        h3: TextStyle(
          color: AppTheme.textPrimary,
          fontSize: 14,
          fontWeight: FontWeight.bold,
        ),
        code: TextStyle(
          color: AppTheme.accentPrimaryLight,
          fontSize: 12,
          backgroundColor: AppTheme.bgPrimary.withOpacity(0.7),
          fontFamily: 'monospace',
        ),
        codeblockDecoration: BoxDecoration(
          color: AppTheme.bgPrimary.withOpacity(0.8),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppTheme.borderDefault),
        ),
        blockquoteDecoration: BoxDecoration(
          border: Border(
            left: BorderSide(
              color: AppTheme.accentPrimary.withOpacity(0.4),
              width: 3,
            ),
          ),
        ),
        blockquotePadding: const EdgeInsets.only(left: 12),
        blockquote: TextStyle(
          color: AppTheme.textSecondary,
          fontStyle: FontStyle.italic,
          fontSize: 13,
        ),
        listBullet: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
        a: TextStyle(
          color: AppTheme.accentPrimaryLight,
          decoration: TextDecoration.underline,
        ),
        strong: TextStyle(
          color: AppTheme.textPrimary,
          fontWeight: FontWeight.w600,
        ),
        em: TextStyle(
          color: AppTheme.textSecondary,
          fontStyle: FontStyle.italic,
        ),
        tableHead: TextStyle(
          color: AppTheme.textSecondary,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
        tableBody: TextStyle(color: AppTheme.textPrimary, fontSize: 12),
        tableBorder: TableBorder.all(
          color: AppTheme.borderDefault,
          borderRadius: BorderRadius.circular(8),
        ),
        horizontalRuleDecoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(color: AppTheme.borderDefault, width: 1),
          ),
        ),
      ),
    );
  }
}

class _ToolCallStack extends StatelessWidget {
  final List<ToolCallInfo> tools;
  const _ToolCallStack({required this.tools});

  @override
  Widget build(BuildContext context) {
    final runningCount = tools
        .where((t) => t.status == ToolStatus.running)
        .length;
    final doneCount = tools.where((t) => t.status == ToolStatus.done).length;

    return Container(
      margin: const EdgeInsets.only(top: 8),
      decoration: BoxDecoration(
        color: AppTheme.bgTertiary.withOpacity(0.4),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.borderDefault),
      ),
      child: Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AppTheme.bgTertiary.withOpacity(0.6),
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(10),
              ),
              border: Border(
                bottom: BorderSide(
                  color: AppTheme.borderDefault.withOpacity(0.6),
                ),
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 20,
                  height: 20,
                  decoration: BoxDecoration(
                    color: AppTheme.accentPrimary.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(5),
                  ),
                  child: Icon(
                    tools.length > 1
                        ? Icons.layers_outlined
                        : Icons.build_outlined,
                    color: AppTheme.accentPrimaryLight,
                    size: 11,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  tools.length > 1 ? '${tools.length} Tool Calls' : 'Tool Call',
                  style: TextStyle(
                    color: AppTheme.textMuted,
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.5,
                  ),
                ),
                const Spacer(),
                if (runningCount > 0)
                  Row(
                    children: [
                      SizedBox(
                        width: 10,
                        height: 10,
                        child: CircularProgressIndicator(
                          strokeWidth: 1.5,
                          color: AppTheme.accentSecondary,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '$runningCount running',
                        style: TextStyle(
                          color: AppTheme.accentSecondary,
                          fontSize: 10,
                        ),
                      ),
                    ],
                  ),
                if (doneCount > 0) ...[
                  const SizedBox(width: 8),
                  Icon(
                    Icons.check_circle_outline_rounded,
                    color: AppTheme.success,
                    size: 11,
                  ),
                  const SizedBox(width: 3),
                  Text(
                    '$doneCount done',
                    style: TextStyle(color: AppTheme.success, fontSize: 10),
                  ),
                ],
              ],
            ),
          ),
          // Tool rows
          ...tools.asMap().entries.map(
            (e) => _ToolRow(tool: e.value, isLast: e.key == tools.length - 1),
          ),
        ],
      ),
    );
  }
}

class _ToolRow extends StatefulWidget {
  final ToolCallInfo tool;
  final bool isLast;
  const _ToolRow({required this.tool, required this.isLast});

  @override
  State<_ToolRow> createState() => _ToolRowState();
}

class _ToolRowState extends State<_ToolRow> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final isRunning = widget.tool.status == ToolStatus.running;
    return Column(
      children: [
        InkWell(
          onTap: () => setState(() => _expanded = !_expanded),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                Container(
                  width: 20,
                  height: 20,
                  decoration: BoxDecoration(
                    color: isRunning
                        ? AppTheme.accentSecondary.withOpacity(0.15)
                        : AppTheme.success.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(5),
                  ),
                  child: isRunning
                      ? SizedBox(
                          width: 11,
                          height: 11,
                          child: Center(
                            child: SizedBox(
                              width: 9,
                              height: 9,
                              child: CircularProgressIndicator(
                                strokeWidth: 1.5,
                                color: AppTheme.accentSecondary,
                              ),
                            ),
                          ),
                        )
                      : Icon(
                          Icons.check_circle_outline_rounded,
                          color: AppTheme.success,
                          size: 11,
                        ),
                ),
                const SizedBox(width: 8),
                Text(
                  widget.tool.name,
                  style: TextStyle(
                    color: AppTheme.accentPrimaryLight,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (widget.tool.args != null) ...[
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      widget.tool.args!,
                      style: TextStyle(
                        color: AppTheme.textMuted,
                        fontSize: 10,
                        fontFamily: 'monospace',
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
                Text(
                  isRunning ? 'Running' : 'Done',
                  style: TextStyle(
                    color: isRunning
                        ? AppTheme.accentSecondary
                        : AppTheme.success,
                    fontSize: 10,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (widget.tool.result != null)
                  Icon(
                    _expanded
                        ? Icons.keyboard_arrow_up_rounded
                        : Icons.keyboard_arrow_down_rounded,
                    color: AppTheme.textMuted,
                    size: 13,
                  ),
              ],
            ),
          ),
        ),
        if (_expanded && widget.tool.result != null)
          Container(
            margin: const EdgeInsets.fromLTRB(12, 0, 12, 10),
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppTheme.bgPrimary.withOpacity(0.6),
              borderRadius: BorderRadius.circular(8),
            ),
            constraints: const BoxConstraints(maxHeight: 140),
            child: SingleChildScrollView(
              child: SelectableText(
                widget.tool.result!,
                style: TextStyle(
                  color: AppTheme.textSecondary,
                  fontSize: 11,
                  fontFamily: 'monospace',
                  height: 1.5,
                ),
              ),
            ),
          ),
        if (!widget.isLast)
          Divider(
            height: 1,
            color: AppTheme.borderDefault.withOpacity(0.6),
            indent: 12,
            endIndent: 12,
          ),
      ],
    );
  }
}

class _GeneratingBubble extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _Avatar(isUser: false),
          const SizedBox(width: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
            decoration: BoxDecoration(
              color: AppTheme.bgTertiary.withOpacity(0.6),
              borderRadius: const BorderRadius.only(
                topRight: Radius.circular(16),
                bottomLeft: Radius.circular(16),
                bottomRight: Radius.circular(16),
              ),
              border: Border.all(color: AppTheme.borderDefault),
            ),
            child: const TypingIndicator(),
          ),
        ],
      ),
    );
  }
}
