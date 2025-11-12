import 'package:flutter/material.dart';
import 'package:myapp/models/user_type.dart';

class UserTypeIcon extends StatelessWidget {
  final UserType? userType;
  final double size;

  const UserTypeIcon({super.key, this.userType, this.size = 14.0});

  @override
  Widget build(BuildContext context) {
    IconData icon;
    Color color;
    String label;

    switch (userType) {
      case UserType.Active:
        icon = Icons.access_time;
        color = Colors.blue;
        label = 'Active User';
        break;
      case UserType.Thunder:
        icon = Icons.flash_on;
        color = Colors.purple;
        label = 'Thunder User';
        break;
      case UserType.Star:
        icon = Icons.star;
        color = Colors.yellow;
        label = 'Star User';
        break;
      case UserType.Leader:
        icon = Icons.shield;
        color = Colors.orange;
        label = 'Leader';
        break;
      case UserType.Editor:
        icon = Icons.edit;
        color = Colors.green;
        label = 'Editor';
        break;
      case UserType.Admin:
        icon = Icons.check_circle;
        color = Colors.red;
        label = 'Administrator';
        break;
      case UserType.Inactive:
        icon = Icons.access_time;
        color = Colors.grey;
        label = 'Inactive User';
        break;
      case UserType.Suspended:
        icon = Icons.access_time;
        color = Colors.grey;
        label = 'Suspended User';
        break;
      default:
        icon = Icons.visibility;
        color = Theme.of(context).colorScheme.onSurface;
        label = 'Viewer';
    }

    return Tooltip(
      message: label,
      child: Icon(
        icon,
        color: color,
        size: size,
      ),
    );
  }
}