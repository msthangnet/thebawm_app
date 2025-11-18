import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:myapp/models/product.dart';
import 'package:myapp/providers/auth_provider.dart';
import 'package:myapp/services/marketplace_service.dart';

class CreateEditProductScreen extends StatefulWidget {
  final Product? product;
  const CreateEditProductScreen({super.key, this.product});

  @override
  State<CreateEditProductScreen> createState() => _CreateEditProductScreenState();
}

class _CreateEditProductScreenState extends State<CreateEditProductScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _priceController = TextEditingController();
  final List<File> _images = [];
  final _picker = ImagePicker();
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    if (widget.product != null) {
      _titleController.text = widget.product!.title;
      _descController.text = widget.product!.description;
      _priceController.text = widget.product!.price.toString();
    }
  }

  Future<void> _pickImages() async {
    final picked = await _picker.pickMultiImage(imageQuality: 80);
    setState(() => _images.addAll(picked.map((p) => File(p.path))));
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final auth = Provider.of<AuthProvider>(context, listen: false);
    if (auth.user == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please log in')));
      return;
    }
    setState(() => _loading = true);
    final svc = MarketplaceService();
    try {
      if (widget.product == null) {
        final p = Product(id: '', title: _titleController.text.trim(), description: _descController.text.trim(), price: double.tryParse(_priceController.text) ?? 0.0, ownerId: auth.user!.uid);
        final id = await svc.createProduct(p, images: _images);
        if (id != null) Navigator.of(context).pop(true);
      } else {
        final updates = {'title': _titleController.text.trim(), 'description': _descController.text.trim(), 'price': double.tryParse(_priceController.text) ?? 0.0};
        final ok = await svc.updateProduct(widget.product!.id, updates, newImages: _images);
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
    final isEdit = widget.product != null;
    return Scaffold(
      appBar: AppBar(title: Text(isEdit ? 'Edit Product' : 'Create Product')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              TextFormField(controller: _titleController, decoration: const InputDecoration(labelText: 'Title'), validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null),
              const SizedBox(height: 8),
              TextFormField(controller: _descController, decoration: const InputDecoration(labelText: 'Description'), maxLines: 4),
              const SizedBox(height: 8),
              TextFormField(controller: _priceController, decoration: const InputDecoration(labelText: 'Price'), keyboardType: TextInputType.numberWithOptions(decimal: true)),
              const SizedBox(height: 12),
              Wrap(spacing: 8, children: [
                ElevatedButton.icon(onPressed: _pickImages, icon: const Icon(Icons.photo_library), label: const Text('Add Images')),
                if (_images.isNotEmpty) Text('${_images.length} new images')
              ]),
              const SizedBox(height: 12),
              if (_images.isNotEmpty) Wrap(spacing: 8, children: _images.map((f) => Image.file(f, width: 80, height: 80, fit: BoxFit.cover)).toList()),
              const SizedBox(height: 20),
              ElevatedButton(onPressed: _loading ? null : _submit, child: _loading ? const CircularProgressIndicator() : Text(isEdit ? 'Save' : 'Create'))
            ]),
          ),
        ),
      ),
    );
  }
}
