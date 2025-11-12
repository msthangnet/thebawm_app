import 'package:flutter/material.dart';
import 'package:myapp/services/about_service.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final service = AboutService();
    return Scaffold(
      appBar: AppBar(title: const Text('About BAWM')),
      body: FutureBuilder(
        future: service.getAbout(),
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
          if (snap.hasError) return Center(child: Text('Error: ${snap.error}'));
          final about = snap.data;
          if (about == null) return const Center(child: Text('No information available'));
          return Padding(
            padding: const EdgeInsets.all(16.0),
            child: SingleChildScrollView(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(about.title, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)), const SizedBox(height: 12), Text(about.content)])),
          );
        },
      ),
    );
  }
}
