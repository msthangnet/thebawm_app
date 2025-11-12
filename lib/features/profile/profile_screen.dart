import 'package:flutter/material.dart';
import 'package:myapp/features/profile/about_tab.dart';
import 'package:myapp/features/profile/connections_tab.dart';
import 'package:myapp/features/profile/posts_tab.dart';
import 'package:myapp/features/profile/profile_header.dart';
import 'package:myapp/models/user_profile.dart';

class ProfileScreen extends StatelessWidget {
  final UserProfile userProfile;

  const ProfileScreen({super.key, required this.userProfile});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
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
            ],
          ),
        ),
      ),
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
