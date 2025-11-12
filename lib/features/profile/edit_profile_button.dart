import 'package:flutter/material.dart';
import 'package:myapp/features/profile/edit_profile_screen.dart';
import 'package:myapp/models/user_profile.dart';

class EditProfileButton extends StatelessWidget {
  final UserProfile userProfile;

  const EditProfileButton({super.key, required this.userProfile});

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => EditProfileScreen(userProfile: userProfile),
          ),
        );
      },
      child: const Text('Edit Profile'),
    );
  }
}
