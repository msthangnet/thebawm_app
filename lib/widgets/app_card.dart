import 'package:flutter/material.dart';
import 'package:myapp/features/all_apps/all_apps_screen.dart';
import 'package:go_router/go_router.dart';

class AppCard extends StatelessWidget {
  final AppInfo app;

  const AppCard({super.key, required this.app});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2.0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12.0),
      ),
      child: InkWell(
        onTap: () {
          // Navigate to simple screens for core apps
          switch (app.title) {
            case 'Pages':
              context.push('/pages');
              break;
            case 'Groups':
              context.push('/groups');
              break;
            case 'Events':
              context.push('/events');
              break;
            case 'Videos':
              context.push('/videos');
              break;
            case 'Lyrics':
              context.push('/lyrics');
              break;
            case 'Quizzes':
              context.push('/quizzes');
              break;
            case 'Marketplace':
              context.push('/marketplace');
              break;
            case 'About BAWM':
              context.push('/about-bawm');
              break;
            case 'Books':
              context.push('/books');
              break;
            case 'Marketplace':
              context.push('/marketplace');
              break;
            case 'About BAWM':
              context.push('/about-bawm');
              break;
            default:
              // no-op for other apps yet
          }
        },
        borderRadius: BorderRadius.circular(12.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(app.icon, size: 40.0, color: app.color),
            const SizedBox(height: 8.0),
            Text(
              app.title,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12.0, fontWeight: FontWeight.w500),
            ),
          ],
        ),
      ),
    );
  }
}
