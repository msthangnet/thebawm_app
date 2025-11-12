import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:myapp/services/lyric_service.dart';
import 'package:myapp/models/lyric.dart';
import 'package:myapp/providers/auth_provider.dart';
import 'package:myapp/services/user_service.dart';
import 'package:myapp/models/user_profile.dart';
import 'create_edit_lyric_screen.dart';

class LyricsListScreen extends StatelessWidget {
  const LyricsListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final service = LyricService();
    final auth = Provider.of<AuthProvider>(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Lyrics'), actions: [
        if (auth.user != null)
          IconButton(onPressed: () async {
            final created = await Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CreateEditLyricScreen()));
            if (created == true) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Lyric created')));
          }, icon: const Icon(Icons.add))
      ]),
      body: StreamBuilder<List<Lyric>>(
        stream: service.getLyricsStream(),
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
          if (snap.hasError) return Center(child: Text('Error: ${snap.error}'));
          final list = snap.data ?? [];
          if (list.isEmpty) return const Center(child: Text('No lyrics yet'));
          return ListView.builder(
            itemCount: list.length,
            itemBuilder: (context, i) {
              final l = list[i];
              return ListTile(
                title: Text(l.title),
                subtitle: FutureBuilder(
                  future: UserService().getUserById(l.authorId),
                  builder: (context, usnap) {
                    if (usnap.connectionState == ConnectionState.waiting) return Text(l.authorId);
                    final up = usnap.data as UserProfile?;
                    if (up == null) return Text(l.authorId);
                    return Row(children: [if (up.profilePictureUrl != null) Padding(padding: const EdgeInsets.only(right:8.0), child: CircleAvatar(backgroundImage: NetworkImage(up.profilePictureUrl!), radius: 10)), Text(up.displayName)]);
                  },
                ),
              );
            },
          );
        },
      ),
    );
  }
}
