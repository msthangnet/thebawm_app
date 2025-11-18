import 'package:flutter/material.dart';
import 'package:myapp/services/group_service.dart';
import 'package:myapp/services/community_service.dart';

class GroupMembersListScreen extends StatelessWidget {
  final String groupId;

  const GroupMembersListScreen({super.key, required this.groupId});

  @override
  Widget build(BuildContext context) {
    final groupService = GroupService();
    final community = CommunityService();
    return Scaffold(
      appBar: AppBar(title: const Text('Members')),
      body: StreamBuilder<List<String>>(
        stream: groupService.getGroupMembersIdsStream(groupId),
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
          final ids = snap.data ?? [];
          if (ids.isEmpty) return const Center(child: Text('No members yet'));
          return FutureBuilder<List>(
            future: Future.wait(ids.map((id) => community.getConnections(id)).toList()),
            builder: (context, usersSnap) {
              // community.getConnections returns list of UserProfile for multiple ids; but for simplicity we'll show ids
              return ListView.builder(
                itemCount: ids.length,
                itemBuilder: (context, index) {
                  final id = ids[index];
                  return ListTile(
                    title: Text(id),
                    subtitle: Text('Member'),
                  );
                },
              );
            },
          );
        },
      ),
    );
  }
}
