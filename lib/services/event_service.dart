import 'dart:async';
import 'dart:developer' as developer;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:myapp/models/event.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'dart:io';

// Importing necessary packages for image handling
class EventService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Stream<List<EventInfo>> getEventsStream() {
    return _firestore.collection('events').orderBy('startDate', descending: true).snapshots().map((snap) {
      return snap.docs.map((d) => EventInfo.fromFirestore(d)).toList();
    });
  }

  Future<EventInfo?> getEvent(String id) async {
    try {
      final doc = await _firestore.collection('events').doc(id).get();
      if (!doc.exists) return null;
      return EventInfo.fromFirestore(doc);
    } catch (e, s) {
      developer.log('Error getting event', name: 'EventService', error: e, stackTrace: s);
      return null;
    }
  }

  Future<String?> createEvent(EventInfo event) async {
    try {
      final ref = await _firestore.collection('events').add(event.toMap());
      return ref.id;
    } catch (e, s) {
      developer.log('Error creating event', name: 'EventService', error: e, stackTrace: s);
      return null;
    }
  }

  Future<String?> createEventWithImages(EventInfo event, {File? profileImage, File? coverImage}) async {
    try {
      final data = event.toMap();
      final docRef = _firestore.collection('events').doc();
      final id = docRef.id;
      data['id'] = id;
      data['eventId'] = id;
      final storage = FirebaseStorage.instance;
      if (profileImage != null) {
        final ref = storage.ref().child('events/$id/profile.jpg');
        await ref.putFile(profileImage);
        data['profilePictureUrl'] = await ref.getDownloadURL();
      }
      if (coverImage != null) {
        final ref = storage.ref().child('events/$id/cover.jpg');
        await ref.putFile(coverImage);
        data['coverImageUrl'] = await ref.getDownloadURL();
      }
      await docRef.set(data);
      return id;
    } catch (e, s) {
      developer.log('Error creating event with images', name: 'EventService', error: e, stackTrace: s);
      return null;
    }
  }

  Future<bool> updateEvent(String eventId, Map<String, dynamic> updates, {File? profileImage, File? coverImage}) async {
    try {
      final storage = FirebaseStorage.instance;
      if (profileImage != null) {
        final ref = storage.ref().child('events/${DateTime.now().millisecondsSinceEpoch}_profile.jpg');
        final task = await ref.putFile(profileImage);
        updates['profilePictureUrl'] = await task.ref.getDownloadURL();
      }
      if (coverImage != null) {
        final ref = storage.ref().child('events/${DateTime.now().millisecondsSinceEpoch}_cover.jpg');
        final task = await ref.putFile(coverImage);
        updates['coverImageUrl'] = await task.ref.getDownloadURL();
      }
      await _firestore.collection('events').doc(eventId).update(updates);
      return true;
    } catch (e, s) {
      developer.log('Error updating event', name: 'EventService', error: e, stackTrace: s);
      return false;
    }
  }

  Future<void> joinEvent(String eventId, String userId) async {
    final ref = _firestore.collection('events').doc(eventId);
    await ref.update({'participants': FieldValue.arrayUnion([userId])});
  }

  Future<void> leaveEvent(String eventId, String userId) async {
    final ref = _firestore.collection('events').doc(eventId);
    await ref.update({'participants': FieldValue.arrayRemove([userId])});
  }

  // Private event join request flow
  Future<void> requestToJoinEvent(String eventId, String userId) async {
    final ref = _firestore.collection('events').doc(eventId);
    await ref.update({'pendingParticipants': FieldValue.arrayUnion([userId])});

    final notif = _firestore.collection('notifications').doc();
    await notif.set({
      'recipientId': null,
      'senderId': userId,
      'type': 'event_join_request',
      'entityId': eventId,
      'entityType': 'event',
      'createdAt': FieldValue.serverTimestamp(),
      'read': false,
    });
  }

  Future<void> approveParticipant(String eventId, String userId) async {
    final ref = _firestore.collection('events').doc(eventId);
    final batch = _firestore.batch();
    batch.update(ref, {
      'pendingParticipants': FieldValue.arrayRemove([userId]),
      'participants': FieldValue.arrayUnion([userId])
    });
    final notif = _firestore.collection('notifications').doc();
    batch.set(notif, {
      'recipientId': userId,
      'senderId': null,
      'type': 'event_join_approved',
      'entityId': eventId,
      'entityType': 'event',
      'createdAt': FieldValue.serverTimestamp(),
      'read': false,
    });
    await batch.commit();
  }

  Future<void> declineParticipant(String eventId, String userId, {String? reason}) async {
    final ref = _firestore.collection('events').doc(eventId);
    final batch = _firestore.batch();
    batch.update(ref, {
      'pendingParticipants': FieldValue.arrayRemove([userId]),
      'declinedParticipants': FieldValue.arrayUnion([userId])
    });
    final notif = _firestore.collection('notifications').doc();
    batch.set(notif, {
      'recipientId': userId,
      'senderId': null,
      'type': 'event_join_declined',
      'entityId': eventId,
      'entityType': 'event',
      'createdAt': FieldValue.serverTimestamp(),
      'read': false,
      'reason': reason ?? ''
    });
    await batch.commit();
  }

  Stream<List<String>> getEventParticipantsIdsStream(String eventId) {
    return _firestore.collection('events').doc(eventId).snapshots().map((doc) {
      final data = doc.data();
      if (data == null) return [];
      return List<String>.from(data['participants'] ?? []);
    });
  }

  Stream<List<String>> getPendingParticipantsIdsStream(String eventId) {
    return _firestore.collection('events').doc(eventId).snapshots().map((doc) {
      final data = doc.data();
      if (data == null) return [];
      return List<String>.from(data['pendingParticipants'] ?? []);
    });
  }
}
