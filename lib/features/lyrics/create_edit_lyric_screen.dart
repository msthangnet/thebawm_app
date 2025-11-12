import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:myapp/models/lyric.dart';
import 'package:myapp/services/lyric_service.dart';
import 'package:myapp/providers/auth_provider.dart';

class CreateEditLyricScreen extends StatefulWidget {
  final Lyric? lyric;
  const CreateEditLyricScreen({super.key, this.lyric});

  @override
  State<CreateEditLyricScreen> createState() => _CreateEditLyricScreenState();
}

class _CreateEditLyricScreenState extends State<CreateEditLyricScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _contentController = TextEditingController();
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    if (widget.lyric != null) {
      _titleController.text = widget.lyric!.title;
      _contentController.text = widget.lyric!.content;
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final auth = Provider.of<AuthProvider>(context, listen: false);
    if (auth.user == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please log in')));
      return;
    }
    setState(() => _loading = true);
    final service = LyricService();
    try {
      if (widget.lyric == null) {
        final l = Lyric(id: '', title: _titleController.text.trim(), content: _contentController.text.trim(), authorId: auth.user!.uid);
        final id = await service.createLyric(l);
        if (id != null) Navigator.of(context).pop(true);
      } else {
        final ok = await service.updateLyric(widget.lyric!.id, {'title': _titleController.text.trim(), 'content': _contentController.text.trim()});
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
    final isEdit = widget.lyric != null;
    return Scaffold(
      appBar: AppBar(title: Text(isEdit ? 'Edit Lyric' : 'Create Lyric')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            TextFormField(controller: _titleController, decoration: const InputDecoration(labelText: 'Title'), validator: (v) => v == null || v.trim().isEmpty ? 'Title required' : null),
            const SizedBox(height: 8),
            TextFormField(controller: _contentController, decoration: const InputDecoration(labelText: 'Content'), maxLines: 10, validator: (v) => v == null || v.trim().isEmpty ? 'Content required' : null),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: _loading ? null : _submit, child: _loading ? const CircularProgressIndicator() : Text(isEdit ? 'Save' : 'Create'))
          ]),
        ),
      ),
    );
  }
}
