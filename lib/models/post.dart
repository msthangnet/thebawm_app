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
  final Map<String, dynamic>? source;
  final String postCollection;

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
    this.source,
    required this.postCollection,
  });

  factory Post.fromFirestore(DocumentSnapshot doc, {String? type}) {
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

    String getPostCollection(String? postType) {
        switch(postType) {
            case 'page':
                return 'pagesPost';
            case 'group':
                return 'groupPost';
            case 'event':
                return 'eventsPost';
            case 'event_announcement':
                return 'eventAnnouncementPosts';
            case 'quiz':
                return 'quizzesPost';
            case 'quiz_announcement':
                return 'quizAnnouncementPosts';
            default:
                return 'usersPost';
        }
    }

    final postType = type ?? data['postType'] as String? ?? 'user';

    return Post(
      id: doc.id,
      text: (data['text'] ?? '') as String,
      mediaUrls: (data['mediaUrls'] is List)
          ? List<String>.from(data['mediaUrls'])
          : <String>[],
      mediaType: data['mediaType'] as String?,
      postType: postType,
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
      source: data['source'] is Map ? data['source'] as Map<String, dynamic> : null,
      postCollection: getPostCollection(postType),
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
      source: source,
      postCollection: postCollection,
    );
  }
}

class PostPermissions {
  final List<String> canPost;
  final List<String> canUploadImage;
  final List<String> canUploadVideo;
  final List<String> canSchedulePost;
  final Map<String, int> dailyPostLimit;
  final Map<String, int> imageUploadLimit;
  final List<String> canEditOwnPost;
  final List<String> canDeleteOwnPost;
  final List<String> canDeleteOthersPosts;

  PostPermissions({
    required this.canPost,
    required this.canUploadImage,
    required this.canUploadVideo,
    required this.canSchedulePost,
    required this.dailyPostLimit,
    required this.imageUploadLimit,
    required this.canEditOwnPost,
    required this.canDeleteOwnPost,
    required this.canDeleteOthersPosts,
  });

  factory PostPermissions.fromFirestore(Map<String, dynamic> data) {
    return PostPermissions(
      canPost: List<String>.from(data['canPost'] ?? []),
      canUploadImage: List<String>.from(data['canUploadImage'] ?? []),
      canUploadVideo: List<String>.from(data['canUploadVideo'] ?? []),
      canSchedulePost: List<String>.from(data['canSchedulePost'] ?? []),
      dailyPostLimit: Map<String, int>.from(data['dailyPostLimit'] ?? {}),
      imageUploadLimit: Map<String, int>.from(data['imageUploadLimit'] ?? {}),
      canEditOwnPost: List<String>.from(data['canEditOwnPost'] ?? []),
      canDeleteOwnPost: List<String>.from(data['canDeleteOwnPost'] ?? []),
      canDeleteOthersPosts: List<String>.from(data['canDeleteOthersPosts'] ?? []),
    );
  }

  static PostPermissions get defaultPermissions => PostPermissions(
        canPost: ['Admin', 'Standard', 'Plus', 'Pro'],
        canUploadImage: ['Admin', 'Standard', 'Plus', 'Pro'],
        canUploadVideo: ['Admin', 'Plus', 'Pro'],
        canSchedulePost: ['Admin', 'Pro'],
        dailyPostLimit: {'Admin': 1000, 'Pro': 50, 'Plus': 20, 'Standard': 10, 'Inactive': 0},
        imageUploadLimit: {'Admin': 10, 'Pro': 8, 'Plus': 4, 'Standard': 2, 'Inactive': 0},
        canEditOwnPost: ['Admin', 'Standard', 'Plus', 'Pro'],
        canDeleteOwnPost: ['Admin', 'Standard', 'Plus', 'Pro'],
        canDeleteOthersPosts: ['Admin'],
      );
}
