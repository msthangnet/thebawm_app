import 'package:flutter/material.dart';
import 'dart:io';
import 'package:image_picker/image_picker.dart';
import 'package:myapp/models/post.dart';
import 'package:myapp/providers/auth_provider.dart';
import 'package:myapp/services/post_service.dart';
import 'package:provider/provider.dart';
import 'package:fluttertoast/fluttertoast.dart';

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
  bool _loading = false;

  Future<void> _pickImages() async {
    final user = Provider.of<AuthProvider>(context, listen: false).userProfile;
    final userType = user?.userType ?? 'Inactive';
    if (!widget.permissions.canUploadImage.contains(userType)) {
      Fluttertoast.showToast(msg: "You don't have permission to upload images.");
      return;
    }

    final imageLimit = widget.permissions.imageUploadLimit[userType] ?? 1;
    if (_mediaFiles.length >= imageLimit) {
      Fluttertoast.showToast(msg: "You can only upload up to $imageLimit images.");
      return;
    }

    try {
      final List<XFile> pickedFiles = await _picker.pickMultiImage();
      if (pickedFiles.isNotEmpty) {
        if ((_mediaFiles.length + pickedFiles.length) > imageLimit) {
          Fluttertoast.showToast(msg: "You can only upload up to $imageLimit images.");
          // Trim the selection if it exceeds the limit
          final remainingCapacity = imageLimit - _mediaFiles.length;
          final filesToAdd = pickedFiles.sublist(0, remainingCapacity > 0 ? remainingCapacity : 0);
          setState(() {
            _mediaFiles.addAll(filesToAdd);
            _mediaType = 'image';
          });
        } else {
          setState(() {
            _mediaFiles.addAll(pickedFiles);
            _mediaType = 'image';
          });
        }
      }
    } catch (e) {
      Fluttertoast.showToast(msg: "An error occurred while picking images.");
    }
  }

  Future<void> _pickVideo() async {
    final user = Provider.of<AuthProvider>(context, listen: false).userProfile;
    final userType = user?.userType ?? 'Inactive';
    if (!widget.permissions.canUploadVideo.contains(userType)) {
      Fluttertoast.showToast(msg: "You don't have permission to upload videos.");
      return;
    }
    if (_mediaFiles.isNotEmpty) {
       Fluttertoast.showToast(msg: "You cannot mix images and videos.");
      return;
    }
    try {
      final XFile? picked = await _picker.pickVideo(source: ImageSource.gallery);
      if (picked != null) {
        setState(() {
          _mediaFiles = [picked];
          _mediaType = 'video';
        });
      }
    } catch (e) {
      Fluttertoast.showToast(msg: "An error occurred while picking a video.");
    }
  }

  void _createPost() async {
    if (_textController.text.isEmpty && _mediaFiles.isEmpty) {
      return;
    }
    setState(() {
      _loading = true;
    });

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final user = authProvider.user!;

    try {
      await PostService().createPost(
        text: _textController.text,
        mediaFiles: _mediaFiles,
        mediaType: _mediaType,
        authorId: user.uid,
        authorDisplayName: user.displayName ?? '',
        postType: 'user', // Explicitly user post
      );

      _textController.clear();
      setState(() {
        _mediaFiles = [];
        _mediaType = null;
      });

      Fluttertoast.showToast(msg: "Post created!");
    } catch(e) {
      Fluttertoast.showToast(msg: "Failed to create post: $e");
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final userType = authProvider.userProfile?.userType ?? 'Inactive';
    
    if (!widget.permissions.canPost.contains(userType)) {
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
                      child: Stack(
                        children: [
                          _mediaType == 'image'
                              ? Image.file(File(_mediaFiles[index].path), height: 100, width: 100, fit: BoxFit.cover)
                              : const SizedBox(
                                  height: 100,
                                  width: 160,
                                  child: Center(child: Icon(Icons.videocam, size: 50)),
                                ),
                          Positioned(
                            top: 0,
                            right: 0,
                            child: GestureDetector(
                              onTap: () {
                                setState(() {
                                  _mediaFiles.removeAt(index);
                                  if(_mediaFiles.isEmpty) _mediaType = null;
                                });
                              },
                              child: const CircleAvatar(
                                radius: 12,
                                backgroundColor: Colors.black54,
                                child: Icon(Icons.close, color: Colors.white, size: 16),
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (widget.permissions.canUploadImage.contains(userType))
                  IconButton(
                    icon: const Icon(Icons.photo_library, color: Colors.green),
                    onPressed: () => _pickImages(),
                  ),
                if (widget.permissions.canUploadVideo.contains(userType))
                  IconButton(
                    icon: const Icon(Icons.videocam, color: Colors.blue),
                    onPressed: () => _pickVideo(),
                  ),
                ElevatedButton(
                  onPressed: _loading ? null : _createPost,
                  child: _loading ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2,)) : const Text('Post'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
