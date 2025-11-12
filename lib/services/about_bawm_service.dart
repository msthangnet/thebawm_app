import 'dart:developer' as developer;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:myapp/models/about_bawm.dart';
import 'package:myapp/models/about_bawm_page.dart';

class AboutBawmService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Stream<List<AboutBawm>> getAboutsStream() {
    return _firestore.collection('aboutBawm').orderBy('createdAt', descending: true).snapshots().asyncMap((snap) async {
      final list = <AboutBawm>[];
      for (final doc in snap.docs) {
        // fetch pages for each doc (could be optimized)
        final pagesSnapshot = await doc.reference.collection('pages').orderBy('order').get();
        final pages = pagesSnapshot.docs.map((d) => AboutBawmPage.fromFirestore(d)).toList();
        list.add(AboutBawm.fromFirestore(doc, pages: pages));
      }
      return list;
    });
  }

  Future<AboutBawm?> getAboutBySlug(String slug) async {
    try {
      final q = await _firestore.collection('aboutBawm').where('slug', isEqualTo: slug).limit(1).get();
      if (q.docs.isEmpty) return null;
      final doc = q.docs.first;
      final pagesSnap = await doc.reference.collection('pages').orderBy('order').get();
      final pages = pagesSnap.docs.map((d) => AboutBawmPage.fromFirestore(d)).toList();
      return AboutBawm.fromFirestore(doc, pages: pages);
    } catch (e, s) {
      developer.log('Error getting about by slug', name: 'AboutBawmService', error: e, stackTrace: s);
      return null;
    }
  }

  Future<AboutBawm?> getAboutById(String id) async {
    try {
      final doc = await _firestore.collection('aboutBawm').doc(id).get();
      if (!doc.exists) return null;
      final pagesSnap = await doc.reference.collection('pages').orderBy('order').get();
      final pages = pagesSnap.docs.map((d) => AboutBawmPage.fromFirestore(d)).toList();
      return AboutBawm.fromFirestore(doc, pages: pages);
    } catch (e, s) {
      developer.log('Error getting about by id', name: 'AboutBawmService', error: e, stackTrace: s);
      return null;
    }
  }

  Future<bool> incrementReadCountOncePerSession(String id) async {
    try {
      // Called after client checks session/local flag. Server-side increment is safe.
      await _firestore.collection('aboutBawm').doc(id).update({'readCount': FieldValue.increment(1)});
      return true;
    } catch (e, s) {
      developer.log('Error incrementing read count', name: 'AboutBawmService', error: e, stackTrace: s);
      return false;
    }
  }

  Future<bool> deleteAboutWithPages(String id) async {
    try {
      final docRef = _firestore.collection('aboutBawm').doc(id);
      final pagesSnap = await docRef.collection('pages').get();
      final batch = _firestore.batch();
      for (final p in pagesSnap.docs) {
        batch.delete(p.reference);
      }
      batch.delete(docRef);
      await batch.commit();
      return true;
    } catch (e, s) {
      developer.log('Error deleting about', name: 'AboutBawmService', error: e, stackTrace: s);
      return false;
    }
  }
}
