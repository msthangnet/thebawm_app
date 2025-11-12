import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:myapp/services/group_service.dart';
import 'package:myapp/models/group.dart';
import 'package:myapp/providers/auth_provider.dart';

class CreateEditGroupScreen extends StatefulWidget {
  final GroupInfo? group;
  const CreateEditGroupScreen({super.key, this.group});

  @override
  State<CreateEditGroupScreen> createState() => _CreateEditGroupScreenState();
}

class _CreateEditGroupScreenState extends State<CreateEditGroupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _categoryController = TextEditingController();
  final _descriptionController = TextEditingController();
  File? _profileImageFile;
  File? _coverImageFile;
  final ImagePicker _picker = ImagePicker();
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    if (widget.group != null) {
      _nameController.text = widget.group!.name;
      _categoryController.text = widget.group!.category;
      _descriptionController.text = widget.group!.description ?? '';
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _categoryController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _pickProfileImage() async {
    final picked = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (picked != null) setState(() => _profileImageFile = File(picked.path));
  }

  Future<void> _pickCoverImage() async {
    final picked = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (picked != null) setState(() => _coverImageFile = File(picked.path));
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final user = auth.user;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please log in to create a group')));
      return;
    }

    setState(() => _loading = true);
    final service = GroupService();
    try {
      if (widget.group == null) {
        final group = GroupInfo(
          id: '',
          groupId: '',
          name: _nameController.text.trim(),
          category: _categoryController.text.trim(),
          description: _descriptionController.text.trim(),
          profilePictureUrl: null,
          coverImageUrl: null,
          ownerId: user.uid,
          admins: [user.uid],
          members: [user.uid],
          createdAt: DateTime.now(),
          groupType: 'public',
        );
        final id = await service.createGroupWithImages(group, profileImage: _profileImageFile, coverImage: _coverImageFile);
        if (id != null) Navigator.of(context).pop(true);
      } else {
        final updates = {
          'name': _nameController.text.trim(),
          'category': _categoryController.text.trim(),
          'description': _descriptionController.text.trim(),
        };
        final ok = await service.updateGroup(widget.group!.id, updates, profileImage: _profileImageFile, coverImage: _coverImageFile);
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
    final isEdit = widget.group != null;
    return Scaffold(
      appBar: AppBar(title: Text(isEdit ? 'Edit Group' : 'Create Group')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextFormField(
                  controller: _nameController,
                  decoration: const InputDecoration(labelText: 'Group name'),
                  validator: (v) => v == null || v.trim().isEmpty ? 'Please enter a group name' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _categoryController,
                  decoration: const InputDecoration(labelText: 'Category'),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _descriptionController,
                  decoration: const InputDecoration(labelText: 'Description'),
                  maxLines: 4,
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    ElevatedButton.icon(onPressed: _pickProfileImage, icon: const Icon(Icons.photo), label: const Text('Profile Image')),
                    const SizedBox(width: 8),
                    ElevatedButton.icon(onPressed: _pickCoverImage, icon: const Icon(Icons.photo_library), label: const Text('Cover Image')),
                  ],
                ),
                const SizedBox(height: 12),
                if (_profileImageFile != null) Image.file(_profileImageFile!, height: 100, fit: BoxFit.cover),
                if (_coverImageFile != null) Image.file(_coverImageFile!, height: 120, fit: BoxFit.cover),
                const SizedBox(height: 20),
                ElevatedButton(onPressed: _loading ? null : _submit, child: _loading ? const CircularProgressIndicator() : Text(isEdit ? 'Save Changes' : 'Create Group')),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
