import 'package:flutter/material.dart';
import 'package:myapp/services/group_service.dart';
import 'package:myapp/models/group.dart';
import 'package:provider/provider.dart';
import 'package:myapp/providers/auth_provider.dart';
import 'package:myapp/models/user_type.dart';
import 'package:myapp/features/groups/members_list_screen.dart';
import 'package:myapp/features/groups/pending_requests_screen.dart';

class GroupDetailScreen extends StatefulWidget {
  final String groupId;

  const GroupDetailScreen({super.key, required this.groupId});

  @override
  State<GroupDetailScreen> createState() => _GroupDetailScreenState();
}

class _GroupDetailScreenState extends State<GroupDetailScreen> {
  final GroupService service = GroupService();
  late Future<GroupInfo?> _groupFuture;

  @override
  void initState() {
    super.initState();
    _groupFuture = service.getGroup(widget.groupId);
  }

  Future<void> _reload() async {
    setState(() {
      _groupFuture = service.getGroup(widget.groupId);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Group')),
      body: FutureBuilder<GroupInfo?>(
        future: _groupFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }
          final group = snapshot.data;
          if (group == null) return const Center(child: Text('Group not found'));
          final auth = Provider.of<AuthProvider>(context);
          final user = auth.user;
          final profile = auth.userProfile;
          final isMember = user != null && group.members.contains(user.uid);

          void showNoPermission() {
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('You do not have permission to perform this action.')));
          }

          return Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(group.name, style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 8),
                Text(group.category, style: Theme.of(context).textTheme.bodyMedium),
                const SizedBox(height: 16),
                if (group.description != null) Text(group.description!),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Text('${group.members.length} members'),
                    const SizedBox(width: 16),
                    Text('${group.admins.length} admins'),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    ElevatedButton(onPressed: () {
                      Navigator.of(context).push(MaterialPageRoute(builder: (_) => GroupMembersListScreen(groupId: group.id))).then((_) => _reload());
                    }, child: const Text('View Members')),
                    const SizedBox(width: 8),
                    if ((profile != null && (profile.userType == UserType.Admin)) || group.ownerId == auth.user?.uid || group.admins.contains(auth.user?.uid))
                      ElevatedButton(onPressed: () {
                        Navigator.of(context).push(MaterialPageRoute(builder: (_) => GroupPendingRequestsScreen(groupId: group.id))).then((_) => _reload());
                      }, child: const Text('Pending Requests')),
                  ],
                ),
                const SizedBox(height: 12),
                if (user == null)
                  ElevatedButton(onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please log in to join this group.')));
                  }, child: const Text('Join'))
                else if (profile != null && (profile.userType == UserType.Inactive || profile.userType == UserType.Suspended))
                  ElevatedButton(onPressed: () => showNoPermission(), child: const Text('Join'))
                else
                  ElevatedButton(
                    onPressed: () async {
                      try {
                        if (isMember) {
                          await service.leaveGroup(group.id, user.uid);
                          if (!mounted) return;
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Left group')));
                        } else {
                          if (group.groupType == 'private') {
                            // For private groups you might want to implement a request flow.
                            // Here we simply add to members as a simplification.
                          }
                          await service.joinGroup(group.id, user.uid);
                          if (!mounted) return;
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Joined group')));
                        }
                        await _reload();
                      } catch (e) {
                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                      }
                    },
                    child: Text(isMember ? 'Leave' : 'Join'),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}
