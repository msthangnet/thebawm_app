import 'package:flutter/material.dart';
import 'package:myapp/services/page_service.dart';
import 'package:myapp/models/page.dart';
import 'package:provider/provider.dart';
import 'package:myapp/providers/auth_provider.dart';
import 'package:myapp/models/user_type.dart';
import 'create_edit_page_screen.dart';

class PageDetailScreen extends StatefulWidget {
  final String pageId;

  const PageDetailScreen({super.key, required this.pageId});

  @override
  State<PageDetailScreen> createState() => _PageDetailScreenState();
}

class _PageDetailScreenState extends State<PageDetailScreen> {
  late final PageService service;
  late Future<PageInfo?> _pageFuture;

  @override
  void initState() {
    super.initState();
    service = PageService();
    _pageFuture = service.getPage(widget.pageId);
  }

  Future<void> _refresh() async {
    setState(() {
      _pageFuture = service.getPage(widget.pageId);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Page')),
      body: FutureBuilder<PageInfo?>(
        future: _pageFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }
          final page = snapshot.data;
          if (page == null) return const Center(child: Text('Page not found'));
          final auth = Provider.of<AuthProvider>(context);
          final user = auth.user;
          final profile = auth.userProfile;
          final isFollowing = user != null && page.followers.contains(user.uid);

          void showNoPermission() {
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('You do not have permission to perform this action.')));
          }

          return Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(page.name, style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 8),
                Text(page.category, style: Theme.of(context).textTheme.bodyMedium),
                const SizedBox(height: 16),
                if (page.description != null) Text(page.description!),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Text('${page.followers.length} followers'),
                    const SizedBox(width: 12),
                    ElevatedButton(onPressed: () {
                      // open followers list (simple implementation shows ids)
                      showModalBottomSheet(context: context, builder: (_) {
                        return ListView(
                          children: page.followers.map((f) => ListTile(title: Text(f))).toList(),
                        );
                      });
                    }, child: const Text('View Followers')),
                    const SizedBox(width: 12),
                    // Edit button for owner or admins
                    if (user != null && (page.ownerId == user.uid || page.admins.contains(user.uid) || (profile?.userType == UserType.Admin)))
                      ElevatedButton(onPressed: () async {
                        final edited = await Navigator.of(context).push(MaterialPageRoute(builder: (_) => CreateEditPageScreen(page: page)));
                        if (edited == true) await _refresh();
                      }, child: const Text('Edit')),
                  ],
                ),
                const SizedBox(height: 12),
                if (user == null)
                  ElevatedButton(onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please log in to follow this page.')));
                  }, child: const Text('Follow'))
                else if (profile != null && (profile.userType == UserType.Inactive || profile.userType == UserType.Suspended))
                  ElevatedButton(onPressed: () => showNoPermission(), child: const Text('Follow'))
                else
                  ElevatedButton(
                    onPressed: () async {
                      try {
                        if (isFollowing) {
                          await service.unfollowPage(page.id, user.uid);
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unfollowed')));
                        } else {
                          await service.followPage(page.id, user.uid);
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Followed')));
                        }
                      } catch (e) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                      }
                    },
                    child: Text(isFollowing ? 'Unfollow' : 'Follow'),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}
