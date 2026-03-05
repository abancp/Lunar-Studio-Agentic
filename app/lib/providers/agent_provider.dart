import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../models/models.dart';

const _kServerUrlKey = 'server_ws_url';
const _kDefaultUrl = 'ws://localhost:3210';

class AgentProvider extends ChangeNotifier {
  WebSocketChannel? _channel;
  bool _isConnected = false;
  bool _isGenerating = false;
  AgentStatus? _agentStatus;
  final List<ChatMessage> _messages = [];
  String _serverUrl = _kDefaultUrl;

  bool get isConnected => _isConnected;
  bool get isGenerating => _isGenerating;
  AgentStatus? get agentStatus => _agentStatus;
  List<ChatMessage> get messages => List.unmodifiable(_messages);
  String get serverUrl => _serverUrl;

  AgentProvider() {
    _loadUrl();
  }

  // ── URL persistence ──

  Future<void> _loadUrl() async {
    final prefs = await SharedPreferences.getInstance();
    _serverUrl = prefs.getString(_kServerUrlKey) ?? _kDefaultUrl;
    notifyListeners();
    connect();
  }

  Future<void> setServerUrl(String url) async {
    _serverUrl = url.trim();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kServerUrlKey, _serverUrl);
    disconnect();
    connect();
  }

  // ── Connection ──

  void connect() {
    if (_channel != null) return;
    try {
      _channel = WebSocketChannel.connect(Uri.parse(_serverUrl));
      _channel!.stream.listen(
        _onData,
        onError: _onError,
        onDone: _onDone,
        cancelOnError: false,
      );
      // After connecting, request status (server sends 'welcome' first)
    } catch (e) {
      _isConnected = false;
      _channel = null;
      notifyListeners();
    }
  }

  void disconnect() {
    _channel?.sink.close();
    _channel = null;
    _isConnected = false;
    _isGenerating = false;
    notifyListeners();
  }

  // ── Incoming messages — matching exact server protocol ──

  void _onData(dynamic data) {
    Map<String, dynamic> msg;
    try {
      msg = jsonDecode(data as String) as Map<String, dynamic>;
    } catch (_) {
      return;
    }

    final type = msg['type'] as String? ?? '';
    final now = _timeNow();

    switch (type) {
      // Server says hello, now we are connected
      case 'welcome':
        _isConnected = true;
        // Request current status
        _send({'type': 'get_status'});
        notifyListeners();
        break;

      // Agent status (provider, model, tools, whatsapp)
      case 'status':
        _agentStatus = AgentStatus(
          provider: msg['provider'] as String? ?? '—',
          model: msg['model'] as String? ?? '—',
          tools: List<String>.from(msg['tools'] ?? []),
          whatsapp: msg['whatsapp'] as String?,
        );
        _isConnected = true;
        notifyListeners();
        break;

      // Streamed text from the assistant
      case 'text':
        final content = msg['content'] as String? ?? '';
        _appendAssistantText(content, now);
        break;

      // Tool execution started
      case 'tool_start':
        final name = msg['name'] as String? ?? 'tool';
        final args = msg['args'] as String? ?? '';
        _appendToolStart(name, args, now);
        break;

      // Tool finished
      case 'tool_result':
        final name = msg['name'] as String? ?? '';
        final result = msg['result'] as String? ?? '';
        _updateToolResult(name, result);
        break;

      // Turn is done
      case 'done':
        _isGenerating = false;
        notifyListeners();
        break;

      case 'error':
        _isGenerating = false;
        _messages.add(ChatMessage(
          id: 'err-${DateTime.now().millisecondsSinceEpoch}',
          role: MessageRole.assistant,
          content: '⚠️ ${msg['message'] ?? 'Unknown error'}',
          timestamp: now,
        ));
        notifyListeners();
        break;

      // Logs, memories etc. — ignored for now
      default:
        break;
    }
  }

  void _appendAssistantText(String content, String now) {
    // Find the last assistant message that has no text yet (only tool calls)
    if (_messages.isNotEmpty) {
      final last = _messages.last;
      if (last.role == MessageRole.assistant &&
          last.content.isEmpty &&
          (last.toolCalls.isNotEmpty)) {
        _messages[_messages.length - 1] = ChatMessage(
          id: last.id,
          role: last.role,
          content: content,
          timestamp: now,
          toolCalls: last.toolCalls,
        );
        notifyListeners();
        return;
      }
    }
    _messages.add(ChatMessage(
      id: 'msg-${DateTime.now().millisecondsSinceEpoch}',
      role: MessageRole.assistant,
      content: content,
      timestamp: now,
    ));
    notifyListeners();
  }

  void _appendToolStart(String name, String args, String now) {
    final toolInfo = ToolCallInfo(
      name: name,
      args: args,
      status: ToolStatus.running,
    );

    if (_messages.isNotEmpty && _messages.last.role == MessageRole.assistant) {
      final last = _messages.last;
      _messages[_messages.length - 1] = ChatMessage(
        id: last.id,
        role: last.role,
        content: last.content,
        timestamp: last.timestamp,
        toolCalls: [...last.toolCalls, toolInfo],
      );
    } else {
      _messages.add(ChatMessage(
        id: 'msg-${DateTime.now().millisecondsSinceEpoch}',
        role: MessageRole.assistant,
        content: '',
        timestamp: now,
        toolCalls: [toolInfo],
      ));
    }
    notifyListeners();
  }

  void _updateToolResult(String name, String result) {
    for (int i = _messages.length - 1; i >= 0; i--) {
      final m = _messages[i];
      if (m.role == MessageRole.assistant && m.toolCalls.isNotEmpty) {
        final idx = m.toolCalls.lastIndexWhere(
            (t) => t.name == name && t.status == ToolStatus.running);
        if (idx >= 0) {
          final updated = List<ToolCallInfo>.from(m.toolCalls);
          updated[idx] = ToolCallInfo(
            name: name,
            args: updated[idx].args,
            result: result,
            status: ToolStatus.done,
          );
          _messages[i] = ChatMessage(
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
            toolCalls: updated,
          );
          break;
        }
      }
    }
    notifyListeners();
  }

  void _onError(dynamic error) {
    _isConnected = false;
    _isGenerating = false;
    _channel = null;
    notifyListeners();
    // Auto-reconnect after 3s
    Future.delayed(const Duration(seconds: 3), connect);
  }

  void _onDone() {
    _isConnected = false;
    _isGenerating = false;
    _channel = null;
    notifyListeners();
    // Auto-reconnect after 3s
    Future.delayed(const Duration(seconds: 3), connect);
  }

  // ── Send ──

  void _send(Map<String, dynamic> payload) {
    _channel?.sink.add(jsonEncode(payload));
  }

  void sendMessage(String text) {
    if (!_isConnected || text.isEmpty) return;
    final now = _timeNow();
    _messages.add(ChatMessage(
      id: 'msg-${DateTime.now().millisecondsSinceEpoch}',
      role: MessageRole.user,
      content: text,
      timestamp: now,
    ));
    _isGenerating = true;
    notifyListeners();
    _send({'type': 'chat', 'message': text});
  }

  void stopGenerating() {
    _send({'type': 'stop'});
    _isGenerating = false;
    notifyListeners();
  }

  String _timeNow() {
    final now = DateTime.now();
    return '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
  }

  @override
  void dispose() {
    _channel?.sink.close();
    super.dispose();
  }
}
