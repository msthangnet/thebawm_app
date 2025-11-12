import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:myapp/models/user_profile.dart';

class UserService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Future<void> createUserProfile(UserProfile userProfile) async {
    try {
      await _firestore.collection('users').doc(userProfile.uid).set(userProfile.toFirestore());
    } catch (e) {
      print('Error creating user profile: $e');
      rethrow;
    }
  }

  Future<List<UserProfile>> getUsers() async {
    try {
      QuerySnapshot querySnapshot = await _firestore.collection('users').get();
      return querySnapshot.docs.map((doc) => UserProfile.fromFirestore(doc)).toList();
    } catch (e) {
      print('Error getting users: $e');
      return [];
    }
  }

  Future<UserProfile?> getUserById(String uid) async {
    try {
      final doc = await _firestore.collection('users').doc(uid).get();
      if (!doc.exists) return null;
      return UserProfile.fromFirestore(doc);
    } catch (e) {
      print('Error getting user by id: $e');
      return null;
    }
  }
}
