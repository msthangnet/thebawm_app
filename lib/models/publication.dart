import 'package:cloud_firestore/cloud_firestore.dart';

class Publication {
  final String id;
  final String bookId;
  final String title;
  final String? description;
  final String? coverPhotoUrl;
  final List<String> tags;
  final String authorId;
  final bool isPublished;
  final DateTime? publishDate;
  final DateTime? createdAt;

  Publication({
    required this.id,
    required this.bookId,
    required this.title,
    this.description,
    this.coverPhotoUrl,
    this.tags = const [],
    required this.authorId,
    this.isPublished = false,
    this.publishDate,
    this.createdAt,
  });

  factory Publication.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return Publication(
      id: doc.id,
      bookId: data['bookId'] ?? '',
      title: data['title'] ?? '',
      description: data['description'],
      coverPhotoUrl: data['coverPhotoUrl'],
      tags: List<String>.from(data['tags'] ?? []),
      authorId: data['authorId'] ?? '',
      isPublished: data['isPublished'] ?? false,
      publishDate: data['publishDate'] is Timestamp ? (data['publishDate'] as Timestamp).toDate() : data['publishDate'] is String ? DateTime.tryParse(data['publishDate']) : null,
      createdAt: data['createdAt'] is Timestamp ? (data['createdAt'] as Timestamp).toDate() : null,
    );
  }

  Map<String, dynamic> toMap() => {
        'bookId': bookId,
        'title': title,
        'description': description,
        'coverPhotoUrl': coverPhotoUrl,
        'tags': tags,
        'authorId': authorId,
        'isPublished': isPublished,
        'publishDate': publishDate != null ? Timestamp.fromDate(publishDate!) : null,
        'createdAt': createdAt != null ? Timestamp.fromDate(createdAt!) : FieldValue.serverTimestamp(),
      };
}
