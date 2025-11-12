import 'package:flutter/material.dart';

class FullscreenImageViewer extends StatefulWidget {
  final List<String> images;
  final int startIndex;
  final VoidCallback onClose;

  const FullscreenImageViewer({super.key, required this.images, this.startIndex = 0, required this.onClose});

  @override
  State<FullscreenImageViewer> createState() => _FullscreenImageViewerState();
}

class _FullscreenImageViewerState extends State<FullscreenImageViewer> {
  late int currentIndex;

  @override
  void initState() {
    super.initState();
    currentIndex = widget.startIndex;
  }

  void next() => setState(() => currentIndex = (currentIndex + 1) % widget.images.length);
  void prev() => setState(() => currentIndex = (currentIndex - 1 + widget.images.length) % widget.images.length);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onClose,
      child: Container(
        color: Colors.black.withOpacity(0.9),
        child: SafeArea(
          child: Stack(
            alignment: Alignment.center,
            children: [
              Positioned.fill(
                child: Image.network(widget.images[currentIndex], fit: BoxFit.contain),
              ),
              if (widget.images.length > 1) ...[
                Positioned(left: 8, child: IconButton(icon: const Icon(Icons.chevron_left, size: 36, color: Colors.white), onPressed: () { prev(); })),
                Positioned(right: 8, child: IconButton(icon: const Icon(Icons.chevron_right, size: 36, color: Colors.white), onPressed: () { next(); })),
              ],
              Positioned(top: 8, right: 8, child: IconButton(icon: const Icon(Icons.close, color: Colors.white), onPressed: widget.onClose)),
            ],
          ),
        ),
      ),
    );
  }
}
