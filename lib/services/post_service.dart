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
    String? postType,
    String? pageId,
    String? groupId,
    String? eventId,
    String? quizId,
  }) async {
    final List<String> mediaUrls = [];
    for (final mediaFile in mediaFiles) {
      final ref = _storage.ref().child('posts/${DateTime.now().toIso8601String()}');
      final uploadTask = await ref.putFile(File(mediaFile.path));
      final url = await uploadTask.ref.getDownloadURL();
      mediaUrls.add(url);
    }

    // Write to usersPost collection to match web app schema.
    await _firestore.collection('usersPost').add({
      'text': text,
      'mediaUrls': mediaUrls,
      'mediaType': mediaType,
      'postType': postType,
      'pageId': pageId,
      'groupId': groupId,
      'eventId': eventId,
      'quizId': quizId,
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
    // Mirror web app behavior: include posts from connections (usersPost) and
    // context posts (posts) for followed pages/groups/events/quizzes.
    try {
      // 1) Get connected user ids
      final connSnap = await _firestore.collection('users').doc(userId).collection('connections').where('status', isEqualTo: 'connected').get();
      final friendIds = connSnap.docs.map((d) => d.id).toList();
      friendIds.add(userId);

      // 2) Read current user's profile to obtain followed/participated ids (if present)
      final userDoc = await _firestore.collection('users').doc(userId).get();
      final userData = userDoc.exists ? (userDoc.data() as Map<String, dynamic>) : <String, dynamic>{};
      final followedPages = List<String>.from(userData['followedPages'] ?? []);
      final followedGroups = List<String>.from(userData['followedGroups'] ?? []);
      final participatedEvents = List<String>.from(userData['participatedEvents'] ?? []);
      final participatedQuizzes = List<String>.from(userData['participatedQuizzes'] ?? []);

      final results = <Post>[];

      // Helper to chunk lists for whereIn (Firestore limit ~10)
      List<List<T>> _chunks<T>(List<T> list, int size) {
        final chunks = <List<T>>[];
        for (var i = 0; i < list.length; i += size) {
          chunks.add(list.sublist(i, i + size > list.length ? list.length : i + size));
        }
        return chunks;
      }

      // 3) Query usersPost authored by friends
      if (friendIds.isNotEmpty) {
        final chunks = _chunks<String>(friendIds, 10);
        for (final chunk in chunks) {
          final q = await _firestore.collection('usersPost').where('authorId', whereIn: chunk).get();
          for (final doc in q.docs) {
            results.add(Post.fromFirestore(doc));
          }
        }
      }

      // 4) Query top-level posts that reference contexts the user follows/participates in
      Future<void> _queryPostsByField(List<String> ids, String field) async {
        if (ids.isEmpty) return;
        final chunks = _chunks<String>(ids, 10);
        for (final chunk in chunks) {
          final q = await _firestore.collection('posts').where(field, whereIn: chunk).get();
          for (final doc in q.docs) {
            results.add(Post.fromFirestore(doc));
          }
        }
      }

      await _queryPostsByField(followedPages, 'pageId');
      await _queryPostsByField(followedGroups, 'groupId');
      await _queryPostsByField(participatedEvents, 'eventId');
      await _queryPostsByField(participatedQuizzes, 'quizId');

      // 5) Also include recent global posts as fallback (limit to 20)
      final recentSnap = await _firestore.collection('posts').orderBy('createdAt', descending: true).limit(20).get();
      for (final doc in recentSnap.docs) {
        results.add(Post.fromFirestore(doc));
      }

      // 6) Deduplicate by id and sort by createdAt desc
      final map = <String, Post>{};
      for (final p in results) {
        map[p.id] = p;
      }
      final unique = map.values.toList();
      unique.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return unique;
    } catch (e) {
      rethrow;
    }
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
