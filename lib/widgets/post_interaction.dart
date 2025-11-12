import 'package:flutter/material.dart';

class PostInteraction extends StatelessWidget {
  final int likeCount;
  final int commentCount;
  final int viewCount;
  final VoidCallback onLike;
  final VoidCallback onComment;

  const PostInteraction({
    super.key,
    required this.likeCount,
    required this.commentCount,
    required this.viewCount,
    required this.onLike,
    required this.onComment,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            IconButton(
              icon: const Icon(Icons.thumb_up_alt_outlined),
              onPressed: onLike,
            ),
            Text(likeCount.toString()),
          ],
        ),
        Row(
          children: [
            IconButton(
              icon: const Icon(Icons.comment_outlined),
              onPressed: onComment,
            ),
            Text(commentCount.toString()),
          ],
        ),
        Row(
          children: [
            const Icon(Icons.visibility_outlined),
            const SizedBox(width: 4.0),
            Text(viewCount.toString()),
          ],
        ),
      ],
    );
  }
}
