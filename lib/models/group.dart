import 'package:cloud_firestore/cloud_firestore.dart';

class GroupInfo {
	final String id;
	final String groupId;
	final String name;
	final String category;
	final String? description;
	final String? profilePictureUrl;
	final String? coverImageUrl;
	final String ownerId;
	final List<String> admins;
	final List<String> members;
	final DateTime? createdAt;
	final String groupType; // 'public' | 'private'

	GroupInfo({
		required this.id,
		required this.groupId,
		required this.name,
		required this.category,
		this.description,
		this.profilePictureUrl,
		this.coverImageUrl,
		required this.ownerId,
		required this.admins,
		required this.members,
		this.createdAt,
		this.groupType = 'public',
	});

	factory GroupInfo.fromFirestore(DocumentSnapshot doc) {
		final data = doc.data() as Map<String, dynamic>? ?? {};
		return GroupInfo(
			id: doc.id,
			groupId: data['groupId'] ?? doc.id,
			name: data['name'] ?? '',
			category: data['category'] ?? '',
			description: data['description'],
			profilePictureUrl: data['profilePictureUrl'],
			coverImageUrl: data['coverImageUrl'],
			ownerId: data['ownerId'] ?? '',
			admins: List<String>.from(data['admins'] ?? []),
			members: List<String>.from(data['members'] ?? []),
			createdAt: data['createdAt'] is Timestamp ? (data['createdAt'] as Timestamp).toDate() : null,
			groupType: data['groupType'] ?? 'public',
		);
	}

	Map<String, dynamic> toMap() => {
				'groupId': groupId,
				'name': name,
				'category': category,
				'description': description,
				'profilePictureUrl': profilePictureUrl,
				'coverImageUrl': coverImageUrl,
				'ownerId': ownerId,
				'admins': admins,
				'members': members,
				'createdAt': createdAt != null ? Timestamp.fromDate(createdAt!) : FieldValue.serverTimestamp(),
				'groupType': groupType,
			};
}
