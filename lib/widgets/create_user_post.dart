import 'package:flutter/material.dart';
import 'package:myapp/services/post_service.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';

import 'package:myapp/models/post.dart';

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
  String? _mediaType;
  DateTime? _scheduledAt;
  PostPermissions? _permissions;
  int _postsToday = 0;
  bool _checking = true;
  String _userType = 'Inactive';

  Future<void> _createPost() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    final userDoc = await FirebaseFirestore.instance.collection('users').doc(user.uid).get();
    final displayName = userDoc.exists ? (userDoc.data()!['displayName'] ?? user.displayName ?? '') : (user.displayName ?? '');

    if ((_postController.text.isEmpty) && _mediaFiles.isEmpty) return;

    final userType = userDoc.exists ? (userDoc.data()!['userType'] ?? 'Inactive') : 'Inactive';
    final perms = _permissions ?? PostPermissions.defaultPermissions;
    final dailyLimit = perms.dailyPostLimit[userType] ?? 0;
    if (_postsToday >= dailyLimit) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Daily post limit reached.')));
      return;
    }

    setState(() {});

    try {
      await _postService.createPost(
        text: _postController.text,
        mediaFiles: _mediaFiles,
        mediaType: _mediaType,
        authorId: user.uid,
        authorDisplayName: displayName,
        postType: 'user',
        scheduledAt: _scheduledAt,
        source: "Post on user timeline '$displayName'",
      );

      if (!mounted) return;

      _postController.clear();
      setState(() {
        _mediaFiles = [];
        _mediaType = null;
        _scheduledAt = null;
      });
      widget.onPostCreated();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to create post: $e')));
    }
  }

  Future<void> _pickImage() async {
    if (_permissions == null) await _loadPermissions();
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;
    final userDoc = await FirebaseFirestore.instance.collection('users').doc(user.uid).get();
    final userType = userDoc.exists ? (userDoc.data()!['userType'] ?? 'Inactive') : 'Inactive';
    final imageLimit = _permissions?.imageUploadLimit[userType] ?? 1;
    final List<XFile> pickedFiles = await _picker.pickMultiImage();
    if (pickedFiles.isEmpty) return;
    if ((_mediaFiles.length + pickedFiles.length) > imageLimit) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('You can only upload up to $imageLimit images.')));
      final remaining = imageLimit - _mediaFiles.length;
      setState(() {
        if (remaining > 0) _mediaFiles.addAll(pickedFiles.take(remaining));
        _mediaType = 'image';
      });
      return;
    }

    if (!mounted) return;
    setState(() {
      _mediaFiles.addAll(pickedFiles);
      _mediaType = 'image';
    });
  }

  Future<void> _pickSchedule() async {
    final now = DateTime.now();
    // ignore: use_build_context_synchronously
    final date = await showDatePicker(
      context: context,
      initialDate: now.add(const Duration(minutes: 10)),
      firstDate: now,
      lastDate: DateTime(now.year + 5),
    );
    if (date == null) return;
    // ignore: use_build_context_synchronously
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(now.add(const Duration(minutes: 10))),
    );
    if (time == null) return;
    final scheduled = DateTime(date.year, date.month, date.day, time.hour, time.minute);
    if (scheduled.isBefore(now)) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Scheduled time must be in the future.')));
      return;
    }
    if (!mounted) return;
    setState(() {
      _scheduledAt = scheduled;
    });
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<void>(
      future: _ensureLoaded(),
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const SizedBox();
        }

        final user = FirebaseAuth.instance.currentUser;
        if (user == null) return const SizedBox();

        final canPost = (_permissions ?? PostPermissions.defaultPermissions).canPost.contains(_userType);
        if (!canPost) return const SizedBox();

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
                      onPressed: () async {
                        if (_permissions == null) await _loadPermissions();
                        final user = FirebaseAuth.instance.currentUser;
                        if (user == null) return;
                        final userDoc = await FirebaseFirestore.instance.collection('users').doc(user.uid).get();
                        final userType = userDoc.exists ? (userDoc.data()!['userType'] ?? 'Inactive') : 'Inactive';
                        if (!(_permissions?.canUploadImage.contains(userType) ?? false)) {
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('You do not have permission to upload images.')));
                          return;
                        }
                        await _pickImage();
                      },
                    ),
                    IconButton(
                      icon: const Icon(Icons.videocam, color: Colors.blue),
                      onPressed: () async {
                        if (_permissions == null) await _loadPermissions();
                        final user = FirebaseAuth.instance.currentUser;
                        if (user == null) return;
                        final userDoc = await FirebaseFirestore.instance.collection('users').doc(user.uid).get();
                        final userType = userDoc.exists ? (userDoc.data()!['userType'] ?? 'Inactive') : 'Inactive';
                        if (!(_permissions?.canUploadVideo.contains(userType) ?? false)) {
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('You do not have permission to upload videos.')));
                          return;
                        }
                        // pick video
                        final picked = await _picker.pickVideo(source: ImageSource.gallery);
                        if (picked != null) {
                          if (_mediaFiles.isNotEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('You cannot mix images and videos.')));
                            return;
                          }
                          setState(() {
                            _mediaFiles = [picked];
                            _mediaType = 'video';
                          });
                        }
                      },
                    ),
                    IconButton(
                      icon: const Icon(Icons.schedule, color: Colors.orange),
                      onPressed: () async {
                        await _pickSchedule();
                      },
                    ),
                  ],
                ),
                Row(
                  children: [
                    if (_scheduledAt != null)
                      Padding(
                        padding: const EdgeInsets.only(right: 8.0),
                        child: Chip(
                          label: Text('Scheduled: ${_scheduledAt!.toLocal().toString().substring(0,16)}'),
                          deleteIcon: const Icon(Icons.close),
                          onDeleted: () {
                            setState(() { _scheduledAt = null; });
                          },
                        ),
                      ),
                    ElevatedButton(
                      onPressed: _createPost,
                      child: const Text('Post'),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
        );
      },
    );
  }

  Future<void> _loadPermissions() async {
    try {
      _permissions = await PostService().getPostPermissions();
    } catch (_) {
      _permissions = PostPermissions.defaultPermissions;
    }

    // also load user type and posts today count
    final user = FirebaseAuth.instance.currentUser;
    if (user != null) {
      final userDoc = await FirebaseFirestore.instance.collection('users').doc(user.uid).get();
      _userType = userDoc.exists ? (userDoc.data()!['userType'] ?? 'Inactive') : 'Inactive';
    }

    await _loadPostsToday();
  }

  Future<void> _loadPostsToday() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;
    final since = DateTime.now().subtract(const Duration(hours: 24));
    final q = await FirebaseFirestore.instance
        .collection('usersPost')
        .where('authorId', isEqualTo: user.uid)
        .where('createdAt', isGreaterThanOrEqualTo: Timestamp.fromDate(since))
        .get();
    if (!mounted) return;
    setState(() {
      _postsToday = q.size;
      _checking = false;
    });
  }

  Future<void> _ensureLoaded() async {
    if (_permissions == null || _checking) {
      await _loadPermissions();
    }
  }
}
