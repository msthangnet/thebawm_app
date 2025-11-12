import 'package:cloud_firestore/cloud_firestore.dart';

class PageInfo {
	final String id;
	final String pageId;
	final String name;
	final String category;
	final String? description;
	final String? profilePictureUrl;
	final String? coverImageUrl;
	final String ownerId;
	final List<String> admins;
	final List<String> followers;
	final List<String> likes;
	final DateTime? createdAt;

	PageInfo({
		required this.id,
		required this.pageId,
		required this.name,
		required this.category,
		this.description,
		this.profilePictureUrl,
		this.coverImageUrl,
		required this.ownerId,
		required this.admins,
		required this.followers,
		required this.likes,
		this.createdAt,
	});

	factory PageInfo.fromFirestore(DocumentSnapshot doc) {
		final data = doc.data() as Map<String, dynamic>? ?? {};
		return PageInfo(
			id: doc.id,
			pageId: data['pageId'] ?? doc.id,
			name: data['name'] ?? '',
			category: data['category'] ?? '',
			description: data['description'],
			profilePictureUrl: data['profilePictureUrl'],
			coverImageUrl: data['coverImageUrl'],
			ownerId: data['ownerId'] ?? '',
			admins: List<String>.from(data['admins'] ?? []),
			followers: List<String>.from(data['followers'] ?? []),
			likes: List<String>.from(data['likes'] ?? []),
			createdAt: data['createdAt'] is Timestamp ? (data['createdAt'] as Timestamp).toDate() : null,
		);
	}

	Map<String, dynamic> toMap() => {
				'pageId': pageId,
				'name': name,
				'category': category,
				'description': description,
				'profilePictureUrl': profilePictureUrl,
				'coverImageUrl': coverImageUrl,
				'ownerId': ownerId,
				'admins': admins,
				'followers': followers,
				'likes': likes,
				'createdAt': createdAt != null ? Timestamp.fromDate(createdAt!) : FieldValue.serverTimestamp(),
			};
}
