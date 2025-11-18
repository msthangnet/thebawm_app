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
  PostPermissions? _permissions;
  String? _currentUserId;
  bool _loadingPermissions = true;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;
    if (user != null && _currentUserId != user.uid) {
      _currentUserId = user.uid;
      _loadPermissions();
    }
  }

  @override
  void initState() {
    super.initState();
    // keep previous notify behavior for compatibility
    WidgetsBinding.instance.addPostFrameCallback((_) {
      PostService().notifyUpdates();
    });
  }

  Future<void> _loadPermissions() async {
    setState(() {
      _loadingPermissions = true;
    });
    try {
      final perms = await PostService().getPostPermissions();
      if (!mounted) return;
      setState(() {
        _permissions = perms;
        _loadingPermissions = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _permissions = PostPermissions.defaultPermissions;
        _loadingPermissions = false;
      });
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
          : _loadingPermissions
              ? const Center(child: CircularProgressIndicator())
              : StreamBuilder<List<Post>>(
                  stream: PostService().getFeedPostsStream(user.uid),
                  builder: (context, snap) {
                    if (snap.connectionState == ConnectionState.waiting) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    if (snap.hasError) {
                      return Center(child: Text('Error: ${snap.error}'));
                    }
                    final posts = snap.data ?? [];
                    final permissions = _permissions ?? PostPermissions.defaultPermissions;

                    return ListView.builder(
                      itemCount: posts.length + 1,
                      itemBuilder: (context, index) {
                        if (index == 0) {
                          return CreatePost(permissions: permissions);
                        }
                        final post = posts[index - 1];
                        return Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
                          child: PostCard(key: ValueKey(post.id), post: post, permissions: permissions),
                        );
                      },
                    );
                  },
                ),
    );
  }
}
