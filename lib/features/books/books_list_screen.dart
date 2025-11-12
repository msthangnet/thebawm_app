import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:myapp/services/publication_service.dart';
import 'package:myapp/models/publication.dart';
import 'package:myapp/providers/auth_provider.dart';
import 'book_detail_screen.dart';
import 'create_edit_book_screen.dart';

class BooksListScreen extends StatelessWidget {
  const BooksListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final service = PublicationService();
    final auth = Provider.of<AuthProvider>(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Books'), actions: [
        if (auth.user != null)
          IconButton(onPressed: () async {
            final created = await Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CreateEditBookScreen()));
            if (created == true) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Book created')));
          }, icon: const Icon(Icons.add))
      ]),
      body: StreamBuilder<List<Publication>>(
        stream: service.getPublicationsStream(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
          if (snapshot.hasError) return Center(child: Text('Error: ${snapshot.error}'));
          final books = snapshot.data ?? [];
          if (books.isEmpty) return const Center(child: Text('No books yet'));
          return ListView.builder(
            itemCount: books.length,
            itemBuilder: (context, index) {
              final b = books[index];
              return ListTile(
                leading: b.coverPhotoUrl != null ? CircleAvatar(backgroundImage: NetworkImage(b.coverPhotoUrl!)) : const CircleAvatar(child: Icon(Icons.book)),
                title: Text(b.title),
                subtitle: Text(b.bookId),
                onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => BookDetailScreen(publicationId: b.id))),
              );
            },
          );
        },
      ),
    );
  }
}
