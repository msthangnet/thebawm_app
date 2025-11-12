import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:myapp/models/user_profile.dart';

class AboutTab extends StatelessWidget {
  final UserProfile userProfile;

  const AboutTab({super.key, required this.userProfile});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildInfoTile('Name', userProfile.displayName),
          _buildInfoTile('Username', userProfile.username),
          _buildInfoTile('Bio', userProfile.bio),
          _buildInfoTile('Gender', userProfile.gender),
          _buildInfoTile(
              'Date of Birth',
              userProfile.dob != null
                  ? DateFormat.yMMMd().format(userProfile.dob!.toDate())
                  : null),
          _buildInfoTile('Relationship Status', userProfile.relationshipStatus),
          _buildInfoTile('Hometown', userProfile.hometown),
          _buildInfoTile('Lives in', userProfile.liveIn),
          _buildInfoTile('Studying', userProfile.currentStudy),
          _buildInfoTile('Institute', userProfile.instituteName),
        ],
      ),
    );
  }

  Widget _buildInfoTile(String title, String? value) {
    if (value == null || value.isEmpty) {
      return const SizedBox.shrink();
    }
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 4.0),
          Text(value),
        ],
      ),
    );
  }
}
