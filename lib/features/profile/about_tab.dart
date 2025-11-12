import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:myapp/features/profile/edit_profile_screen.dart';
import 'package:myapp/models/user_profile.dart';
import 'package:myapp/widgets/user_type_icon.dart';

class AboutTab extends StatelessWidget {
  final UserProfile userProfile;

  const AboutTab({super.key, required this.userProfile});

  @override
  Widget build(BuildContext context) {
    final currentUser = FirebaseAuth.instance.currentUser;
    final bool isCurrentUserProfile =
        currentUser != null && currentUser.uid == userProfile.uid;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'About',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              if (isCurrentUserProfile)
                IconButton(
                  icon: const Icon(Icons.edit),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) =>
                            EditProfileScreen(userProfile: userProfile),
                      ),
                    );
                  },
                ),
            ],
          ),
          const SizedBox(height: 16),
          if (userProfile.bio != null && userProfile.bio!.isNotEmpty)
            Text(
              userProfile.bio!,
              style: Theme.of(context).textTheme.bodyMedium,
            )
          else if (isCurrentUserProfile)
            const Text(
              'No bio available. Add one to tell people more about yourself.',
              style: TextStyle(color: Colors.grey),
            )
          else
            Container(), // Show nothing if no bio and not current user

          const SizedBox(height: 24),
          Row(
            children: <Widget>[
              Icon(Icons.person_outline, color: Theme.of(context).textTheme.bodySmall?.color, size: 20),
              const SizedBox(width: 12),
              Flexible(child: Text(userProfile.displayName)),
              const SizedBox(width: 8),
              UserTypeIcon(userType: userProfile.userType),
            ],
          ),
          const SizedBox(height: 12),
          _buildInfoRow(context, Icons.alternate_email_sharp, '@${userProfile.username}'),
          if (userProfile.dob != null)
            Padding(
              padding: const EdgeInsets.only(top: 12.0),
              child: _buildInfoRow(
                context,
                Icons.cake_outlined,
                'Born on ${DateFormat.yMMMMd().format(userProfile.dob!.toDate())}',
              ),
            ),
          if (userProfile.hometown != null && userProfile.hometown!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 12.0),
              child: _buildInfoRow(
                context,
                Icons.location_city_outlined,
                'From ${userProfile.hometown!}',
              ),
            ),
          if (userProfile.liveIn != null && userProfile.liveIn!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 12.0),
              child: _buildInfoRow(
                context,
                Icons.home_outlined,
                'Lives in ${userProfile.liveIn!}',
              ),
            ),
          if (userProfile.currentStudy != null && userProfile.currentStudy!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 12.0),
              child: _buildInfoRow(
                context,
                Icons.school_outlined,
                'Studying ${userProfile.currentStudy!} at ${userProfile.instituteName ?? ''}',
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(BuildContext context, IconData icon, String text) {
    return Row(
      children: <Widget>[
        Icon(icon, color: Theme.of(context).textTheme.bodySmall?.color, size: 20),
        const SizedBox(width: 12),
        Flexible(child: Text(text)),
      ],
    );
  }
}
