enum UserType {
  Active,
  Thunder,
  Star,
  Leader,
  Editor,
  Admin,
  Inactive,
  Suspended,
}

UserType userTypeFromString(String? userTypeString) {
  switch (userTypeString) {
    case 'Active':
      return UserType.Active;
    case 'Thunder':
      return UserType.Thunder;
    case 'Star':
      return UserType.Star;
    case 'Leader':
      return UserType.Leader;
    case 'Editor':
      return UserType.Editor;
    case 'Admin':
      return UserType.Admin;
    case 'Inactive':
      return UserType.Inactive;
    case 'Suspended':
      return UserType.Suspended;
    default:
      return UserType.Inactive;
  }
}
