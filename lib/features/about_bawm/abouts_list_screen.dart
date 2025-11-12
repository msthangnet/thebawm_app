import 'package:flutter/material.dart';
import 'package:myapp/services/about_bawm_service.dart';
import 'package:myapp/models/about_bawm.dart';
import 'package:myapp/features/about_bawm/about_bawm_card.dart';

class AboutsListScreen extends StatelessWidget {
  const AboutsListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final svc = AboutBawmService();
    return Scaffold(
      appBar: AppBar(title: const Text('About BAWM')),
      body: StreamBuilder<List<AboutBawm>>(
        stream: svc.getAboutsStream(),
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
          if (snap.hasError) return Center(child: Text('Error: ${snap.error}'));
          final items = snap.data ?? [];
          if (items.isEmpty) return const Center(child: Text('No content yet'));
          return Padding(
            padding: const EdgeInsets.all(12.0),
            child: GridView.builder(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, childAspectRatio: 0.75, crossAxisSpacing: 12, mainAxisSpacing: 12),
              itemCount: items.length,
              itemBuilder: (context, index) {
                final pub = items[index];
                return AboutBawmCard(publication: pub, onDeleted: () { /* could show snackbar */ });
              },
            ),
          );
        },
      ),
    );
  }
}
