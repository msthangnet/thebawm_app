import 'dart:io';
import 'dart:developer' as developer;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:myapp/models/video.dart';

class VideoService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Stream<List<VideoInfo>> getVideosStream() {
    return _firestore.collection('videos').orderBy('createdAt', descending: true).snapshots().map((snap) => snap.docs.map((d) => VideoInfo.fromFirestore(d)).toList());
  }

  Future<VideoInfo?> getVideo(String id) async {
    try {
      final doc = await _firestore.collection('videos').doc(id).get();
      if (!doc.exists) return null;
      return VideoInfo.fromFirestore(doc);
    } catch (e, s) {
      developer.log('Error getting video', name: 'VideoService', error: e, stackTrace: s);
      return null;
    }
  }

  Future<String?> createVideo(VideoInfo video, {File? videoFile, File? thumbnail}) async {
    try {
      final docRef = _firestore.collection('videos').doc();
      final id = docRef.id;
      final data = video.toMap();
      data['id'] = id;

      if (videoFile != null) {
        final vref = FirebaseStorage.instance.ref().child('videos/$id/${videoFile.path.split('/').last}');
        final task = await vref.putFile(videoFile);
        data['videoUrl'] = await task.ref.getDownloadURL();
      }
      if (thumbnail != null) {
        final tref = FirebaseStorage.instance.ref().child('videos/$id/thumbnail/${thumbnail.path.split('/').last}');
        final task = await tref.putFile(thumbnail);
        data['thumbnailUrl'] = await task.ref.getDownloadURL();
      }

      await docRef.set(data);
      return id;
    } catch (e, s) {
      developer.log('Error creating video', name: 'VideoService', error: e, stackTrace: s);
      return null;
    }
  }

  Future<bool> updateVideo(String id, Map<String, dynamic> updates, {File? videoFile, File? thumbnail, bool removeThumbnail = false, bool removeVideo = false}) async {
    try {
      final toUpdate = <String, dynamic>{};
      toUpdate.addAll(updates);
      if (videoFile != null) {
        final vref = FirebaseStorage.instance.ref().child('videos/$id/${videoFile.path.split('/').last}');
        final task = await vref.putFile(videoFile);
        toUpdate['videoUrl'] = await task.ref.getDownloadURL();
      }
      if (thumbnail != null) {
        final tref = FirebaseStorage.instance.ref().child('videos/$id/thumbnail/${thumbnail.path.split('/').last}');
        final task = await tref.putFile(thumbnail);
        toUpdate['thumbnailUrl'] = await task.ref.getDownloadURL();
      }
      if (removeThumbnail) {
        toUpdate['thumbnailUrl'] = FieldValue.delete();
      }
      if (removeVideo) {
        toUpdate['videoUrl'] = FieldValue.delete();
      }
      await _firestore.collection('videos').doc(id).update(toUpdate);
      return true;
    } catch (e, s) {
      developer.log('Error updating video', name: 'VideoService', error: e, stackTrace: s);
      return false;
    }
  }
}
