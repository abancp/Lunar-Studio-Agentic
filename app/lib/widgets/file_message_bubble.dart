import 'dart:io';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:video_player/video_player.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';

// ── Entry point ───────────────────────────────────────────────

class FileMessageBubble extends StatelessWidget {
  final FileAttachment file;
  const FileMessageBubble({super.key, required this.file});

  @override
  Widget build(BuildContext context) {
    if (file.isImage && !file.forceDownload && file.bytes.isNotEmpty) {
      return _ImageBubble(file: file);
    }
    if (file.isVideo && !file.forceDownload && file.bytes.isNotEmpty) {
      return _VideoBubble(file: file);
    }
    return _FileCard(file: file);
  }
}

// ── IMAGE VIEWER ──────────────────────────────────────────────

class _ImageBubble extends StatelessWidget {
  final FileAttachment file;
  const _ImageBubble({required this.file});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GestureDetector(
          onTap: () => _openLightbox(context),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 320, maxHeight: 280),
              child: Stack(
                children: [
                  Image.memory(
                    file.bytes,
                    fit: BoxFit.cover,
                    width: double.infinity,
                    errorBuilder: (_, __, ___) => _FileCard(file: file),
                  ),
                  Positioned(
                    bottom: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                          color: Colors.black45,
                          borderRadius: BorderRadius.circular(8)),
                      child: const Icon(Icons.zoom_in_rounded,
                          color: Colors.white, size: 16),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        if (file.caption?.isNotEmpty == true)
          Padding(
            padding: const EdgeInsets.only(top: 6, left: 4),
            child: Text(file.caption!,
                style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
          ),
        Padding(
          padding: const EdgeInsets.only(top: 4, left: 4),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  '${file.fileName}  ·  ${file.sizeLabel}',
                  style: TextStyle(
                      color: AppTheme.textMuted,
                      fontSize: 11,
                      fontFamily: 'monospace'),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              _DownloadButton(file: file),
            ],
          ),
        ),
      ],
    );
  }

  void _openLightbox(BuildContext context) {
    showDialog(
      context: context,
      barrierColor: Colors.black87,
      builder: (_) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(12),
        child: Stack(
          alignment: Alignment.center,
          children: [
            InteractiveViewer(
              minScale: 0.5,
              maxScale: 5,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.memory(file.bytes, fit: BoxFit.contain),
              ),
            ),
            Positioned(
              top: 0,
              right: 0,
              child: IconButton(
                onPressed: () => Navigator.pop(_),
                icon: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                      color: Colors.black54,
                      borderRadius: BorderRadius.circular(8)),
                  child: const Icon(Icons.close_rounded,
                      color: Colors.white, size: 16),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── VIDEO PLAYER ──────────────────────────────────────────────

class _VideoBubble extends StatefulWidget {
  final FileAttachment file;
  const _VideoBubble({required this.file});
  @override
  State<_VideoBubble> createState() => _VideoBubbleState();
}

class _VideoBubbleState extends State<_VideoBubble> {
  VideoPlayerController? _controller;
  bool _initialized = false;
  bool _loading = true;
  String? _error;
  bool _overlayVisible = true;
  File? _tmpFile;

  @override
  void initState() {
    super.initState();
    _initPlayer();
  }

  Future<void> _initPlayer() async {
    try {
      // Write bytes to a temp file — video_player needs a file URI
      final tmpDir = await getTemporaryDirectory();
      final ext = widget.file.fileName.contains('.')
          ? widget.file.fileName.split('.').last
          : 'mp4';
      _tmpFile = File(
          '${tmpDir.path}/vp_${DateTime.now().millisecondsSinceEpoch}.$ext');
      await _tmpFile!.writeAsBytes(widget.file.bytes);

      _controller = VideoPlayerController.file(_tmpFile!);
      await _controller!.initialize();
      _controller!.addListener(() => setState(() {}));
      setState(() {
        _initialized = true;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    _tmpFile?.deleteSync();
    super.dispose();
  }

  void _togglePlay() {
    if (_controller == null) return;
    setState(() {
      _controller!.value.isPlaying ? _controller!.pause() : _controller!.play();
    });
  }

  void _toggleOverlay() {
    setState(() => _overlayVisible = !_overlayVisible);
    if (_overlayVisible) {
      Future.delayed(const Duration(seconds: 3), () {
        if (mounted && _controller?.value.isPlaying == true) {
          setState(() => _overlayVisible = false);
        }
      });
    }
  }

  String _fmt(Duration d) {
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Container(
        width: 300,
        height: 180,
        decoration: BoxDecoration(
          color: AppTheme.bgTertiary.withOpacity(0.6),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.borderDefault),
        ),
        child: Center(
          child: CircularProgressIndicator(color: AppTheme.accentPrimary),
        ),
      );
    }

    if (_error != null || !_initialized) {
      return _FileCard(file: widget.file);
    }

    final ctrl = _controller!;
    final isPlaying = ctrl.value.isPlaying;
    final duration = ctrl.value.duration;
    final position = ctrl.value.position;
    final ratio = ctrl.value.aspectRatio;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Video frame ──
        ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 340),
            child: GestureDetector(
              onTap: _toggleOverlay,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  AspectRatio(
                    aspectRatio: ratio.clamp(0.5, 2.5),
                    child: VideoPlayer(ctrl),
                  ),
                  // Dark overlay + controls
                  AnimatedOpacity(
                    opacity: _overlayVisible ? 1.0 : 0.0,
                    duration: const Duration(milliseconds: 200),
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.transparent,
                            Colors.black.withOpacity(0.7),
                          ],
                        ),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          // Progress bar
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            child: VideoProgressIndicator(
                              ctrl,
                              allowScrubbing: true,
                              colors: VideoProgressColors(
                                playedColor: AppTheme.accentPrimaryLight,
                                bufferedColor: Colors.white.withOpacity(0.3),
                                backgroundColor: Colors.white.withOpacity(0.15),
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),
                          // Controls row
                          Padding(
                            padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
                            child: Row(
                              children: [
                                GestureDetector(
                                  onTap: _togglePlay,
                                  child: Container(
                                    width: 36,
                                    height: 36,
                                    decoration: BoxDecoration(
                                      color: Colors.white.withOpacity(0.2),
                                      shape: BoxShape.circle,
                                    ),
                                    child: Icon(
                                      isPlaying
                                          ? Icons.pause_rounded
                                          : Icons.play_arrow_rounded,
                                      color: Colors.white,
                                      size: 20,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  '${_fmt(position)} / ${_fmt(duration)}',
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 11,
                                      fontFamily: 'monospace'),
                                ),
                                const Spacer(),
                                // Fullscreen
                                GestureDetector(
                                  onTap: () => _openFullscreen(context),
                                  child: const Icon(
                                    Icons.fullscreen_rounded,
                                    color: Colors.white,
                                    size: 22,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                _DownloadButton(file: widget.file),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  // Play icon when paused
                  if (!isPlaying && _overlayVisible)
                    GestureDetector(
                      onTap: _togglePlay,
                      child: Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: Colors.black54,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.play_arrow_rounded,
                            color: Colors.white, size: 32),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
        if (widget.file.caption?.isNotEmpty == true)
          Padding(
            padding: const EdgeInsets.only(top: 6, left: 4),
            child: Text(widget.file.caption!,
                style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
          ),
        Padding(
          padding: const EdgeInsets.only(top: 4, left: 4),
          child: Text(
            '${widget.file.fileName}  ·  ${widget.file.sizeLabel}',
            style: TextStyle(
                color: AppTheme.textMuted,
                fontSize: 11,
                fontFamily: 'monospace'),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  void _openFullscreen(BuildContext context) {
    _controller?.pause();
    showDialog(
      context: context,
      barrierColor: Colors.black,
      builder: (_) => _FullscreenVideo(
        file: _tmpFile!,
        startPosition: _controller?.value.position ?? Duration.zero,
      ),
    ).then((_) {
      // resume where fullscreen left off — controller is still alive
    });
  }
}

// ── Fullscreen video dialog ───────────────────────────────────

class _FullscreenVideo extends StatefulWidget {
  final File file;
  final Duration startPosition;
  const _FullscreenVideo({required this.file, required this.startPosition});
  @override
  State<_FullscreenVideo> createState() => _FullscreenVideoState();
}

class _FullscreenVideoState extends State<_FullscreenVideo> {
  late VideoPlayerController _ctrl;
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _ctrl = VideoPlayerController.file(widget.file);
    _ctrl.initialize().then((_) {
      _ctrl.seekTo(widget.startPosition);
      _ctrl.play();
      _ctrl.addListener(() => setState(() {}));
      setState(() => _initialized = true);
    });
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  String _fmt(Duration d) {
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        alignment: Alignment.center,
        children: [
          if (_initialized)
            Center(
              child: AspectRatio(
                aspectRatio: _ctrl.value.aspectRatio,
                child: VideoPlayer(_ctrl),
              ),
            )
          else
            const CircularProgressIndicator(color: Colors.white),

          // close button
          Positioned(
            top: 40,
            right: 16,
            child: IconButton(
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.close_rounded,
                  color: Colors.white, size: 24),
            ),
          ),

          // bottom controls
          if (_initialized)
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Colors.transparent, Colors.black87],
                  ),
                ),
                child: Column(
                  children: [
                    VideoProgressIndicator(
                      _ctrl,
                      allowScrubbing: true,
                      colors: VideoProgressColors(
                        playedColor: AppTheme.accentPrimaryLight,
                        bufferedColor: Colors.white38,
                        backgroundColor: Colors.white24,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Text(
                          _fmt(_ctrl.value.position),
                          style: const TextStyle(
                              color: Colors.white70, fontSize: 12),
                        ),
                        const Spacer(),
                        IconButton(
                          onPressed: () {
                            setState(() {
                              _ctrl.value.isPlaying
                                  ? _ctrl.pause()
                                  : _ctrl.play();
                            });
                          },
                          icon: Icon(
                            _ctrl.value.isPlaying
                                ? Icons.pause_rounded
                                : Icons.play_arrow_rounded,
                            color: Colors.white,
                            size: 32,
                          ),
                        ),
                        const Spacer(),
                        Text(
                          _fmt(_ctrl.value.duration),
                          style: const TextStyle(
                              color: Colors.white70, fontSize: 12),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ── Generic file card ─────────────────────────────────────────

class _FileCard extends StatelessWidget {
  final FileAttachment file;
  const _FileCard({required this.file});

  IconData get _icon {
    if (file.isImage) return Icons.image_outlined;
    if (file.isVideo) return Icons.videocam_outlined;
    if (file.isAudio) return Icons.audiotrack_outlined;
    if (file.isPdf) return Icons.picture_as_pdf_outlined;
    if (file.isText) return Icons.code_rounded;
    if (file.mimeType.contains('zip') || file.mimeType.contains('tar')) {
      return Icons.folder_zip_outlined;
    }
    return Icons.insert_drive_file_outlined;
  }

  Color get _iconColor {
    if (file.isImage) return const Color(0xFF0EA5E9);
    if (file.isVideo) return const Color(0xFFA78BFA);
    if (file.isAudio) return const Color(0xFF34D399);
    if (file.isPdf) return const Color(0xFFF87171);
    return AppTheme.accentPrimaryLight;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 300),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppTheme.bgTertiary.withOpacity(0.6),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.borderDefault),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: _iconColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: _iconColor.withOpacity(0.2)),
                ),
                child: Icon(_icon, color: _iconColor, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      file.fileName,
                      style: TextStyle(
                          color: AppTheme.textPrimary,
                          fontSize: 13,
                          fontWeight: FontWeight.w500),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${file.extension} · ${file.sizeLabel}',
                      style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              _DownloadButton(file: file),
            ],
          ),
          if (file.caption?.isNotEmpty == true) ...[
            const SizedBox(height: 8),
            Text(
              file.caption!,
              style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
            ),
          ],
        ],
      ),
    );
  }
}

// ── Download button ───────────────────────────────────────────

class _DownloadButton extends StatefulWidget {
  final FileAttachment file;
  const _DownloadButton({required this.file});
  @override
  State<_DownloadButton> createState() => _DownloadButtonState();
}

class _DownloadButtonState extends State<_DownloadButton> {
  bool _saving = false;
  bool _saved = false;

  Future<void> _save() async {
    if (_saving || _saved) return;
    setState(() => _saving = true);

    try {
      // Use app-specific external storage — no WRITE permission needed on API 29+
      // Fallback: appDocumentsDirectory (always accessible)
      Directory? dir;
      try {
        dir = await getExternalStorageDirectory();
      } catch (_) {}
      dir ??= await getApplicationDocumentsDirectory();

      // Create a friendly subfolder
      final subFolder = Directory('${dir.path}/LunarStudio');
      if (!subFolder.existsSync()) subFolder.createSync(recursive: true);

      final savePath = '${subFolder.path}/${widget.file.fileName}';
      await File(savePath).writeAsBytes(widget.file.bytes);

      setState(() {
        _saving = false;
        _saved = true;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Saved to LunarStudio/${widget.file.fileName}'),
          backgroundColor: AppTheme.success,
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ));
      }
      Future.delayed(const Duration(seconds: 3), () {
        if (mounted) setState(() => _saved = false);
      });
    } catch (e) {
      setState(() {
        _saving = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Save failed: $e'),
          backgroundColor: AppTheme.danger,
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _save,
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: _saved
              ? AppTheme.success.withOpacity(0.1)
              : AppTheme.accentPrimary.withOpacity(0.08),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: _saved
                ? AppTheme.success.withOpacity(0.3)
                : AppTheme.accentPrimary.withOpacity(0.2),
          ),
        ),
        child: _saving
            ? Padding(
                padding: const EdgeInsets.all(8),
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: AppTheme.accentPrimary))
            : Icon(
                _saved ? Icons.check_rounded : Icons.download_rounded,
                color: _saved ? AppTheme.success : AppTheme.accentPrimaryLight,
                size: 16,
              ),
      ),
    );
  }
}

// ── Notification Toasts ───────────────────────────────────────

class NotificationOverlay extends StatelessWidget {
  final List<AppNotification> notifications;
  final void Function(String id) onDismiss;
  const NotificationOverlay(
      {super.key, required this.notifications, required this.onDismiss});

  Color _bg(String t) => switch (t) {
        'success' => AppTheme.success.withOpacity(0.1),
        'warning' => const Color(0xFFFBBF24).withOpacity(0.1),
        'error' => AppTheme.danger.withOpacity(0.1),
        _ => AppTheme.accentSecondary.withOpacity(0.08),
      };

  Color _border(String t) => switch (t) {
        'success' => AppTheme.success.withOpacity(0.3),
        'warning' => const Color(0xFFFBBF24).withOpacity(0.3),
        'error' => AppTheme.danger.withOpacity(0.3),
        _ => AppTheme.accentSecondary.withOpacity(0.25),
      };

  Color _text(String t) => switch (t) {
        'success' => AppTheme.success,
        'warning' => const Color(0xFFFBBF24),
        'error' => AppTheme.danger,
        _ => AppTheme.accentSecondary,
      };

  @override
  Widget build(BuildContext context) {
    if (notifications.isEmpty) return const SizedBox.shrink();
    return Positioned(
      top: 8,
      right: 8,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: notifications
            .map((n) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Container(
                    key: ValueKey(n.id),
                    constraints: const BoxConstraints(maxWidth: 280),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: _bg(n.notifyType),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: _border(n.notifyType)),
                      boxShadow: const [
                        BoxShadow(
                            color: Colors.black26,
                            blurRadius: 12,
                            offset: Offset(0, 4))
                      ],
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(n.title,
                                  style: TextStyle(
                                      color: _text(n.notifyType),
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis),
                              if (n.body.isNotEmpty)
                                Padding(
                                  padding: const EdgeInsets.only(top: 2),
                                  child: Text(n.body,
                                      style: TextStyle(
                                          color: AppTheme.textMuted,
                                          fontSize: 11),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis),
                                ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        GestureDetector(
                          onTap: () => onDismiss(n.id),
                          child: Icon(Icons.close_rounded,
                              color: _text(n.notifyType), size: 14),
                        ),
                      ],
                    ),
                  ),
                ))
            .toList(),
      ),
    );
  }
}
