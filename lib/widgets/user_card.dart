import 'package:flutter/material.dart';
import 'package:myapp/features/profile/profile_screen.dart';
import 'package:myapp/models/user_profile.dart';
import 'package:myapp/widgets/connect_button.dart';
import 'package:myapp/widgets/user_type_icon.dart';

class UserCard extends StatelessWidget {
  final UserProfile user;

  const UserCard({super.key, required this.user});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4.0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.0)),
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => ProfileScreen(userProfile: user),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              CircleAvatar(
                radius: 40,
                child: user.profilePictureUrl != null &&
                        user.profilePictureUrl!.isNotEmpty
                    ? ClipOval(
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
                              user.displayName.isNotEmpty == true
                                  ? user.displayName[0].toUpperCase()
                                  : '',
                              style: const TextStyle(fontSize: 40),
                            );
                          },
                        ),
                      )
                    : Text(
                        user.displayName.isNotEmpty == true
                            ? user.displayName[0].toUpperCase()
                            : '',
                        style: const TextStyle(fontSize: 40),
                      ),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Flexible(
                    child: Text(
                      user.displayName,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                      textAlign: TextAlign.center,
                      overflow: TextOverflow.ellipsis,
                      maxLines: 2,
                    ),
                  ),
                  const SizedBox(width: 4),
                  UserTypeIcon(userType: user.userType),
                ],
              ),
              Text(
                '@${user.username}',
                style: const TextStyle(color: Colors.grey, fontSize: 12),
                textAlign: TextAlign.center,
                overflow: TextOverflow.ellipsis,
                maxLines: 1,
              ),
              const SizedBox(height: 12),
              ConnectButton(targetUserId: user.uid),
            ],
          ),
        ),
      ),
    );
  }
}
