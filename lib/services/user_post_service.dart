import 'dart:async';
import 'dart:developer' as developer;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:myapp/models/post.dart';
import 'package:myapp/models/user_profile.dart';

class UserPostService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Stream<List<Post>> getPosts(String userId) {
    final postsQuery = _firestore
        .collection('usersPost')
        .where('authorId', isEqualTo: userId)
        .orderBy('createdAt', descending: true);

    return postsQuery.snapshots().asyncMap((snapshot) async {
      final posts = <Post>[];
      for (final doc in snapshot.docs) {
        final post = Post.fromFirestore(doc);
        final author = await _getUserProfile(post.authorId);
        posts.add(post.copyWith(author: author));
      }
      return posts;
    });
  }

  Future<UserProfile?> _getUserProfile(String uid) async {
    try {
      final doc = await _firestore.collection('users').doc(uid).get();
      if (doc.exists) {
        return UserProfile.fromFirestore(doc);
      }
    } catch (e, s) {
      developer.log('Error getting user profile', name: 'UserPostService', error: e, stackTrace: s);
    }
    return null;
  }
}
