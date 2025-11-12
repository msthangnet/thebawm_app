import 'package:flutter/material.dart';
import 'package:myapp/services/group_service.dart';
import 'package:myapp/models/group.dart';
import 'group_detail_screen.dart';
import 'package:provider/provider.dart';
import 'package:myapp/providers/auth_provider.dart';
import 'create_edit_group_screen.dart';

class GroupsListScreen extends StatelessWidget {
  const GroupsListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final service = GroupService();
    final auth = Provider.of<AuthProvider>(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Groups'), actions: [
        if (auth.user != null)
          IconButton(onPressed: () async {
            final created = await Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CreateEditGroupScreen()));
            if (created == true) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Group created')));
          }, icon: const Icon(Icons.add))
      ]),
      body: StreamBuilder<List<GroupInfo>>(
        stream: service.getGroupsStream(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }
          final groups = snapshot.data ?? [];
          if (groups.isEmpty) {
            return const Center(child: Text('No groups yet'));
          }
          return ListView.builder(
            itemCount: groups.length,
            itemBuilder: (context, index) {
              final g = groups[index];
              return ListTile(
                leading: g.profilePictureUrl != null
                    ? CircleAvatar(backgroundImage: NetworkImage(g.profilePictureUrl!))
                    : const CircleAvatar(child: Icon(Icons.group)),
                title: Text(g.name),
                subtitle: Text(g.category),
                onTap: () {
                  Navigator.of(context).push(MaterialPageRoute(builder: (_) => GroupDetailScreen(groupId: g.id)));
                },
              );
            },
          );
        },
      ),
    );
  }
}
