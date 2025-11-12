import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:myapp/models/video.dart';
import 'package:myapp/services/video_service.dart';
import 'package:myapp/providers/auth_provider.dart';

class CreateEditVideoScreen extends StatefulWidget {
  final VideoInfo? video;
  const CreateEditVideoScreen({super.key, this.video});

  @override
  State<CreateEditVideoScreen> createState() => _CreateEditVideoScreenState();
}

class _CreateEditVideoScreenState extends State<CreateEditVideoScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  File? _videoFile;
  File? _thumbnailFile;
  bool _removeThumbnail = false;
  bool _removeVideo = false;
  final ImagePicker _picker = ImagePicker();
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    if (widget.video != null) {
      _titleController.text = widget.video!.title;
      _descriptionController.text = widget.video!.description ?? '';
    }
  }

  Future<void> _pickVideo() async {
    final picked = await _picker.pickVideo(source: ImageSource.gallery);
    if (picked != null) setState(() => _videoFile = File(picked.path));
  }

  Future<void> _pickThumb() async {
    final picked = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (picked != null) setState(() => _thumbnailFile = File(picked.path));
  }

  void _removeExistingThumbnail() {
    setState(() {
      _removeThumbnail = true;
      _thumbnailFile = null;
    });
  }

  void _removeExistingVideo() {
    setState(() {
      _removeVideo = true;
      _videoFile = null;
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final auth = Provider.of<AuthProvider>(context, listen: false);
    if (auth.user == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please log in')));
      return;
    }
    setState(() => _loading = true);
    final service = VideoService();
    try {
      if (widget.video == null) {
        final v = VideoInfo(id: '', title: _titleController.text.trim(), description: _descriptionController.text.trim(), authorId: auth.user!.uid);
        final id = await service.createVideo(v, videoFile: _videoFile, thumbnail: _thumbnailFile);
        if (id != null) Navigator.of(context).pop(true);
      } else {
        final updates = {'title': _titleController.text.trim(), 'description': _descriptionController.text.trim()};
        final ok = await service.updateVideo(widget.video!.id, updates, videoFile: _videoFile, thumbnail: _thumbnailFile, removeThumbnail: _removeThumbnail, removeVideo: _removeVideo);
        if (ok) Navigator.of(context).pop(true);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.video != null;
    return Scaffold(
      appBar: AppBar(title: Text(isEdit ? 'Edit Video' : 'Create Video')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            TextFormField(controller: _titleController, decoration: const InputDecoration(labelText: 'Title'), validator: (v) => v == null || v.trim().isEmpty ? 'Title required' : null),
            const SizedBox(height: 8),
            TextFormField(controller: _descriptionController, decoration: const InputDecoration(labelText: 'Description'), maxLines: 4),
            const SizedBox(height: 12),
            // Existing video and thumbnail preview / remove
            if (widget.video != null && widget.video!.videoUrl != null && !_removeVideo) ...[
              Row(children: [Expanded(child: Text('Existing video: ${widget.video!.videoUrl!.split('/').last}')), IconButton(onPressed: _removeExistingVideo, icon: const Icon(Icons.delete))]),
            ],
            ElevatedButton.icon(onPressed: _pickVideo, icon: const Icon(Icons.video_library), label: const Text('Pick Video')),
            const SizedBox(height: 8),
            if (widget.video != null && widget.video!.thumbnailUrl != null && !_removeThumbnail) ...[
              Row(children: [if (widget.video!.thumbnailUrl != null) Image.network(widget.video!.thumbnailUrl!, width: 80, height: 60, fit: BoxFit.cover), const SizedBox(width: 8), IconButton(onPressed: _removeExistingThumbnail, icon: const Icon(Icons.delete))]),
            ],
            ElevatedButton.icon(onPressed: _pickThumb, icon: const Icon(Icons.photo), label: const Text('Pick Thumbnail')),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: _loading ? null : _submit, child: _loading ? const CircularProgressIndicator() : Text(isEdit ? 'Save' : 'Create'))
          ]),
        ),
      ),
    );
  }
}
