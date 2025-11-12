import 'package:flutter/material.dart';
import 'package:myapp/services/page_service.dart';
import 'package:provider/provider.dart';
import 'package:myapp/providers/auth_provider.dart';
import 'create_edit_page_screen.dart';
import 'package:myapp/models/page.dart';
import 'page_detail_screen.dart';

class PagesListScreen extends StatelessWidget {
  const PagesListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final service = PageService();
    final auth = Provider.of<AuthProvider>(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Pages'), actions: [
        if (auth.user != null)
          IconButton(onPressed: () async {
            final created = await Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CreateEditPageScreen()));
            if (created == true) {
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Page created')));
            }
          }, icon: const Icon(Icons.add))
      ]),
      body: StreamBuilder<List<PageInfo>>(
        stream: service.getPagesStream(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }
          final pages = snapshot.data ?? [];
          if (pages.isEmpty) {
            return const Center(child: Text('No pages yet'));
          }
          return ListView.builder(
            itemCount: pages.length,
            itemBuilder: (context, index) {
              final p = pages[index];
              return ListTile(
                leading: p.profilePictureUrl != null
                    ? CircleAvatar(backgroundImage: NetworkImage(p.profilePictureUrl!))
                    : const CircleAvatar(child: Icon(Icons.flag)),
                title: Text(p.name),
                subtitle: Text(p.category),
                onTap: () {
                  Navigator.of(context).push(MaterialPageRoute(builder: (_) => PageDetailScreen(pageId: p.id)));
                },
              );
            },
          );
        },
      ),
    );
  }
}
