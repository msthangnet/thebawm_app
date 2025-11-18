import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:myapp/models/user_profile.dart';

class Post {
  final String id;
  final String text;
  final List<String> mediaUrls;
  final String? mediaType;
  final String? postType;
  final String? pageId;
  final String? groupId;
  final String? eventId;
  final String? quizId;
  final String authorId;
  final String authorDisplayName;
  final UserProfile? author;
  final DateTime createdAt;
  final List<String> likes;
  final int commentCount;
  final int shareCount;
  final int viewCount;

  Post({
    required this.id,
    required this.text,
    required this.mediaUrls,
    this.mediaType,
    this.postType,
    this.pageId,
    this.groupId,
    this.eventId,
    this.quizId,
    required this.authorId,
    required this.authorDisplayName,
    this.author,
    required this.createdAt,
    required this.likes,
    required this.commentCount,
    required this.shareCount,
    required this.viewCount,
  });

  factory Post.fromFirestore(DocumentSnapshot doc) {
    final raw = doc.data();
    final data = (raw is Map<String, dynamic>) ? raw : <String, dynamic>{};

    DateTime parseCreatedAt(dynamic v) {
      if (v is Timestamp) return v.toDate();
      if (v is int) return DateTime.fromMillisecondsSinceEpoch(v);
      if (v is String) {
        try {
          return DateTime.parse(v);
        } catch (_) {
          return DateTime.now();
        }
      }
      return DateTime.now();
    }

    return Post(
      id: doc.id,
      text: (data['text'] ?? '') as String,
      mediaUrls: (data['mediaUrls'] is List)
          ? List<String>.from(data['mediaUrls'])
          : <String>[],
      mediaType: data['mediaType'] as String?,
      postType: data['postType'] as String?,
      pageId: data['pageId'] as String?,
      groupId: data['groupId'] as String?,
      eventId: data['eventId'] as String?,
      quizId: data['quizId'] as String?,
      authorId: (data['authorId'] ?? '') as String,
      authorDisplayName: (data['authorDisplayName'] ?? '') as String,
      createdAt: parseCreatedAt(data['createdAt']),
      likes: (data['likes'] is List) ? List<String>.from(data['likes']) : <String>[],
      commentCount: (data['commentCount'] ?? 0) as int,
      shareCount: (data['shareCount'] ?? 0) as int,
      viewCount: (data['viewCount'] ?? 0) as int,
    );
  }

  Post copyWith({
    UserProfile? author,
    int? commentCount,
    int? shareCount,
  }) {
    return Post(
      id: id,
      text: text,
      mediaUrls: mediaUrls,
      mediaType: mediaType,
      postType: postType,
      pageId: pageId,
      groupId: groupId,
      eventId: eventId,
      quizId: quizId,
      authorId: authorId,
      authorDisplayName: authorDisplayName,
      author: author ?? this.author,
      createdAt: createdAt,
      likes: likes,
      commentCount: commentCount ?? this.commentCount,
      shareCount: shareCount ?? this.shareCount,
      viewCount: viewCount,
    );
  }
}

class PostPermissions {
  final bool canPost;
  final bool canPostImages;
  final bool canPostVideos;

  PostPermissions({
    required this.canPost,
    required this.canPostImages,
    required this.canPostVideos,
  });

  factory PostPermissions.fromFirestore(Map<String, dynamic> data) {
    return PostPermissions(
      canPost: data['canPost'] ?? false,
      canPostImages: data['canPostImages'] ?? false,
      canPostVideos: data['canPostVideos'] ?? false,
    );
  }
}
