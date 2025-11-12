import 'package:flutter/material.dart';
import 'package:myapp/services/publication_service.dart';
import 'package:myapp/models/publication.dart';
import 'package:myapp/models/publication_page.dart';
import 'package:myapp/services/user_service.dart';
import 'package:myapp/models/user_profile.dart';
import 'package:provider/provider.dart';
import 'package:myapp/providers/auth_provider.dart';
import 'create_edit_book_screen.dart';

class BookDetailScreen extends StatelessWidget {
  final String publicationId;
  const BookDetailScreen({super.key, required this.publicationId});

  @override
  Widget build(BuildContext context) {
    final service = PublicationService();
    final auth = Provider.of<AuthProvider>(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Book')),
      body: FutureBuilder<Publication?>(
        future: service.getPublication(publicationId),
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
          if (snap.hasError) return Center(child: Text('Error: ${snap.error}'));
          final pub = snap.data;
          if (pub == null) return const Center(child: Text('Not found'));
          return Column(
            children: [
              if (pub.coverPhotoUrl != null) Image.network(pub.coverPhotoUrl!, height: 180, width: double.infinity, fit: BoxFit.cover),
              ListTile(
                title: Text(pub.title),
                subtitle: FutureBuilder<UserProfile?>(
                  future: UserService().getUserById(pub.authorId),
                  builder: (context, usnap) {
                    if (usnap.connectionState == ConnectionState.waiting) return Text('by ${pub.authorId}');
                    final up = usnap.data;
                    if (up == null) return Text('by ${pub.authorId}');
                    return Row(children: [if (up.profilePictureUrl != null) Padding(padding: const EdgeInsets.only(right:8.0), child: CircleAvatar(backgroundImage: NetworkImage(up.profilePictureUrl!), radius: 12)), Text('by ${up.displayName}')]);
                  },
                ),
              ),
              if (auth.user?.uid == pub.authorId)
                Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: ElevatedButton.icon(onPressed: () async {
                    final edited = await Navigator.of(context).push(MaterialPageRoute(builder: (_) => CreateEditBookScreen(existingPublication: pub)));
                    if (edited == true) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Book updated')));
                  }, icon: const Icon(Icons.edit), label: const Text('Edit Book')),
                ),
              const Divider(),
              Expanded(
                child: StreamBuilder<List<PublicationPage>>(
                  stream: service.getPagesStream(publicationId),
                  builder: (context, s2) {
                    if (s2.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
                    final pages = s2.data ?? [];
                    if (pages.isEmpty) return const Center(child: Text('No pages yet'));
                    return ListView.builder(
                      itemCount: pages.length,
                      itemBuilder: (context, i) {
                        final p = pages[i];
                        return ListTile(
                          title: Text(p.title),
                          subtitle: Text(p.content.substring(0, p.content.length > 80 ? 80 : p.content.length)),
                          onTap: () {
                            showDialog(context: context, builder: (_) => AlertDialog(title: Text(p.title), content: SingleChildScrollView(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [if (p.imageUrls.isNotEmpty) ...p.imageUrls.map((u) => Padding(padding: const EdgeInsets.only(bottom:8.0), child: Image.network(u))), Text(p.content)])), actions: [TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Close'))]));
                          },
                        );
                      },
                    );
                  },
                ),
              )
            ],
          );
        },
      ),
    );
  }
}
