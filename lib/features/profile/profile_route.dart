import 'package:flutter/material.dart';
import 'package:myapp/api/user_service.dart';
import 'package:myapp/models/user_profile.dart';
import 'package:myapp/features/profile/profile_screen.dart';

class ProfileRoute extends StatelessWidget {
  final String username;

  const ProfileRoute({super.key, required this.username});

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<UserProfile?>(
      future: UserService().getProfile(username),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(
              child: CircularProgressIndicator(),
            ),
          );
        }
        if (snapshot.hasError || !snapshot.hasData || snapshot.data == null) {
          return const Scaffold(
            body: Center(
              child: Text('User not found or error loading profile.'),
            ),
          );
        }
        final userProfile = snapshot.data!;
        return ProfileScreen(userProfile: userProfile);
      },
    );
  }
}
