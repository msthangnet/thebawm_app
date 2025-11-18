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
    final data = doc.data() as Map<String, dynamic>;
    return Post(
      id: doc.id,
      text: data['text'] ?? '',
      mediaUrls: List<String>.from(data['mediaUrls'] ?? []),
      mediaType: data['mediaType'],
      postType: data['postType'],
      pageId: data['pageId'],
      groupId: data['groupId'],
      eventId: data['eventId'],
      quizId: data['quizId'],
      authorId: data['authorId'],
      authorDisplayName: data['authorDisplayName'],
      createdAt: (data['createdAt'] as Timestamp).toDate(),
      likes: List<String>.from(data['likes'] ?? []),
      commentCount: data['commentCount'] ?? 0,
      shareCount: data['shareCount'] ?? 0,
      viewCount: data['viewCount'] ?? 0,
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
