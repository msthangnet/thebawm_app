import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:image_picker/image_picker.dart';
import 'package:myapp/models/post.dart';
import 'package:myapp/models/user_profile.dart';
import 'dart:io';
import 'package:firebase_storage/firebase_storage.dart';

class PostService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseStorage _storage = FirebaseStorage.instance;
  // Broadcast stream to notify UI when posts change (create/update/delete)
  final StreamController<void> _updatesController = StreamController<void>.broadcast();

  Stream<void> get updates => _updatesController.stream;

  void notifyUpdates() {
    try {
      _updatesController.add(null);
    } catch (_) {}
  }

  Future<UserProfile?> _getUserProfile(String uid) async {
    try {
      final doc = await _firestore.collection('users').doc(uid).get();
      if (doc.exists) {
        return UserProfile.fromFirestore(doc);
      }
    } catch (_) {}
    return null;
  }

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
    // Notify listeners (UI) that a new post is available
    notifyUpdates();
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

  /// Returns a stream that merges global `posts` snapshots and user/friends `usersPost` snapshots.
  /// This provides lower-latency updates for the feed by listening to Firestore snapshots.
  Stream<List<Post>> getFeedPostsStream(String userId) {
    final controller = StreamController<List<Post>>.broadcast();

    controller.onListen = () {
      final Map<String, Post> merged = {};
      final List<StreamSubscription> userPostSubs = [];
      StreamSubscription? postsSub;
      StreamSubscription? connectionsSub;

      void emit() {
        final list = merged.values.toList();
        list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
        try {
          if (!controller.isClosed) controller.add(list);
        } catch (_) {}
      }

      postsSub = _firestore.collection('posts').orderBy('createdAt', descending: true).snapshots().listen((snap) {
        for (final doc in snap.docs) {
          final p = Post.fromFirestore(doc);
          final key = 'posts/${doc.id}';
          merged[key] = p;
          // fetch author profile asynchronously and attach when available
          _getUserProfile(p.authorId).then((author) {
            if (author != null) {
              merged[key] = p.copyWith(author: author);
              emit();
            }
          }).catchError((_) {});
        }
        emit();
      }, onError: (e) {
        try { if (!controller.isClosed) controller.addError(e); } catch(_) {}
      });

      // listen to connections and dynamically subscribe to usersPost queries for friend batches
      connectionsSub = _firestore.collection('users').doc(userId).collection('connections').snapshots().listen((connSnap) {
        final friendIds = connSnap.docs.map((d) => d.id).toList();
        // include self
        if (!friendIds.contains(userId)) friendIds.add(userId);

        // cancel previous userPost subscriptions
        for (final s in userPostSubs) {
          s.cancel();
        }
        userPostSubs.clear();

        // Firestore 'whereIn' supports up to 10 items per query; batch if needed
        const batchSize = 10;
        for (var i = 0; i < friendIds.length; i += batchSize) {
          final batch = friendIds.sublist(i, (i + batchSize) > friendIds.length ? friendIds.length : i + batchSize);
          if (batch.isEmpty) continue;
          final q = _firestore.collection('usersPost').where('authorId', whereIn: batch).orderBy('createdAt', descending: true);
          final sub = q.snapshots().listen((snap) {
            for (final doc in snap.docs) {
              final p = Post.fromFirestore(doc, type: 'user');
              final key = 'usersPost/${doc.id}';
              merged[key] = p;
              // fetch author profile and attach
              _getUserProfile(p.authorId).then((author) {
                if (author != null) {
                  merged[key] = p.copyWith(author: author);
                  emit();
                }
              }).catchError((_) {});
            }
            emit();
          }, onError: (e) {
            try { if (!controller.isClosed) controller.addError(e); } catch(_) {}
          });
          userPostSubs.add(sub);
        }
      }, onError: (e) {
        try { if (!controller.isClosed) controller.addError(e); } catch(_) {}
      });

      // cleanup when subscription count goes to zero
      controller.onCancel = () async {
        await postsSub?.cancel();
        await connectionsSub?.cancel();
        for (final s in userPostSubs) {
          await s.cancel();
        }
        if (!controller.isClosed) {
          try { controller.close(); } catch (_) {}
        }
      };
    };

    return controller.stream;
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
