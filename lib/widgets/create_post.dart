import 'package:flutter/material.dart';
import 'dart:io';
import 'package:image_picker/image_picker.dart';
import 'package:myapp/models/post.dart';
import 'package:myapp/providers/auth_provider.dart';
import 'package:myapp/services/post_service.dart';
import 'package:provider/provider.dart';

class CreatePost extends StatefulWidget {
  final PostPermissions permissions;

  const CreatePost({super.key, required this.permissions});

  @override
  State<CreatePost> createState() => _CreatePostState();
}

class _CreatePostState extends State<CreatePost> {
  final _textController = TextEditingController();
  final ImagePicker _picker = ImagePicker();
  List<XFile> _mediaFiles = [];
  String? _mediaType;
  // Pick multiple images (gallery). Uses pickMultiImage which is supported on mobile.
  Future<void> _pickImages() async {
    if (!widget.permissions.canPostImages) return;
    try {
      final List<XFile>? pickedFiles = await _picker.pickMultiImage();
      if (pickedFiles != null && pickedFiles.isNotEmpty) {
        setState(() {
          _mediaFiles = pickedFiles;
          _mediaType = 'image';
        });
      }
    } catch (e) {
      // ignore or log
    }
  }

  // Pick a single video from gallery or camera
  Future<void> _pickVideo(ImageSource source) async {
    if (!widget.permissions.canPostVideos) return;
    try {
      final XFile? picked = await _picker.pickVideo(source: source);
      if (picked != null) {
        setState(() {
          _mediaFiles = [picked];
          _mediaType = 'video';
        });
      }
    } catch (e) {
      // ignore or log
    }
  }

  void _createPost() {
    if (_textController.text.isEmpty && _mediaFiles.isEmpty) {
      return;
    }

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final user = authProvider.user!;

    PostService().createPost(
      text: _textController.text,
      mediaFiles: _mediaFiles,
      mediaType: _mediaType,
      authorId: user.uid,
      authorDisplayName: user.displayName ?? '',
    );

    _textController.clear();
    setState(() {
      _mediaFiles = [];
      _mediaType = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.permissions.canPost) {
      return const SizedBox.shrink();
    }

    return Card(
      margin: const EdgeInsets.all(8.0),
      child: Padding(
        padding: const EdgeInsets.all(8.0),
        child: Column(
          children: [
            TextField(
              controller: _textController,
              decoration: const InputDecoration(
                hintText: 'What\'s on your mind?'
              ),
            ),
            if (_mediaFiles.isNotEmpty)
              SizedBox(
                height: 100,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: _mediaFiles.length,
                  itemBuilder: (context, index) {
                    return Padding(
                      padding: const EdgeInsets.all(4.0),
                      child: _mediaType == 'image'
                          ? Image.file(File(_mediaFiles[index].path), height: 100, width: 100, fit: BoxFit.cover)
                          : SizedBox(
                              height: 100,
                              width: 160,
                              child: Center(child: Text('Video selected')),
                            ),
                    );
                  },
                ),
              ),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (widget.permissions.canPostImages)
                  IconButton(
                    icon: const Icon(Icons.photo_library, color: Colors.green),
                    onPressed: () => _pickImages(),
                  ),
                if (widget.permissions.canPostVideos)
                  IconButton(
                    icon: const Icon(Icons.videocam, color: Colors.blue),
                    onPressed: () => _pickVideo(ImageSource.gallery),
                  ),
                ElevatedButton(
                  onPressed: _createPost,
                  child: const Text('Post'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
