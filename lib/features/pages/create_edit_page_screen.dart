import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:myapp/services/page_service.dart';
import 'package:myapp/models/page.dart';
import 'package:myapp/providers/auth_provider.dart';

class CreateEditPageScreen extends StatefulWidget {
  final PageInfo? page;

  const CreateEditPageScreen({super.key, this.page});

  @override
  State<CreateEditPageScreen> createState() => _CreateEditPageScreenState();
}

class _CreateEditPageScreenState extends State<CreateEditPageScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _categoryController = TextEditingController();
  final _descriptionController = TextEditingController();
  File? _profileImageFile;
  File? _coverImageFile;
  bool _loading = false;

  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    if (widget.page != null) {
      _nameController.text = widget.page!.name;
      _categoryController.text = widget.page!.category;
      _descriptionController.text = widget.page!.description ?? '';
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
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please log in to create a page')));
      return;
    }

    setState(() => _loading = true);
    final service = PageService();
    try {
      if (widget.page == null) {
        final page = PageInfo(
          id: '',
          pageId: '',
          name: _nameController.text.trim(),
          category: _categoryController.text.trim(),
          description: _descriptionController.text.trim(),
          profilePictureUrl: null,
          coverImageUrl: null,
          ownerId: user.uid,
          admins: [user.uid],
          followers: [],
          likes: [],
          createdAt: DateTime.now(),
        );

        final id = await service.createPageWithImages(page, profileImage: _profileImageFile, coverImage: _coverImageFile);
        if (id != null) {
          Navigator.of(context).pop(true);
        }
      } else {
        final updates = {
          'name': _nameController.text.trim(),
          'category': _categoryController.text.trim(),
          'description': _descriptionController.text.trim(),
        };
        final ok = await service.updatePage(widget.page!.id, updates, profileImage: _profileImageFile, coverImage: _coverImageFile);
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
    final isEdit = widget.page != null;
    return Scaffold(
      appBar: AppBar(title: Text(isEdit ? 'Edit Page' : 'Create Page')),
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
                  decoration: const InputDecoration(labelText: 'Page name'),
                  validator: (v) => v == null || v.trim().isEmpty ? 'Please enter a page name' : null,
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
                ElevatedButton(onPressed: _loading ? null : _submit, child: _loading ? const CircularProgressIndicator() : Text(isEdit ? 'Save Changes' : 'Create Page')),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
