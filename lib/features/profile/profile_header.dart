import 'package:flutter/material.dart';
import 'package:myapp/models/user_profile.dart';
import 'package:myapp/widgets/user_type_icon.dart';

class ProfileHeader extends StatelessWidget {
  final UserProfile userProfile;

  const ProfileHeader({super.key, required this.userProfile});

  @override
  Widget build(BuildContext context) {

    return SizedBox(
      height: 200,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Cover Image or Black Background
          (userProfile.coverImageUrl != null &&
                  userProfile.coverImageUrl!.isNotEmpty)
              ? Image.network(
                  userProfile.coverImageUrl!,
                  fit: BoxFit.cover,
                  errorBuilder: (BuildContext context, Object exception,
                      StackTrace? stackTrace) {
                    return Container(color: Colors.black);
                  },
                )
              : Container(color: Colors.black),
          // Gradient Overlay
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.black.withOpacity(0.7), Colors.transparent],
                begin: Alignment.bottomCenter,
                end: Alignment.topCenter,
              ),
            ),
          ),
          // Content
          Positioned(
            bottom: 16,
            left: 16,
            right: 16,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                // Profile Picture
                CircleAvatar(
                  radius: 40,
                  backgroundColor: Colors.white,
                  child: CircleAvatar(
                    radius: 38,
                    backgroundImage: (userProfile.profilePictureUrl != null &&
                            userProfile.profilePictureUrl!.isNotEmpty)
                        ? NetworkImage(userProfile.profilePictureUrl!)
                        : null,
                    child: (userProfile.profilePictureUrl == null ||
                            userProfile.profilePictureUrl!.isEmpty)
                        ? Text(
                            userProfile.displayName.isNotEmpty
                                ? userProfile.displayName[0].toUpperCase()
                                : '',
                            style: const TextStyle(fontSize: 30, color: Colors.white),
                          )
                        : null,
                  ),
                ),
                const SizedBox(width: 16),
                // User Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          Text(
                            userProfile.displayName,
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(width: 8),
                          UserTypeIcon(userType: userProfile.userType),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '@${userProfile.username}',
                        style: const TextStyle(
                          fontSize: 14,
                          color: Colors.white70,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
