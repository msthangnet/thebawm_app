import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:myapp/services/video_service.dart';
import 'package:myapp/models/video.dart';
import 'package:myapp/providers/auth_provider.dart';
import 'package:myapp/services/user_service.dart';
import 'package:myapp/models/user_profile.dart';
import 'create_edit_video_screen.dart';

class VideosListScreen extends StatelessWidget {
  const VideosListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final service = VideoService();
    final auth = Provider.of<AuthProvider>(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Videos'), actions: [
        if (auth.user != null)
          IconButton(onPressed: () async {
            final created = await Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CreateEditVideoScreen()));
            if (created == true) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Video created')));
          }, icon: const Icon(Icons.add))
      ]),
      body: StreamBuilder<List<VideoInfo>>(
        stream: service.getVideosStream(),
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
          if (snap.hasError) return Center(child: Text('Error: ${snap.error}'));
          final list = snap.data ?? [];
          if (list.isEmpty) return const Center(child: Text('No videos yet'));
          return ListView.builder(
            itemCount: list.length,
            itemBuilder: (context, i) {
              final v = list[i];
              return ListTile(
                leading: v.thumbnailUrl != null ? CircleAvatar(backgroundImage: NetworkImage(v.thumbnailUrl!)) : const CircleAvatar(child: Icon(Icons.play_circle)),
                title: Text(v.title),
                subtitle: FutureBuilder(
                  future: UserService().getUserById(v.authorId),
                  builder: (context, usnap) {
                    if (usnap.connectionState == ConnectionState.waiting) return Text(v.authorId);
                    final up = usnap.data as UserProfile?;
                    if (up == null) return Text(v.authorId);
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
