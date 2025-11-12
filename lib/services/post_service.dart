import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:image_picker/image_picker.dart';
import 'package:myapp/models/post.dart';
import 'dart:io';
import 'package:firebase_storage/firebase_storage.dart';

class PostService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseStorage _storage = FirebaseStorage.instance;

  Future<void> createPost({
    required String text,
    required List<XFile> mediaFiles,
    required String? mediaType,
    required String authorId,
    required String authorDisplayName,
  }) async {
    final List<String> mediaUrls = [];
    for (final mediaFile in mediaFiles) {
      final ref = _storage.ref().child('posts/${DateTime.now().toIso8601String()}');
      final uploadTask = await ref.putFile(File(mediaFile.path));
      final url = await uploadTask.ref.getDownloadURL();
      mediaUrls.add(url);
    }

    await _firestore.collection('posts').add({
      'text': text,
      'mediaUrls': mediaUrls,
      'mediaType': mediaType,
      'authorId': authorId,
      'authorDisplayName': authorDisplayName,
      'createdAt': FieldValue.serverTimestamp(),
      'likes': [],
      'commentCount': 0,
      'shareCount': 0,
      'viewCount': 0,
    });
  }

  Stream<List<Post>> getPosts() {
    return _firestore.collection('posts').orderBy('createdAt', descending: true).snapshots().map((snapshot) {
      return snapshot.docs.map((doc) => Post.fromFirestore(doc)).toList();
    });
  }

  Stream<List<Post>> getPostsByAuthor(String authorId) {
    return _firestore
        .collection('posts')
        .where('authorId', isEqualTo: authorId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) => Post.fromFirestore(doc)).toList();
    });
  }

  Future<List<Post>> getFeedPosts(String userId) async {
    // This is a simplified feed. In a real app, you'd have a more complex algorithm.
    final snapshot = await _firestore.collection('posts').orderBy('createdAt', descending: true).get();
    return snapshot.docs.map((doc) => Post.fromFirestore(doc)).toList();
  }

  Future<PostPermissions> getPostPermissions() async {
    final snapshot = await _firestore.collection('settings').doc('posts').get();
    return PostPermissions.fromFirestore(snapshot.data()!);
  }

  Future<void> likePost(String postId, String userId) async {
    await _firestore.collection('posts').doc(postId).update({
      'likes': FieldValue.arrayUnion([userId])
    });
  }

  Future<void> unlikePost(String postId, String userId) async {
    await _firestore.collection('posts').doc(postId).update({
      'likes': FieldValue.arrayRemove([userId])
    });
  }

  Future<void> addComment(String postId) async {
    await _firestore.collection('posts').doc(postId).update({
      'commentCount': FieldValue.increment(1)
    });
  }

  Future<void> sharePost(String postId) async {
    await _firestore.collection('posts').doc(postId).update({
      'shareCount': FieldValue.increment(1)
    });
  }

  Future<void> incrementViewCount(String postId) async {
    await _firestore.collection('posts').doc(postId).update({
      'viewCount': FieldValue.increment(1)
    });
  }
}
