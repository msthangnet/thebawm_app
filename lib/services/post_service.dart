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
    DateTime? scheduledAt,
    String? source,
  }) async {
    final List<String> mediaUrls = [];
    for (final mediaFile in mediaFiles) {
      final ref = _storage.ref().child('posts/${DateTime.now().toIso8601String()}');
      final uploadTask = await ref.putFile(File(mediaFile.path));
      final url = await uploadTask.ref.getDownloadURL();
      mediaUrls.add(url);
    }

    String postCollection;
    switch(postType) {
        case 'page':
            postCollection = 'pagesPost';
            break;
        case 'group':
            postCollection = 'groupPost';
            break;
        case 'event':
            postCollection = 'eventsPost';
            break;
        case 'quiz':
            postCollection = 'quizzesPost';
            break;
        default:
            postCollection = 'usersPost';
    }

    final data = {
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
    };

    if (scheduledAt != null) {
      data['scheduledAt'] = Timestamp.fromDate(scheduledAt);
    } else {
      data['scheduledAt'] = null;
    }

    if (source != null) {
      data['source'] = source;
    }

    await _firestore.collection(postCollection).add(data);
  }

  Stream<List<Post>> getPosts() {
    return _firestore.collection('posts').orderBy('createdAt', descending: true).snapshots().map((snapshot) {
      return snapshot.docs.map((doc) => Post.fromFirestore(doc)).toList();
    });
  }

  Stream<List<Post>> getPostsByAuthor(String authorId) {
    return _firestore
        .collection('usersPost')
        .where('authorId', isEqualTo: authorId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) => Post.fromFirestore(doc, type: 'user')).toList();
    });
  }

  Future<List<Post>> getFeedPosts(String userId) async {
    // This is a simplified feed logic. For a full implementation, refer to the web app's logic.
    try {
      final connSnap = await _firestore.collection('users').doc(userId).collection('connections').where('status', isEqualTo: 'connected').get();
      final friendIds = connSnap.docs.map((d) => d.id).toList();
      friendIds.add(userId);

      final results = <Post>[];

      if (friendIds.isNotEmpty) {
        final q = await _firestore.collection('usersPost').where('authorId', whereIn: friendIds.take(10).toList()).get();
        for (final doc in q.docs) {
          results.add(Post.fromFirestore(doc, type: 'user'));
        }
      }

      final recentSnap = await _firestore.collection('posts').orderBy('createdAt', descending: true).limit(20).get();
      for (final doc in recentSnap.docs) {
        results.add(Post.fromFirestore(doc));
      }
      
      results.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return results;
    } catch (e) {
      rethrow;
    }
  }

  Future<PostPermissions> getPostPermissions() async {
    final snapshot = await _firestore.collection('app_settings').doc('postPermissions').get();
    if (snapshot.exists) {
      return PostPermissions.fromFirestore(snapshot.data()!);
    }
    return PostPermissions.defaultPermissions;
  }

  Future<void> likePost(String postId, String userId, String postCollection) async {
    await _firestore.collection(postCollection).doc(postId).update({
      'likes': FieldValue.arrayUnion([userId])
    });
  }

  Future<void> unlikePost(String postId, String userId, String postCollection) async {
    await _firestore.collection(postCollection).doc(postId).update({
      'likes': FieldValue.arrayRemove([userId])
    });
  }

  Future<void> addComment(String postId, String postCollection) async {
    await _firestore.collection(postCollection).doc(postId).update({
      'commentCount': FieldValue.increment(1)
    });
  }

  Future<void> sharePost(String postId, String postCollection) async {
    await _firestore.collection(postCollection).doc(postId).update({
      'shareCount': FieldValue.increment(1)
    });
  }

  Future<void> incrementViewCount(String postId, String postCollection) async {
    await _firestore.collection(postCollection).doc(postId).update({
      'viewCount': FieldValue.increment(1)
    });
  }
}
