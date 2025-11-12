import 'package:flutter/material.dart';
import 'package:myapp/models/user_profile.dart';
import 'package:myapp/widgets/connect_button.dart';
import 'package:myapp/features/profile/profile_screen.dart';
import 'package:myapp/widgets/user_type_icon.dart';

class CommunityCard extends StatelessWidget {
  final UserProfile user;

  const CommunityCard({super.key, required this.user});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      margin: const EdgeInsets.all(8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            GestureDetector(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => ProfileScreen(userProfile: user),
                  ),
                );
              },
              child: CircleAvatar(
                radius: 40,
                child: (user.profilePictureUrl == null ||
                        user.profilePictureUrl!.isEmpty)
                    ? Text(
                        user.displayName.isNotEmpty
                            ? user.displayName[0].toUpperCase()
                            : '',
                        style: const TextStyle(fontSize: 40),
                      )
                    : ClipOval(
                        child: Image.network(
                          user.profilePictureUrl!,
                          width: 80,
                          height: 80,
                          fit: BoxFit.cover,
                          loadingBuilder: (context, child, loadingProgress) {
                            if (loadingProgress == null) return child;
                            return const Center(
                              child: CircularProgressIndicator(),
                            );
                          },
                          errorBuilder: (context, error, stackTrace) {
                            return Text(
                              user.displayName.isNotEmpty
                                  ? user.displayName[0].toUpperCase()
                                  : '',
                              style: const TextStyle(fontSize: 40),
                            );
                          },
                        ),
                      ),
              ),
            ),
            const SizedBox(height: 12),
            GestureDetector(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => ProfileScreen(userProfile: user),
                  ),
                );
              },
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    user.displayName,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                    ),
                  ),
                  const SizedBox(width: 4),
                  UserTypeIcon(userType: user.userType),
                ],
              ),
            ),
            Text(
              '@${user.username}',
              style: const TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 12),
            ConnectButton(targetUserId: user.uid),
          ],
        ),
      ),
    );
  }
}
