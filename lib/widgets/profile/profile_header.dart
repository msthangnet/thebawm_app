import 'package:flutter/material.dart';
import 'package:myapp/models/user_profile.dart';

class ProfileHeader extends StatelessWidget {
  final UserProfile profile;

  const ProfileHeader({super.key, required this.profile});

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      alignment: Alignment.bottomCenter,
      children: <Widget>[
        Container(
          height: 200, // Height for the cover image
          decoration: BoxDecoration(
            image: DecorationImage(
              image:
                  (profile.coverImageUrl != null &&
                      profile.coverImageUrl!.isNotEmpty)
                  ? NetworkImage(profile.coverImageUrl!)
                  : const AssetImage('assets/images/default_cover.png')
                        as ImageProvider,
              fit: BoxFit.cover,
            ),
          ),
        ),
        Positioned(
          bottom: -50, // Position the avatar and text below the cover
          child: Column(
            children: [
              CircleAvatar(
                radius: 60,
                backgroundColor: Colors.white,
                child: CircleAvatar(
                  radius: 55,
                  backgroundImage:
                      (profile.profilePictureUrl != null &&
                          profile.profilePictureUrl!.isNotEmpty)
                      ? NetworkImage(profile.profilePictureUrl!)
                      : null,
                  child:
                      (profile.profilePictureUrl == null ||
                          profile.profilePictureUrl!.isEmpty)
                      ? Text(
                          profile.displayName.isNotEmpty
                              ? profile.displayName[0].toUpperCase()
                              : '',
                          style: const TextStyle(fontSize: 50),
                        )
                      : null,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                profile.displayName,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                '@${profile.username}',
                style: TextStyle(fontSize: 16, color: Colors.grey[600]),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
