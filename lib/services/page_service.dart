import 'dart:async';
import 'dart:developer' as developer;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:myapp/models/page.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'dart:io';

class PageService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Stream<List<PageInfo>> getPagesStream() {
    return _firestore.collection('pages').orderBy('createdAt', descending: true).snapshots().map((snap) {
      return snap.docs.map((d) => PageInfo.fromFirestore(d)).toList();
    });
  }

  Future<PageInfo?> getPage(String id) async {
    try {
      final doc = await _firestore.collection('pages').doc(id).get();
      if (!doc.exists) return null;
      return PageInfo.fromFirestore(doc);
    } catch (e, s) {
      developer.log('Error getting page', name: 'PageService', error: e, stackTrace: s);
      return null;
    }
  }

  Future<String?> createPage(PageInfo page) async {
    try {
      final ref = await _firestore.collection('pages').add(page.toMap());
      return ref.id;
    } catch (e, s) {
      developer.log('Error creating page', name: 'PageService', error: e, stackTrace: s);
      return null;
    }
  }

  Future<String?> createPageWithImages(PageInfo page, {File? profileImage, File? coverImage}) async {
    try {
      final storage = FirebaseStorage.instance;
      String? profileUrl;
      String? coverUrl;
      if (profileImage != null) {
        final ref = storage.ref().child('pages/${DateTime.now().millisecondsSinceEpoch}_profile.jpg');
        final task = await ref.putFile(profileImage);
        profileUrl = await task.ref.getDownloadURL();
      }
      if (coverImage != null) {
        final ref = storage.ref().child('pages/${DateTime.now().millisecondsSinceEpoch}_cover.jpg');
        final task = await ref.putFile(coverImage);
        coverUrl = await task.ref.getDownloadURL();
      }

      final map = page.toMap();
      if (profileUrl != null) map['profilePictureUrl'] = profileUrl;
      if (coverUrl != null) map['coverImageUrl'] = coverUrl;

      final docRef = await _firestore.collection('pages').add(map);
      return docRef.id;
    } catch (e, s) {
      developer.log('Error creating page with images', name: 'PageService', error: e, stackTrace: s);
      return null;
    }
  }

  Future<bool> updatePage(String pageId, Map<String, dynamic> updates, {File? profileImage, File? coverImage}) async {
    try {
      final storage = FirebaseStorage.instance;
      if (profileImage != null) {
        final ref = storage.ref().child('pages/${DateTime.now().millisecondsSinceEpoch}_profile.jpg');
        final task = await ref.putFile(profileImage);
        updates['profilePictureUrl'] = await task.ref.getDownloadURL();
      }
      if (coverImage != null) {
        final ref = storage.ref().child('pages/${DateTime.now().millisecondsSinceEpoch}_cover.jpg');
        final task = await ref.putFile(coverImage);
        updates['coverImageUrl'] = await task.ref.getDownloadURL();
      }
      await _firestore.collection('pages').doc(pageId).update(updates);
      return true;
    } catch (e, s) {
      developer.log('Error updating page', name: 'PageService', error: e, stackTrace: s);
      return false;
    }
  }

  Future<void> followPage(String pageId, String userId) async {
    final ref = _firestore.collection('pages').doc(pageId);
    await ref.update({
      'followers': FieldValue.arrayUnion([userId])
    });
  }

  Future<void> unfollowPage(String pageId, String userId) async {
    final ref = _firestore.collection('pages').doc(pageId);
    await ref.update({
      'followers': FieldValue.arrayRemove([userId])
    });
  }
}
