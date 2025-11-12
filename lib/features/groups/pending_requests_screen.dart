import 'package:flutter/material.dart';
import 'package:myapp/services/group_service.dart';
import 'package:provider/provider.dart';
import 'package:myapp/providers/auth_provider.dart';

class GroupPendingRequestsScreen extends StatelessWidget {
  final String groupId;

  const GroupPendingRequestsScreen({super.key, required this.groupId});

  @override
  Widget build(BuildContext context) {
    final service = GroupService();
    final auth = Provider.of<AuthProvider>(context);
    final currentUid = auth.user?.uid;

    return Scaffold(
      appBar: AppBar(title: const Text('Pending Requests')),
      body: StreamBuilder<List<String>>(
        stream: service.getPendingMembersIdsStream(groupId),
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
          final pending = snap.data ?? [];
          if (pending.isEmpty) return const Center(child: Text('No pending requests'));
          return ListView.builder(
            itemCount: pending.length,
            itemBuilder: (context, index) {
              final uid = pending[index];
              return ListTile(
                title: Text(uid),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.check, color: Colors.green),
                      onPressed: () async {
                        try {
                          await service.approveMember(groupId, uid);
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Approved')));
                        } catch (e) {
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                        }
                      },
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.red),
                      onPressed: () async {
                        try {
                          await service.declineMember(groupId, uid);
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Declined')));
                        } catch (e) {
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                        }
                      },
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}
