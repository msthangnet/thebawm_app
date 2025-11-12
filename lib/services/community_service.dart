import 'dart:async';
import 'dart:developer' as developer;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:myapp/models/connection_status.dart';
import 'package:myapp/models/user_profile.dart';

class CommunityService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  Stream<List<UserProfile>> getVerifiedUsers() {
    return _firestore
        .collection('users')
        .where('userType', whereNotIn: ['Suspended', 'Inactive'])
        .snapshots()
        .map((snapshot) {
          return snapshot.docs
              .map((doc) => UserProfile.fromFirestore(doc))
              .toList();
        });
  }

  Stream<ConnectionStatus> getConnectionStatus(String targetUserId) {
    final currentUser = _auth.currentUser;
    if (currentUser == null) {
      return Stream.value(ConnectionStatus.notConnected);
    }

    final userConnectionDoc = _firestore
        .collection('users')
        .doc(currentUser.uid)
        .collection('connections')
        .doc(targetUserId);

    return userConnectionDoc.snapshots().asyncMap((docSnap) async {
      if (docSnap.exists) {
        final data = docSnap.data();
        return _parseConnectionStatus(data?['status']);
      } else {
        final targetConnectionDoc = _firestore
            .collection('users')
            .doc(targetUserId)
            .collection('connections')
            .doc(currentUser.uid);
        final targetDocSnap = await targetConnectionDoc.get();
        if (targetDocSnap.exists) {
          final targetData = targetDocSnap.data();
          final targetStatus = _parseConnectionStatus(targetData?['status']);
          if (targetStatus == ConnectionStatus.requestSent) {
            return ConnectionStatus.requestReceived;
          }
        }
        return ConnectionStatus.notConnected;
      }
    });
  }

  Future<void> sendConnectionRequest(String targetUserId) async {
    final currentUser = _auth.currentUser;
    if (currentUser == null) return;

    try {
      final batch = _firestore.batch();

      final userConnectionRef = _firestore
          .collection('users')
          .doc(currentUser.uid)
          .collection('connections')
          .doc(targetUserId);
      batch.set(userConnectionRef, {'status': 'requestSent'});

      final targetConnectionRef = _firestore
          .collection('users')
          .doc(targetUserId)
          .collection('connections')
          .doc(currentUser.uid);
      batch.set(targetConnectionRef, {'status': 'requestReceived'});

      final notificationRef = _firestore.collection('notifications').doc();
      batch.set(notificationRef, {
        'recipientId': targetUserId,
        'senderId': currentUser.uid,
        'type': 'connection_request',
        'entityId': currentUser.uid,
        'entityType': 'user',
        'createdAt': FieldValue.serverTimestamp(),
        'read': false,
      });

      await batch.commit();
    } catch (e, s) {
      developer.log(
        'Error sending connection request',
        name: 'CommunityService',
        error: e,
        stackTrace: s,
      );
    }
  }

  Future<void> cancelConnectionRequest(String targetUserId) async {
    final currentUser = _auth.currentUser;
    if (currentUser == null) return;

    try {
      final batch = _firestore.batch();

      final userConnectionRef = _firestore
          .collection('users')
          .doc(currentUser.uid)
          .collection('connections')
          .doc(targetUserId);
      batch.delete(userConnectionRef);

      final targetConnectionRef = _firestore
          .collection('users')
          .doc(targetUserId)
          .collection('connections')
          .doc(currentUser.uid);
      batch.delete(targetConnectionRef);

      await batch.commit();
    } catch (e, s) {
      developer.log(
        'Error canceling connection request',
        name: 'CommunityService',
        error: e,
        stackTrace: s,
      );
    }
  }

  Future<void> acceptConnectionRequest(String targetUserId) async {
    final currentUser = _auth.currentUser;
    if (currentUser == null) return;

    try {
      final batch = _firestore.batch();

      final userConnectionRef = _firestore
          .collection('users')
          .doc(currentUser.uid)
          .collection('connections')
          .doc(targetUserId);
      batch.set(userConnectionRef, {'status': 'connected'});

      final targetConnectionRef = _firestore
          .collection('users')
          .doc(targetUserId)
          .collection('connections')
          .doc(currentUser.uid);
      batch.set(targetConnectionRef, {'status': 'connected'});

      await batch.commit();
    } catch (e, s) {
      developer.log(
        'Error accepting connection request',
        name: 'CommunityService',
        error: e,
        stackTrace: s,
      );
    }
  }

  Future<void> declineConnectionRequest(String targetUserId) async {
    await cancelConnectionRequest(targetUserId); // Same logic as canceling
  }

  Future<void> disconnect(String targetUserId) async {
    await cancelConnectionRequest(targetUserId); // Same logic as canceling
  }

  Future<List<UserProfile>> getConnections(String userId) async {
    try {
      final connectionsSnapshot = await _firestore
          .collection('users')
          .doc(userId)
          .collection('connections')
          .where('status', isEqualTo: 'connected')
          .get();

      if (connectionsSnapshot.docs.isEmpty) {
        return [];
      }

      final connectionIds = connectionsSnapshot.docs.map((doc) => doc.id).toList();

      final usersSnapshot = await _firestore
          .collection('users')
          .where(FieldPath.documentId, whereIn: connectionIds)
          .get();

      return usersSnapshot.docs
          .map((doc) => UserProfile.fromFirestore(doc))
          .toList();
    } catch (e, s) {
      developer.log(
        'Error fetching connections',
        name: 'CommunityService',
        error: e,
        stackTrace: s,
      );
      return [];
    }
  }


  ConnectionStatus _parseConnectionStatus(String? status) {
    switch (status) {
      case 'requestSent':
        return ConnectionStatus.requestSent;
      case 'requestReceived':
        return ConnectionStatus.requestReceived;
      case 'connected':
        return ConnectionStatus.connected;
      default:
        return ConnectionStatus.notConnected;
    }
  }
}
