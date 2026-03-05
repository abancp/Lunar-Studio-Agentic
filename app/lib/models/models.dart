enum MessageRole { user, assistant }
enum ToolStatus { running, done }
enum NavPage { chat, memory, tools, logs, context, apps }

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

class ChatMessage {
  final String id;
  final MessageRole role;
  final String content;
  final String timestamp;
  final List<ToolCallInfo> toolCalls;

  const ChatMessage({
    required this.id,
    required this.role,
    required this.content,
    required this.timestamp,
    this.toolCalls = const [],
  });
}

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
