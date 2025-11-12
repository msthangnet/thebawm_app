import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:myapp/models/user_profile.dart';
import 'package:myapp/services/community_service.dart';
import 'package:myapp/widgets/user_card.dart';
import 'package:myapp/widgets/connect_button.dart';

class ConnectionsTab extends StatelessWidget {
  final String userId;

  const ConnectionsTab({super.key, required this.userId});

  @override
  Widget build(BuildContext context) {
    final CommunityService communityService = CommunityService();
    final currentUser = FirebaseAuth.instance.currentUser;
    final bool isCurrentUserProfile = currentUser != null && currentUser.uid == userId;

    return Column(
      children: [
        if (!isCurrentUserProfile)
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: ConnectButton(targetUserId: userId),
          ),
        Expanded(
          child: FutureBuilder<List<UserProfile>>(
            future: communityService.getConnections(userId),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError) {
                return Center(child: Text('Error: ${snapshot.error}'));
              }
              if (!snapshot.hasData || snapshot.data!.isEmpty) {
                return const Center(child: Text('No connections yet.'));
              }

              final connections = snapshot.data!;

              return GridView.builder(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 0.75, // Adjust for better layout
                  crossAxisSpacing: 10,
                  mainAxisSpacing: 10,
                ),
                padding: const EdgeInsets.all(10.0),
                itemCount: connections.length,
                itemBuilder: (context, index) {
                  return UserCard(user: connections[index]);
                },
              );
            },
          ),
        ),
      ],
    );
  }
}
