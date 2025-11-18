import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:myapp/models/post.dart';
import 'package:myapp/services/user_post_service.dart';
import 'package:myapp/services/post_service.dart';
import 'package:myapp/widgets/empty_state.dart';
import 'package:myapp/widgets/post_card.dart';
import 'package:myapp/widgets/create_user_post.dart';

class PostsTab extends StatelessWidget {
  final String userId;

  const PostsTab({super.key, required this.userId});

  @override
  Widget build(BuildContext context) {
    final isCurrentUser = FirebaseAuth.instance.currentUser?.uid == userId;
    // We need permissions for creating posts, so fetch them first.
    return FutureBuilder<PostPermissions>(
      future: PostService().getPostPermissions(),
      builder: (context, permSnap) {
        if (permSnap.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        final permissions = permSnap.data ?? PostPermissions.defaultPermissions;

        return StreamBuilder<List<Post>>(
          stream: UserPostService().getPosts(userId),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return Center(child: Text('Error: ${snapshot.error}'));
            }

            final posts = snapshot.data ?? [];

            if (posts.isEmpty) {
              if (isCurrentUser) {
                return ListView(
                  children: [
                    CreateUserPost(onPostCreated: () {}),
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 32.0),
                      child: EmptyState(
                        message: 'You haven\'t created any posts yet.',
                        icon: Icons.edit_note,
                      ),
                    ),
                  ],
                );
              } else {
                return const EmptyState(
                  message: 'This user has no posts yet.',
                  icon: Icons.post_add,
                );
              }
            }

            return RefreshIndicator(
              onRefresh: () async {
                await Future.delayed(const Duration(seconds: 1));
              },
              child: ListView.builder(
                itemCount: isCurrentUser ? posts.length + 1 : posts.length,
                itemBuilder: (context, index) {
                  if (isCurrentUser && index == 0) {
                    return CreateUserPost(onPostCreated: () {});
                  }
                  final postIndex = isCurrentUser ? index - 1 : index;
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
                    child: PostCard(post: posts[postIndex], permissions: permissions),
                  );
                },
              ),
            );
          },
        );
      },
    );
  }
}
