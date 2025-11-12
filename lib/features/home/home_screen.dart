import 'package:flutter/material.dart';
import 'package:lucide_flutter/lucide_flutter.dart';
import 'package:myapp/features/all_apps/all_apps_screen.dart';
import 'package:myapp/features/community/community_screen.dart';
import 'package:myapp/features/feed/feed_screen.dart';
import 'package:myapp/features/notifications/notifications_screen.dart';
import 'package:myapp/features/profile/my_profile_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: const [
          FeedScreen(),
          CommunityScreen(),
          AllAppsScreen(),
          NotificationsScreen(),
          MyProfileScreen(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        onDestinationSelected: (int index) {
          setState(() {
            _currentIndex = index;
          });
        },
        selectedIndex: _currentIndex,
        destinations: const <Widget>[
          NavigationDestination(
            selectedIcon: Icon(LucideIcons.house),
            icon: Icon(LucideIcons.house),
            label: 'Social',
          ),
          NavigationDestination(
            selectedIcon: Icon(LucideIcons.users),
            icon: Icon(LucideIcons.users),
            label: 'Community',
          ),
          NavigationDestination(
            selectedIcon: Icon(LucideIcons.layoutGrid),
            icon: Icon(LucideIcons.layoutGrid),
            label: 'All Apps',
          ),
          NavigationDestination(
            selectedIcon: Icon(LucideIcons.bell),
            icon: Icon(LucideIcons.bell),
            label: 'Notifications',
          ),
          NavigationDestination(
            selectedIcon: Icon(LucideIcons.user),
            icon: Icon(LucideIcons.user),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
