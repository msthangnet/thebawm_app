import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:myapp/models/publication.dart';
import 'package:myapp/models/publication_page.dart';
import 'package:myapp/providers/auth_provider.dart';
import 'package:myapp/services/publication_service.dart';

class CreateEditBookScreen extends StatefulWidget {
  final Publication? existingPublication;
  const CreateEditBookScreen({super.key, this.existingPublication});

  @override
  State<CreateEditBookScreen> createState() => _CreateEditBookScreenState();
}

class _CreateEditBookScreenState extends State<CreateEditBookScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _bookIdController = TextEditingController();
  final _descriptionController = TextEditingController();
  DateTime? _publishDate;
  File? _coverFile;
  final ImagePicker _picker = ImagePicker();
  bool _loading = false;

  List<PublicationPage> _pages = [];
  Map<String, List<File>> _pageFiles = {};

  @override
  void initState() {
    super.initState();
    if (widget.existingPublication != null) {
      final p = widget.existingPublication!;
      _titleController.text = p.title;
      _bookIdController.text = p.bookId;
      _descriptionController.text = p.description ?? '';
      _publishDate = p.publishDate;
      // pages will be loaded in service after create/update; for edit we keep empty local pages managed via UI
      // preload existing pages for edit
      WidgetsBinding.instance.addPostFrameCallback((_) async {
        final service = PublicationService();
        final pages = await service.getPagesOnce(p.id);
        setState(() {
          _pages = pages;
        });
      });
    } else {
      // default one page
      _pages = [PublicationPage(id: 'p-${DateTime.now().millisecondsSinceEpoch}', title: 'Page 1', content: '', order: 0)];
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _bookIdController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _pickCover() async {
    final picked = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (picked != null) setState(() => _coverFile = File(picked.path));
  }

  void _addPage() {
    final id = 'p-${DateTime.now().millisecondsSinceEpoch}';
    setState(() => _pages.add(PublicationPage(id: id, title: 'Page ${_pages.length + 1}', content: '', order: _pages.length)));
  }

  void _removePage(int index) {
    final id = _pages[index].id;
    setState(() {
      _pages.removeAt(index);
      _pageFiles.remove(id);
    });
  }

  Future<void> _pickPageImages(String pageId) async {
    final picked = await _picker.pickMultiImage(imageQuality: 80);
    if (picked != null && picked.isNotEmpty) {
      setState(() {
        final files = picked.map((p) => File(p.path)).toList();
        _pageFiles[pageId] = [...?_pageFiles[pageId], ...files];
      });
    }
  }

  Future<void> _removeExistingPageImage(String pageId, String url) async {
    if (widget.existingPublication == null) return;
    final pubId = widget.existingPublication!.id;
    final svc = PublicationService();
    final ok = await svc.removePageImageUrl(pubId, pageId, url);
    if (ok) {
      setState(() {
        final page = _pages.firstWhere((p) => p.id == pageId, orElse: () => PublicationPage(id: pageId, title: '', content: '', order: 0));
        page.imageUrls.remove(url);
      });
    } else {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to remove image')));
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final user = auth.user;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please log in to publish a book')));
      return;
    }
    setState(() => _loading = true);
    final service = PublicationService();
    try {
      if (widget.existingPublication == null) {
        final pub = Publication(
          id: '',
          bookId: _bookIdController.text.trim(),
          title: _titleController.text.trim(),
          description: _descriptionController.text.trim(),
          coverPhotoUrl: null,
          tags: [],
          authorId: user.uid,
          isPublished: _publishDate == null || (_publishDate != null && _publishDate!.isBefore(DateTime.now())),
          publishDate: _publishDate,
        );

  final id = await service.createPublicationWithPages(pub, coverFile: _coverFile, pageFiles: _pageFiles, pages: _pages);
        if (id != null) Navigator.of(context).pop(true);
      } else {
        final updates = {
          'title': _titleController.text.trim(),
          'description': _descriptionController.text.trim(),
          'publishDate': _publishDate != null ? _publishDate : null,
          'isPublished': _publishDate == null || (_publishDate != null && _publishDate!.isBefore(DateTime.now())),
        };
  final ok = await service.updatePublication(widget.existingPublication!.id, updates, coverFile: _coverFile, pageFiles: _pageFiles, pages: _pages);
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
    final isEdit = widget.existingPublication != null;
    return Scaffold(
      appBar: AppBar(title: Text(isEdit ? 'Edit Book' : 'Create Book')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextFormField(controller: _titleController, decoration: const InputDecoration(labelText: 'Title'), validator: (v) => v == null || v.trim().isEmpty ? 'Please enter a title' : null),
                const SizedBox(height: 12),
                TextFormField(controller: _bookIdController, decoration: const InputDecoration(labelText: 'Book ID'), enabled: !isEdit, validator: (v) => v == null || v.trim().length < 3 ? 'Book ID must be at least 3 chars' : null),
                const SizedBox(height: 12),
                TextFormField(controller: _descriptionController, decoration: const InputDecoration(labelText: 'Description'), maxLines: 4),
                const SizedBox(height: 12),
                Row(children: [ElevatedButton.icon(onPressed: _pickCover, icon: const Icon(Icons.photo), label: const Text('Pick Cover')), if (_coverFile != null) const SizedBox(width: 8), if (_coverFile != null) Image.file(_coverFile!, width: 80, height: 80, fit: BoxFit.cover)]),
                const SizedBox(height: 16),
                const Text('Pages', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _pages.length,
                  itemBuilder: (context, index) {
                    final page = _pages[index];
                    return Card(
                      child: Padding(
                        padding: const EdgeInsets.all(8.0),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                          TextFormField(initialValue: page.title, decoration: const InputDecoration(labelText: 'Page Title'), onChanged: (v) => page.title = v),
                          const SizedBox(height: 8),
                          TextFormField(initialValue: page.content, decoration: const InputDecoration(labelText: 'Content'), maxLines: 6, onChanged: (v) => page.content = v),
                          const SizedBox(height: 8),
                          const SizedBox(height: 8),
                          if ((page.imageUrls ?? []).isNotEmpty) ...[
                            const Text('Existing Images', style: TextStyle(fontWeight: FontWeight.w600)),
                            const SizedBox(height: 8),
                            Wrap(spacing: 8, children: page.imageUrls.map((u) => Stack(children: [
                              Container(width: 80, height: 80, color: Colors.grey.shade200, child: Image.network(u, fit: BoxFit.cover)),
                              Positioned(right: 0, top: 0, child: IconButton(icon: const Icon(Icons.close, size: 18), onPressed: () => _removeExistingPageImage(page.id, u)))
                            ])).toList()),
                            const SizedBox(height: 8),
                          ],
                          if ((_pageFiles[page.id] ?? []).isNotEmpty) ...[
                            const Text('New Images (to be uploaded)', style: TextStyle(fontWeight: FontWeight.w600)),
                            const SizedBox(height: 8),
                            Wrap(spacing: 8, children: (_pageFiles[page.id] ?? []).map((f) => Stack(children: [
                              Container(width: 80, height: 80, color: Colors.grey.shade200, child: Image.file(f, fit: BoxFit.cover)),
                              Positioned(right: 0, top: 0, child: IconButton(icon: const Icon(Icons.close, size: 18), onPressed: () {
                                setState(() {
                                  _pageFiles[page.id] = (_pageFiles[page.id] ?? [])..remove(f);
                                });
                              }))
                            ])).toList()),
                            const SizedBox(height: 8),
                          ],
                          Wrap(spacing: 8, children: [
                            ElevatedButton.icon(onPressed: () => _pickPageImages(page.id), icon: const Icon(Icons.photo_library), label: const Text('Add Images')),
                            TextButton(onPressed: () => _removePage(index), child: const Text('Remove')),
                          ])
                        ]),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 8),
                ElevatedButton.icon(onPressed: _addPage, icon: const Icon(Icons.add), label: const Text('Add Page')),
                const SizedBox(height: 20),
                ElevatedButton(onPressed: _loading ? null : _submit, child: _loading ? const CircularProgressIndicator() : Text(isEdit ? 'Save Changes' : 'Create Book'))
              ],
            ),
          ),
        ),
      ),
    );
  }
}
