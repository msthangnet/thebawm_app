import 'dart:async';
import 'dart:developer' as developer;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:myapp/models/group.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'dart:io';

class GroupService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Stream<List<GroupInfo>> getGroupsStream() {
    return _firestore.collection('groups').orderBy('createdAt', descending: true).snapshots().map((snap) {
      return snap.docs.map((d) => GroupInfo.fromFirestore(d)).toList();
    });
  }

  Future<GroupInfo?> getGroup(String id) async {
    try {
      final doc = await _firestore.collection('groups').doc(id).get();
      if (!doc.exists) return null;
      return GroupInfo.fromFirestore(doc);
    } catch (e, s) {
      developer.log('Error getting group', name: 'GroupService', error: e, stackTrace: s);
      return null;
    }
  }

  Future<String?> createGroup(GroupInfo group) async {
    try {
      final ref = await _firestore.collection('groups').add(group.toMap());
      return ref.id;
    } catch (e, s) {
      developer.log('Error creating group', name: 'GroupService', error: e, stackTrace: s);
      return null;
    }
  }

  Future<String?> createGroupWithImages(GroupInfo group, {File? profileImage, File? coverImage}) async {
    try {
      final storage = FirebaseStorage.instance;
      String? profileUrl;
      String? coverUrl;
      if (profileImage != null) {
        final ref = storage.ref().child('groups/${DateTime.now().millisecondsSinceEpoch}_profile.jpg');
        final task = await ref.putFile(profileImage);
        profileUrl = await task.ref.getDownloadURL();
      }
      if (coverImage != null) {
        final ref = storage.ref().child('groups/${DateTime.now().millisecondsSinceEpoch}_cover.jpg');
        final task = await ref.putFile(coverImage);
        coverUrl = await task.ref.getDownloadURL();
      }

      final map = group.toMap();
      if (profileUrl != null) map['profilePictureUrl'] = profileUrl;
      if (coverUrl != null) map['coverImageUrl'] = coverUrl;

      final docRef = await _firestore.collection('groups').add(map);
      return docRef.id;
    } catch (e, s) {
      developer.log('Error creating group with images', name: 'GroupService', error: e, stackTrace: s);
      return null;
    }
  }

  Future<bool> updateGroup(String groupId, Map<String, dynamic> updates, {File? profileImage, File? coverImage}) async {
    try {
      final storage = FirebaseStorage.instance;
      if (profileImage != null) {
        final ref = storage.ref().child('groups/${DateTime.now().millisecondsSinceEpoch}_profile.jpg');
        final task = await ref.putFile(profileImage);
        updates['profilePictureUrl'] = await task.ref.getDownloadURL();
      }
      if (coverImage != null) {
        final ref = storage.ref().child('groups/${DateTime.now().millisecondsSinceEpoch}_cover.jpg');
        final task = await ref.putFile(coverImage);
        updates['coverImageUrl'] = await task.ref.getDownloadURL();
      }
      await _firestore.collection('groups').doc(groupId).update(updates);
      return true;
    } catch (e, s) {
      developer.log('Error updating group', name: 'GroupService', error: e, stackTrace: s);
      return false;
    }
  }

  Future<void> joinGroup(String groupId, String userId) async {
    final ref = _firestore.collection('groups').doc(groupId);
    await ref.update({'members': FieldValue.arrayUnion([userId])});
  }

  Future<void> leaveGroup(String groupId, String userId) async {
    final ref = _firestore.collection('groups').doc(groupId);
    await ref.update({'members': FieldValue.arrayRemove([userId])});
  }

  // Private group join request flow
  Future<void> requestToJoinGroup(String groupId, String userId) async {
    final ref = _firestore.collection('groups').doc(groupId);
    await ref.update({'pendingMembers': FieldValue.arrayUnion([userId])});

    // create a notification for admins/owner
    final notif = _firestore.collection('notifications').doc();
    await notif.set({
      'recipientId': null,
      'senderId': userId,
      'type': 'group_join_request',
      'entityId': groupId,
      'entityType': 'group',
      'createdAt': FieldValue.serverTimestamp(),
      'read': false,
    });
  }

  Future<void> approveMember(String groupId, String userId) async {
    final ref = _firestore.collection('groups').doc(groupId);
    final batch = _firestore.batch();
    batch.update(ref, {
      'pendingMembers': FieldValue.arrayRemove([userId]),
      'members': FieldValue.arrayUnion([userId])
    });
    final notif = _firestore.collection('notifications').doc();
    batch.set(notif, {
      'recipientId': userId,
      'senderId': null,
      'type': 'group_join_approved',
      'entityId': groupId,
      'entityType': 'group',
      'createdAt': FieldValue.serverTimestamp(),
      'read': false,
    });
    await batch.commit();
  }

  Future<void> declineMember(String groupId, String userId, {String? reason}) async {
    final ref = _firestore.collection('groups').doc(groupId);
    final batch = _firestore.batch();
    batch.update(ref, {
      'pendingMembers': FieldValue.arrayRemove([userId]),
      // optionally track declinedMembers as a map of uid->reason
      'declinedMembers': FieldValue.arrayUnion([userId])
    });
    final notif = _firestore.collection('notifications').doc();
    batch.set(notif, {
      'recipientId': userId,
      'senderId': null,
      'type': 'group_join_declined',
      'entityId': groupId,
      'entityType': 'group',
      'createdAt': FieldValue.serverTimestamp(),
      'read': false,
      'reason': reason ?? ''
    });
    await batch.commit();
  }

  Stream<List<String>> getGroupMembersIdsStream(String groupId) {
    return _firestore.collection('groups').doc(groupId).snapshots().map((doc) {
      final data = doc.data();
      if (data == null) return [];
      return List<String>.from(data['members'] ?? []);
    });
  }

  Stream<List<String>> getPendingMembersIdsStream(String groupId) {
    return _firestore.collection('groups').doc(groupId).snapshots().map((doc) {
      final data = doc.data();
      if (data == null) return [];
      return List<String>.from(data['pendingMembers'] ?? []);
    });
  }
}
