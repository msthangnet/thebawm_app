import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:myapp/services/event_service.dart';
import 'package:myapp/models/event.dart';
import 'package:myapp/providers/auth_provider.dart';

class CreateEditEventScreen extends StatefulWidget {
  final EventInfo? event;
  const CreateEditEventScreen({super.key, this.event});

  @override
  State<CreateEditEventScreen> createState() => _CreateEditEventScreenState();
}

class _CreateEditEventScreenState extends State<CreateEditEventScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _categoryController = TextEditingController();
  final _descriptionController = TextEditingController();
  DateTime? _startDate;
  DateTime? _endDate;
  File? _profileImageFile;
  File? _coverImageFile;
  final ImagePicker _picker = ImagePicker();
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    if (widget.event != null) {
      _nameController.text = widget.event!.name;
      _categoryController.text = widget.event!.category;
      _descriptionController.text = widget.event!.description ?? '';
      _startDate = widget.event!.startDate;
      _endDate = widget.event!.endDate;
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
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please log in to create an event')));
      return;
    }

    setState(() => _loading = true);
    final service = EventService();
    try {
      if (widget.event == null) {
        final event = EventInfo(
          id: '',
          eventId: '',
          name: _nameController.text.trim(),
          category: _categoryController.text.trim(),
          description: _descriptionController.text.trim(),
          profilePictureUrl: null,
          coverImageUrl: null,
          ownerId: user.uid,
          admins: [user.uid],
          participants: [user.uid],
          startDate: _startDate,
          endDate: _endDate,
          createdAt: DateTime.now(),
          eventType: 'public',
        );
        final id = await service.createEventWithImages(event, profileImage: _profileImageFile, coverImage: _coverImageFile);
        if (id != null) Navigator.of(context).pop(true);
      } else {
        final updates = {
          'name': _nameController.text.trim(),
          'category': _categoryController.text.trim(),
          'description': _descriptionController.text.trim(),
          'startDate': _startDate?.toIso8601String(),
          'endDate': _endDate?.toIso8601String(),
        };
        final ok = await service.updateEvent(widget.event!.id, updates, profileImage: _profileImageFile, coverImage: _coverImageFile);
        if (ok) Navigator.of(context).pop(true);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _pickStartDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(context: context, initialDate: _startDate ?? now, firstDate: now.subtract(const Duration(days: 365)), lastDate: DateTime(now.year + 5));
    if (picked != null) setState(() => _startDate = picked);
  }

  Future<void> _pickEndDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(context: context, initialDate: _endDate ?? ( _startDate ?? now), firstDate: now.subtract(const Duration(days: 365)), lastDate: DateTime(now.year + 5));
    if (picked != null) setState(() => _endDate = picked);
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.event != null;
    return Scaffold(
      appBar: AppBar(title: Text(isEdit ? 'Edit Event' : 'Create Event')),
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
                  decoration: const InputDecoration(labelText: 'Event name'),
                  validator: (v) => v == null || v.trim().isEmpty ? 'Please enter an event name' : null,
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
                    ElevatedButton.icon(onPressed: _pickStartDate, icon: const Icon(Icons.date_range), label: Text(_startDate == null ? 'Start Date' : _startDate!.toLocal().toString().split(' ')[0])),
                    const SizedBox(width: 8),
                    ElevatedButton.icon(onPressed: _pickEndDate, icon: const Icon(Icons.date_range), label: Text(_endDate == null ? 'End Date' : _endDate!.toLocal().toString().split(' ')[0])),
                  ],
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
                ElevatedButton(onPressed: _loading ? null : _submit, child: _loading ? const CircularProgressIndicator() : Text(isEdit ? 'Save Changes' : 'Create Event')),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
