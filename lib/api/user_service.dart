import 'dart:developer' as developer;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:myapp/models/user_profile.dart';

class UserService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  Future<UserProfile?> getProfile(String username) async {
    try {
      final query = await _db
          .collection('users')
          .where('username', isEqualTo: username)
          .limit(1)
          .get();

      if (query.docs.isEmpty) {
        return null;
      }

      return UserProfile.fromFirestore(query.docs.first);
    } catch (e, s) {
      developer.log(
        'Error getting user profile',
        name: 'UserService',
        error: e,
        stackTrace: s,
      );
      return null;
    }
  }

  Future<UserProfile?> getProfileByUid(String uid) async {
    try {
      final doc = await _db.collection('users').doc(uid).get();

      if (!doc.exists) {
        return null;
      }

      return UserProfile.fromFirestore(doc);
    } catch (e, s) {
      developer.log(
        'Error getting user profile by UID',
        name: 'UserService',
        error: e,
        stackTrace: s,
      );
      return null;
    }
  }

  Future<void> createUserProfile(UserProfile profile) async {
    await _db.collection('users').doc(profile.uid).set(profile.toFirestore());
  }
}
