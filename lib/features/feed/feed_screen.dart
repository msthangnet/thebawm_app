import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:myapp/providers/auth_provider.dart';
import 'package:myapp/services/post_service.dart';
import 'package:myapp/models/post.dart';
import 'package:myapp/widgets/post_card.dart';
import 'package:myapp/widgets/create_post.dart';

class FeedScreen extends StatefulWidget {
  const FeedScreen({super.key});

  @override
  State<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends State<FeedScreen> {
  // Do not keep late futures here because the authenticated user may change.
  // We'll create the combined future inside build when a user is present.

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;
    if (user != null) {
      // futures are created inside the FutureBuilder in build to ensure they're always
      // initialized for the current authenticated user. No-op here.
    }
  }


  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Feed'),
      ),
      body: user == null
          ? const Center(child: Text('Please log in to see your feed.'))
          : FutureBuilder<List<dynamic>>(
              // Create the futures here to ensure they are always initialized when a user exists.
              future: Future.wait([
                PostService().getFeedPosts(user.uid),
                PostService().getPostPermissions(),
              ]),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return Center(child: Text('Error: ${snapshot.error}'));
                }
                if (!snapshot.hasData || snapshot.data!.isEmpty) {
                  // Even if there are no posts, we might want to show the CreatePost widget
                  final permissions = snapshot.data?[1] as PostPermissions?;
                  if (permissions != null) {
                    return Column(
                      children: [
                        CreatePost(permissions: permissions),
                        const Expanded(
                          child: Center(child: Text('No posts in your feed yet.')),
                        ),
                      ],
                    );
                  }
                  return const Center(child: Text('No posts in your feed yet.'));
                }

                final posts = snapshot.data![0] as List<Post>;
                final permissions = snapshot.data![1] as PostPermissions;

                return ListView.builder(
                  itemCount: posts.length + 1,
                  itemBuilder: (context, index) {
                    if (index == 0) {
                      return CreatePost(permissions: permissions);
                    }
                    final post = posts[index - 1];
                    return PostCard(post: post);
                  },
                );
              },
            ),
    );
  }
}
