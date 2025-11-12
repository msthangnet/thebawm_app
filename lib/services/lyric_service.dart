import 'dart:developer' as developer;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:myapp/models/lyric.dart';

class LyricService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Stream<List<Lyric>> getLyricsStream() {
    return _firestore.collection('lyrics').orderBy('createdAt', descending: true).snapshots().map((snap) => snap.docs.map((d) => Lyric.fromFirestore(d)).toList());
  }

  Future<Lyric?> getLyric(String id) async {
    try {
      final doc = await _firestore.collection('lyrics').doc(id).get();
      if (!doc.exists) return null;
      return Lyric.fromFirestore(doc);
    } catch (e, s) {
      developer.log('Error getting lyric', name: 'LyricService', error: e, stackTrace: s);
      return null;
    }
  }

  Future<String?> createLyric(Lyric lyric) async {
    try {
      final ref = await _firestore.collection('lyrics').add(lyric.toMap());
      return ref.id;
    } catch (e, s) {
      developer.log('Error creating lyric', name: 'LyricService', error: e, stackTrace: s);
      return null;
    }
  }

  Future<bool> updateLyric(String id, Map<String, dynamic> updates) async {
    try {
      await _firestore.collection('lyrics').doc(id).update(updates);
      return true;
    } catch (e, s) {
      developer.log('Error updating lyric', name: 'LyricService', error: e, stackTrace: s);
      return false;
    }
  }
}
