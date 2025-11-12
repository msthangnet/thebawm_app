import 'package:flutter/material.dart';
import 'package:myapp/services/post_service.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';

class CreateUserPost extends StatefulWidget {
  final Function onPostCreated;

  const CreateUserPost({super.key, required this.onPostCreated});

  @override
  State<CreateUserPost> createState() => _CreateUserPostState();
}

class _CreateUserPostState extends State<CreateUserPost> {
  final _postController = TextEditingController();
  final _postService = PostService();
  final ImagePicker _picker = ImagePicker();
  List<XFile> _mediaFiles = [];

  Future<void> _createPost() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user != null && (_postController.text.isNotEmpty || _mediaFiles.isNotEmpty)) {
      await _postService.createPost(
        text: _postController.text,
        mediaFiles: _mediaFiles,
        mediaType: 'image', // Placeholder
        authorId: user.uid,
        authorDisplayName: user.displayName ?? '',
      );
      _postController.clear();
      setState(() {
        _mediaFiles = [];
      });
      widget.onPostCreated();
    }
  }

  Future<void> _pickImage() async {
    final List<XFile> pickedFiles = await _picker.pickMultiImage();
    setState(() {
      _mediaFiles = pickedFiles;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2.0,
      margin: const EdgeInsets.all(8.0),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          children: [
            TextField(
              controller: _postController,
              decoration: const InputDecoration(
                hintText: 'What\'s on your mind?',
                border: InputBorder.none,
              ),
              maxLines: null,
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
                      child: Image.file(File(_mediaFiles[index].path)),
                    );
                  },
                ),
              ),
            const Divider(height: 20.0, thickness: 1.0),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.photo_library, color: Colors.green),
                      onPressed: _pickImage,
                    ),
                    IconButton(
                      icon: const Icon(Icons.videocam, color: Colors.blue),
                      onPressed: () {},
                    ),
                  ],
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
