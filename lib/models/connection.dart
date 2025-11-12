import 'package:cloud_firestore/cloud_firestore.dart';

class Connection {
  final String id;
  final String userId;
  final String connectedUserId;
  final Timestamp createdAt;

  Connection({
    required this.id,
    required this.userId,
    required this.connectedUserId,
    required this.createdAt,
  });

  factory Connection.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Connection(
      id: doc.id,
      userId: data['userId'] as String,
      connectedUserId: data['connectedUserId'] as String,
      createdAt: data['createdAt'] as Timestamp,
    );
  }
}
