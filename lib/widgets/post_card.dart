import 'package:flutter/material.dart';
import 'package:myapp/models/post.dart';
import 'package:myapp/widgets/post_interaction.dart';

class PostCard extends StatelessWidget {
  final Post post;

  const PostCard({super.key, required this.post});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
      elevation: 2.0,
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (post.author != null)
              Row(
                children: [
                  CircleAvatar(
                    backgroundImage: NetworkImage(post.author!.profilePictureUrl ?? ''),
                    radius: 20,
                  ),
                  const SizedBox(width: 8.0),
                  Text(
                    post.author!.displayName,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            const SizedBox(height: 8.0),
            Text(post.text),
            const SizedBox(height: 8.0),
            if (post.mediaUrls.isNotEmpty)
              SizedBox(
                height: 200,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: post.mediaUrls.length,
                  itemBuilder: (context, index) {
                    return Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: Image.network(
                        post.mediaUrls[index],
                        fit: BoxFit.cover,
                        width: 200,
                      ),
                    );
                  },
                ),
              ),
            const SizedBox(height: 8.0),
            PostInteraction(
              likeCount: post.likes.length,
              commentCount: post.commentCount,
              viewCount: post.viewCount,
              onLike: () {},
              onComment: () {},
            ),
          ],
        ),
      ),
    );
  }
}
