import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:myapp/features/profile/about_tab.dart';
import 'package:myapp/features/profile/connections_tab.dart';
import 'package:myapp/features/profile/posts_tab.dart';
import 'package:myapp/features/profile/profile_header.dart';
import 'package:myapp/features/profile/settings_tab.dart';
import 'package:myapp/models/user_profile.dart';
import 'package:myapp/providers/auth_provider.dart';
import 'package:provider/provider.dart';

class MyProfileScreen extends StatelessWidget {
  const MyProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;

    if (user == null) {
      return const Center(child: Text('Please log in'));
    }

    return FutureBuilder<DocumentSnapshot>(
      future: FirebaseFirestore.instance.collection('users').doc(user.uid).get(),
      builder: (BuildContext context, AsyncSnapshot<DocumentSnapshot> snapshot) {
        if (snapshot.hasError) {
          return const Center(child: Text("Something went wrong"));
        }

        if (snapshot.hasData && !snapshot.data!.exists) {
          return const Center(child: Text("Document does not exist"));
        }

        if (snapshot.connectionState == ConnectionState.done) {
          UserProfile userProfile = UserProfile.fromFirestore(snapshot.data!);
          return DefaultTabController(
            length: 4,
            child: Scaffold(
              body: NestedScrollView(
                headerSliverBuilder: (BuildContext context, bool innerBoxIsScrolled) {
                  return <Widget>[
                    SliverAppBar(
                      expandedHeight: 200.0,
                      floating: false,
                      pinned: true,
                      backgroundColor: Colors.grey[200],
                      title: Text(userProfile.displayName),
                      flexibleSpace: FlexibleSpaceBar(
                        background: ProfileHeader(userProfile: userProfile),
                      ),
                    ),
                    SliverPersistentHeader(
                      delegate: _SliverAppBarDelegate(
                        const TabBar(
                          tabs: [
                            Tab(text: 'Posts'),
                            Tab(text: 'About'),
                            Tab(text: 'Connections'),
                            Tab(text: 'Settings'),
                          ],
                        ),
                      ),
                      pinned: true,
                    ),
                  ];
                },
                body: TabBarView(
                  children: [
                    PostsTab(userId: userProfile.uid),
                    AboutTab(userProfile: userProfile),
                    ConnectionsTab(userId: userProfile.uid),
                    const SettingsTab(),
                  ],
                ),
              ),
            ),
          );
        }

        return const Center(child: CircularProgressIndicator());
      },
    );
  }
}

class _SliverAppBarDelegate extends SliverPersistentHeaderDelegate {
  _SliverAppBarDelegate(this._tabBar);

  final TabBar _tabBar;

  @override
  double get minExtent => _tabBar.preferredSize.height;
  @override
  double get maxExtent => _tabBar.preferredSize.height;

  @override
  Widget build(
      BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: Colors.grey[200],
      child: _tabBar,
    );
  }

  @override
  bool shouldRebuild(_SliverAppBarDelegate oldDelegate) {
    return false;
  }
}