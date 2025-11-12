import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:myapp/models/user_type.dart';

class UserProfile {
  final String uid;
  final String username;
  final String displayName;
  final String? profilePictureUrl;
  final String? coverImageUrl;
  final UserType userType;
  final Timestamp? createdAt;
  final String? bio;
  final String? gender;
  final Timestamp? dob;
  final String? relationshipStatus;
  final String? hometown;
  final String? liveIn;
  final String? currentStudy;
  final String? instituteName;

  UserProfile({
    required this.uid,
    required this.username,
    required this.displayName,
    this.profilePictureUrl,
    this.coverImageUrl,
    required this.userType,
    this.createdAt,
    this.bio,
    this.gender,
    this.dob,
    this.relationshipStatus,
    this.hometown,
    this.liveIn,
    this.currentStudy,
    this.instituteName,
  });

  factory UserProfile.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    return UserProfile(
      uid: doc.id,
      username: data['username'] ?? '',
      displayName: data['displayName'] ?? '',
      profilePictureUrl: data['profilePictureUrl'],
      coverImageUrl: data['coverImageUrl'],
      userType: userTypeFromString(data['userType']),
      createdAt: data['createdAt'] as Timestamp?,
      bio: data['bio'],
      gender: data['gender'],
      dob: data['dob'] as Timestamp?,
      relationshipStatus: data['relationshipStatus'],
      hometown: data['hometown'],
      liveIn: data['liveIn'],
      currentStudy: data['currentStudy'],
      instituteName: data['instituteName'],
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'username': username,
      'displayName': displayName,
      'profilePictureUrl': profilePictureUrl,
      'coverImageUrl': coverImageUrl,
      'userType': userType.name,
      'createdAt': FieldValue.serverTimestamp(),
      'bio': bio,
      'gender': gender,
      'dob': dob,
      'relationshipStatus': relationshipStatus,
      'hometown': hometown,
      'liveIn': liveIn,
      'currentStudy': currentStudy,
      'instituteName': instituteName,
    };
  }
}
