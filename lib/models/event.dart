import 'package:cloud_firestore/cloud_firestore.dart';

class EventInfo {
	final String id;
	final String eventId;
	final String name;
	final String category;
	final String? description;
	final String? profilePictureUrl;
	final String? coverImageUrl;
	final String ownerId;
	final List<String> admins;
	final List<String> participants;
	final DateTime? startDate;
	final DateTime? endDate;
	final DateTime? createdAt;
	final String eventType; // 'public' | 'private'

	EventInfo({
		required this.id,
		required this.eventId,
		required this.name,
		required this.category,
		this.description,
		this.profilePictureUrl,
		this.coverImageUrl,
		required this.ownerId,
		required this.admins,
		required this.participants,
		this.startDate,
		this.endDate,
		this.createdAt,
		this.eventType = 'public',
	});

	factory EventInfo.fromFirestore(DocumentSnapshot doc) {
		final data = doc.data() as Map<String, dynamic>? ?? {};
		DateTime? parseDate(dynamic v) {
			if (v == null) return null;
			if (v is Timestamp) return v.toDate();
			if (v is String) return DateTime.tryParse(v);
			return null;
		}

		return EventInfo(
			id: doc.id,
			eventId: data['eventId'] ?? doc.id,
			name: data['name'] ?? '',
			category: data['category'] ?? '',
			description: data['description'],
			profilePictureUrl: data['profilePictureUrl'],
			coverImageUrl: data['coverImageUrl'],
			ownerId: data['ownerId'] ?? '',
			admins: List<String>.from(data['admins'] ?? []),
			participants: List<String>.from(data['participants'] ?? []),
			startDate: parseDate(data['startDate']),
			endDate: parseDate(data['endDate']),
			createdAt: data['createdAt'] is Timestamp ? (data['createdAt'] as Timestamp).toDate() : null,
			eventType: data['eventType'] ?? 'public',
		);
	}

	Map<String, dynamic> toMap() => {
				'eventId': eventId,
				'name': name,
				'category': category,
				'description': description,
				'profilePictureUrl': profilePictureUrl,
				'coverImageUrl': coverImageUrl,
				'ownerId': ownerId,
				'admins': admins,
				'participants': participants,
				'startDate': startDate != null ? Timestamp.fromDate(startDate!) : null,
				'endDate': endDate != null ? Timestamp.fromDate(endDate!) : null,
				'createdAt': createdAt != null ? Timestamp.fromDate(createdAt!) : FieldValue.serverTimestamp(),
				'eventType': eventType,
			};
}
