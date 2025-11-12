import 'package:flutter/material.dart';
import 'package:lucide_flutter/lucide_flutter.dart';
import 'package:myapp/widgets/app_card.dart';

class AppInfo {
  final String title;
  final IconData icon;
  final Color color;

  AppInfo({required this.title, required this.icon, required this.color});
}

class AllAppsScreen extends StatelessWidget {
  const AllAppsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final List<AppInfo> allAppLinks = [
      AppInfo(title: 'Pages', icon: LucideIcons.flag, color: Colors.yellow.shade700),
      AppInfo(title: 'Groups', icon: LucideIcons.group, color: Colors.cyan.shade500),
      AppInfo(title: 'Events', icon: LucideIcons.calendar, color: Colors.amber.shade500),
      AppInfo(title: 'Videos', icon: LucideIcons.clapperboard, color: Colors.red.shade500),
    AppInfo(title: 'Books', icon: LucideIcons.bookOpen, color: Colors.green.shade500),
    AppInfo(title: 'Marketplace', icon: LucideIcons.shoppingCart, color: Colors.orange.shade500),
    AppInfo(title: 'About BAWM', icon: LucideIcons.info, color: Colors.grey.shade500),
    AppInfo(title: 'Lyrics', icon: LucideIcons.music, color: Colors.pink.shade500),
      AppInfo(title: 'Quizzes', icon: LucideIcons.trophy, color: Colors.indigo.shade500),
      AppInfo(title: 'Marketplace', icon: LucideIcons.shoppingCart, color: Colors.orange.shade500),
      AppInfo(title: 'About BAWM', icon: LucideIcons.info, color: Colors.grey.shade500),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('All Apps'),
      ),
      body: GridView.builder(
        padding: const EdgeInsets.all(16.0),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3,
          crossAxisSpacing: 16.0,
          mainAxisSpacing: 16.0,
          childAspectRatio: 1.0,
        ),
        itemCount: allAppLinks.length,
        itemBuilder: (context, index) {
          final app = allAppLinks[index];
          return AppCard(app: app);
        },
      ),
    );
  }
}
