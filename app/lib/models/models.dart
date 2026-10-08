import 'dart:typed_data';

enum MessageRole { user, assistant }

enum ToolStatus { running, done }

enum NavPage { chat, memory, tools, logs, context, apps }

// ── Tool Call ──

class ToolCallInfo {
  final String name;
  final String? args;
  final String? result;
  final ToolStatus status;

  const ToolCallInfo({
    required this.name,
    this.args,
    this.result,
    this.status = ToolStatus.done,
  });
}

// ── File Attachment ──

class FileAttachment {
  final String fileName;
  final String mimeType;
  final Uint8List bytes;
  final String? caption;
  final bool forceDownload;
  final int? sizeBytes;

  const FileAttachment({
    required this.fileName,
    required this.mimeType,
    required this.bytes,
    this.caption,
    this.forceDownload = false,
    this.sizeBytes,
  });

  bool get isImage => mimeType.startsWith('image/');
  bool get isVideo => mimeType.startsWith('video/');
  bool get isAudio => mimeType.startsWith('audio/');
  bool get isPdf => mimeType == 'application/pdf';
  bool get isText => mimeType.startsWith('text/');

  String get extension {
    final dot = fileName.lastIndexOf('.');
    return dot >= 0 ? fileName.substring(dot + 1).toUpperCase() : 'FILE';
  }

  String get sizeLabel {
    final b = sizeBytes ?? bytes.length;
    if (b < 1024) return '$b B';
    if (b < 1024 * 1024) return '${(b / 1024).toStringAsFixed(1)} KB';
    return '${(b / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}

// ── Chat Message ──

class ChatMessage {
  final String id;
  final MessageRole role;
  final String content;
  final String timestamp;
  final List<ToolCallInfo> toolCalls;
  final FileAttachment? fileAttachment;

  const ChatMessage({
    required this.id,
    required this.role,
    required this.content,
    required this.timestamp,
    this.toolCalls = const [],
    this.fileAttachment,
  });
}

// ── Agent Status ──

class AgentStatus {
  final String provider;
  final String model;
  final List<String> tools;
  final String? whatsapp;

  const AgentStatus({
    required this.provider,
    required this.model,
    this.tools = const [],
    this.whatsapp,
  });
}

// ── In-App Notification ──

class AppNotification {
  final String id;
  final String title;
  final String body;
  final String notifyType; // info, success, warning, error

  const AppNotification({
    required this.id,
    required this.title,
    required this.body,
    this.notifyType = 'info',
  });
}
