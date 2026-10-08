import 'dart:convert';
import 'dart:typed_data';
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
  final List<AppNotification> _notifications = [];
  String _serverUrl = _kDefaultUrl;

  bool get isConnected => _isConnected;
  bool get isGenerating => _isGenerating;
  AgentStatus? get agentStatus => _agentStatus;
  List<ChatMessage> get messages => List.unmodifiable(_messages);
  List<AppNotification> get notifications => List.unmodifiable(_notifications);
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

  // ── Incoming messages ──

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
      case 'welcome':
        _isConnected = true;
        _send({'type': 'get_status'});
        notifyListeners();
        break;

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

      case 'text':
        _appendAssistantText(msg['content'] as String? ?? '', now);
        break;

      case 'tool_start':
        _appendToolStart(
          msg['name'] as String? ?? 'tool',
          msg['args'] as String? ?? '',
          now,
        );
        break;

      case 'tool_result':
        _updateToolResult(
          msg['name'] as String? ?? '',
          msg['result'] as String? ?? '',
        );
        break;

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

      // ── File sent by the AI ──
      case 'file':
        _handleIncomingFile(msg, now);
        break;

      // ── Toast notification from AI ──
      case 'notify':
        final notifId = 'notif-${DateTime.now().millisecondsSinceEpoch}';
        final notif = AppNotification(
          id: notifId,
          title: msg['title'] as String? ?? '',
          body: msg['body'] as String? ?? '',
          notifyType: msg['notifyType'] as String? ?? 'info',
        );
        _notifications.add(notif);
        notifyListeners();
        // Auto-dismiss after 5 seconds
        Future.delayed(const Duration(seconds: 5), () {
          dismissNotification(notifId);
        });
        break;

      // ── File upload confirmed by server ──
      case 'upload_ok':
        _messages.add(ChatMessage(
          id: 'upload-${DateTime.now().millisecondsSinceEpoch}',
          role: MessageRole.assistant,
          content:
              '📎 **${msg['fileName']}** uploaded (id: `${msg['fileId']}`). You can now ask me about this file.',
          timestamp: now,
        ));
        notifyListeners();
        break;

      default:
        break;
    }
  }

  void _handleIncomingFile(Map<String, dynamic> msg, String now) {
    final fileName = msg['fileName'] as String? ?? 'file';
    final mimeType = msg['mimeType'] as String? ?? 'application/octet-stream';
    final base64Data = msg['data'] as String? ?? '';
    final caption = msg['caption'] as String?;
    final forceDownload = msg['forceDownload'] as bool? ?? false;
    final sizeBytes = msg['sizeBytes'] as int?;

    Uint8List bytes;
    try {
      bytes = base64Decode(base64Data);
    } catch (_) {
      bytes = Uint8List(0);
    }

    final attachment = FileAttachment(
      fileName: fileName,
      mimeType: mimeType,
      bytes: bytes,
      caption: caption,
      forceDownload: forceDownload,
      sizeBytes: sizeBytes,
    );

    _messages.add(ChatMessage(
      id: 'file-${DateTime.now().millisecondsSinceEpoch}',
      role: MessageRole.assistant,
      content: '',
      timestamp: now,
      fileAttachment: attachment,
    ));
    notifyListeners();
  }

  void dismissNotification(String id) {
    _notifications.removeWhere((n) => n.id == id);
    notifyListeners();
  }

  // ── Upload a file to server ──

  Future<void> uploadFile(
      String fileName, String mimeType, Uint8List bytes) async {
    if (!_isConnected) return;
    final base64Data = base64Encode(bytes);
    _send({
      'type': 'upload_file',
      'fileName': fileName,
      'mimeType': mimeType,
      'data': base64Data,
    });
  }

  // ── Assistant message helpers ──

  void _appendAssistantText(String content, String now) {
    if (_messages.isNotEmpty) {
      final last = _messages.last;
      if (last.role == MessageRole.assistant &&
          last.content.isEmpty &&
          last.toolCalls.isNotEmpty) {
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
    Future.delayed(const Duration(seconds: 3), connect);
  }

  void _onDone() {
    _isConnected = false;
    _isGenerating = false;
    _channel = null;
    notifyListeners();
    Future.delayed(const Duration(seconds: 3), connect);
  }

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
