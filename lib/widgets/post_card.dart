import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:myapp/models/post.dart';
import 'package:myapp/widgets/post_interaction.dart';
import 'package:myapp/providers/auth_provider.dart';
import 'package:myapp/services/post_service.dart';

class PostCard extends StatefulWidget {
  final Post post;
  final PostPermissions? permissions;

  const PostCard({super.key, required this.post, this.permissions});

  @override
  State<PostCard> createState() => _PostCardState();
}

class _PostCardState extends State<PostCard> {
  late Post post;
  bool _isLiking = false;
  bool _isLiked = false;
  int _likeCount = 0;
  bool _isDeleting = false;
  bool _editing = false;
  // these flags are used to disable actions while processing
  final TextEditingController _editController = TextEditingController();

  @override
  void initState() {
    super.initState();
    post = widget.post;
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final userId = auth.user?.uid;
    _isLiked = userId != null ? post.likes.contains(userId) : false;
    _likeCount = post.likes.length;
  }

  Future<void> _toggleLike() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final userId = auth.user?.uid;
    if (userId == null || _isLiking) return;
    setState(() => _isLiking = true);
    try {
      if (_isLiked) {
        await PostService().unlikePost(post.id, userId, post.postCollection);
        setState(() {
          _isLiked = false;
          _likeCount = (_likeCount - 1).clamp(0, 999999);
        });
      } else {
        await PostService().likePost(post.id, userId, post.postCollection);
        setState(() {
          _isLiked = true;
          _likeCount = _likeCount + 1;
        });
      }
    } catch (e) {
      Fluttertoast.showToast(msg: 'Could not update like: $e');
    } finally {
      setState(() => _isLiking = false);
    }
  }

  Future<void> _confirmAndDelete() async {
    final should = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete post?'),
        content: const Text('This will permanently delete the post and its comments.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text('Delete')),
        ],
      ),
    );

    if (should == true) {
      setState(() => _isDeleting = true);
      try {
        // delete media
        final storage = FirebaseStorage.instance;
        if (post.mediaUrls.isNotEmpty) {
          for (final url in post.mediaUrls) {
            try {
              final ref = storage.refFromURL(url);
              await ref.delete();
            } catch (_) {}
          }
        }

        final firestore = FirebaseFirestore.instance;
        // delete comments associated with this post
        final commentsQuery = await firestore.collection('comments').where('postId', isEqualTo: post.id).get();
        final batch = firestore.batch();
        for (final doc in commentsQuery.docs) {
          batch.delete(doc.reference);
        }

        // delete the post
        final postRef = firestore.collection(post.postCollection).doc(post.id);
        batch.delete(postRef);
        await batch.commit();

        Fluttertoast.showToast(msg: 'Post deleted');
        // notify global listeners so feed/profile lists refresh
        PostService().notifyUpdates();
      } catch (e) {
        Fluttertoast.showToast(msg: 'Failed to delete post: $e');
      } finally {
        setState(() => _isDeleting = false);
      }
    }
  }

  Future<void> _updatePostText() async {
    final newText = _editController.text.trim();
    if (newText == post.text) return setState(() => _editing = false);
    setState(() => _editing = true);
    try {
      await FirebaseFirestore.instance.collection(post.postCollection).doc(post.id).update({'text': newText});
      setState(() {
        post = post.copyWith();
        post = Post(
          id: post.id,
          text: newText,
          mediaUrls: post.mediaUrls,
          mediaType: post.mediaType,
          postType: post.postType,
          pageId: post.pageId,
          groupId: post.groupId,
          eventId: post.eventId,
          quizId: post.quizId,
          authorId: post.authorId,
          authorDisplayName: post.authorDisplayName,
          author: post.author,
          createdAt: post.createdAt,
          likes: post.likes,
          commentCount: post.commentCount,
          shareCount: post.shareCount,
          viewCount: post.viewCount,
          source: post.source,
          postCollection: post.postCollection,
        );
      });
      Fluttertoast.showToast(msg: 'Post updated');
      PostService().notifyUpdates();
    } catch (e) {
      Fluttertoast.showToast(msg: 'Failed to update post: $e');
    } finally {
      setState(() => _editing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;
    final userProfile = auth.userProfile;
    final userId = user?.uid;
    final userType = userProfile?.userType ?? 'Inactive';
    final perms = widget.permissions ?? PostPermissions.defaultPermissions;

    final isOwnPost = userId != null && userId == post.authorId;
    final isAdmin = userType == 'Admin';
    final canEdit = perms.canEditOwnPost.contains(userType);
    final canDeleteOthers = perms.canDeleteOthersPosts.contains(userType);
    final showMore = isOwnPost || isAdmin || canDeleteOthers;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
      elevation: 2.0,
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundImage: (post.author?.profilePictureUrl ?? post.authorDisplayName).isNotEmpty
                      ? NetworkImage(post.author?.profilePictureUrl ?? '')
                      : null,
                  radius: 20,
                  child: (post.author?.profilePictureUrl ?? '').isEmpty
                      ? Text((post.author?.displayName ?? post.authorDisplayName).isNotEmpty
                          ? (post.author?.displayName ?? post.authorDisplayName)[0]
                          : '?')
                      : null,
                ),
                const SizedBox(width: 8.0),
                Expanded(
                  child: Text(
                    post.author?.displayName.isNotEmpty == true
                        ? post.author!.displayName
                        : post.authorDisplayName,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
                if (showMore)
                  PopupMenuButton<String>(
                    onSelected: (value) async {
                      if (value == 'edit') {
                        _editController.text = post.text;
                        final newText = await showDialog<String?>(
                          context: context,
                          builder: (ctx) => AlertDialog(
                            title: const Text('Edit post'),
                            content: TextField(controller: _editController, maxLines: null),
                            actions: [
                              TextButton(onPressed: () => Navigator.of(ctx).pop(null), child: const Text('Cancel')),
                              TextButton(onPressed: () => Navigator.of(ctx).pop(_editController.text.trim()), child: const Text('Update')),
                            ],
                          ),
                        );
                        if (newText != null) {
                          _editController.text = newText;
                          await _updatePostText();
                        }
                      } else if (value == 'delete') {
                        await _confirmAndDelete();
                      }
                    },
                    itemBuilder: (ctx) => [
                      if (isOwnPost && canEdit)
                        PopupMenuItem(value: 'edit', enabled: !_isDeleting && !_editing, child: const Text('Edit')),
                      if (isOwnPost || isAdmin || canDeleteOthers)
                        PopupMenuItem(value: 'delete', enabled: !_isDeleting && !_editing, child: const Text('Delete')),
                    ],
                  ),
              ],
            ),
            const SizedBox(height: 8.0),
            if (post.text.isNotEmpty) Text(post.text),
            const SizedBox(height: 8.0),
            if (post.mediaUrls.isNotEmpty)
              SizedBox(
                height: 200,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: post.mediaUrls.length,
                  itemBuilder: (context, index) {
                    final url = post.mediaUrls[index];
                    if (url.isEmpty) {
                      return const SizedBox(width: 200, child: Center(child: Icon(Icons.broken_image)));
                    }
                    return Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: Image.network(
                        url,
                        fit: BoxFit.cover,
                        width: 200,
                      ),
                    );
                  },
                ),
              ),
            const SizedBox(height: 8.0),
            PostInteraction(
              likeCount: _likeCount,
              commentCount: post.commentCount,
              viewCount: post.viewCount,
              onLike: _toggleLike,
              onComment: () {},
            ),
          ],
        ),
      ),
    );
  }
}
