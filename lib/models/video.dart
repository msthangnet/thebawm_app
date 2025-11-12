import 'package:cloud_firestore/cloud_firestore.dart';

class VideoInfo {
  final String id;
  final String title;
  final String? description;
  final String? videoUrl;
  final String? thumbnailUrl;
  final String authorId;
  final List<String> tags;
  final DateTime? createdAt;
  final bool isPublished;
  final DateTime? publishDate;
  final int views;

  VideoInfo({
    required this.id,
    required this.title,
    this.description,
    this.videoUrl,
    this.thumbnailUrl,
    required this.authorId,
    this.tags = const [],
    this.createdAt,
    this.isPublished = false,
    this.publishDate,
    this.views = 0,
  });

  factory VideoInfo.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return VideoInfo(
      id: doc.id,
      title: data['title'] ?? '',
      description: data['description'],
      videoUrl: data['videoUrl'],
      thumbnailUrl: data['thumbnailUrl'],
      authorId: data['authorId'] ?? '',
      tags: List<String>.from(data['tags'] ?? []),
      createdAt: data['createdAt'] is Timestamp ? (data['createdAt'] as Timestamp).toDate() : null,
      isPublished: data['isPublished'] ?? false,
      publishDate: data['publishDate'] is Timestamp ? (data['publishDate'] as Timestamp).toDate() : null,
      views: data['views'] ?? 0,
    );
  }

  Map<String, dynamic> toMap() => {
        'title': title,
        'description': description,
        'videoUrl': videoUrl,
        'thumbnailUrl': thumbnailUrl,
        'authorId': authorId,
        'tags': tags,
        'createdAt': createdAt != null ? Timestamp.fromDate(createdAt!) : FieldValue.serverTimestamp(),
        'isPublished': isPublished,
        'publishDate': publishDate != null ? Timestamp.fromDate(publishDate!) : null,
        'views': views,
      };
}
