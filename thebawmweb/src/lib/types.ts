

import { z } from 'zod';

export const UserProfileSchema = z.object({
  uid: z.string(),
  username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username must be 20 characters or less."),
  email: z.string().email(),
  displayName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  bio: z.string().max(160, "Bio must be 160 characters or less.").optional(),
  profilePictureUrl: z.string().url().optional().or(z.literal("")),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  hometown: z.string().optional(),
  liveIn: z.string().optional(),
  currentStudy: z.string().optional(),
  instituteName: z.string().optional(),
  dob: z.string().optional(),
  relationshipStatus: z.enum(['Single', 'In a relationship', 'Engaged', 'Married', 'Complicated', 'Rather not say']).optional(),
  gender: z.enum(['Male', 'Female', 'Other', 'Rather not say']).optional(),
  createdAt: z.any(),
  userType: z.enum(['Active', 'Inactive', 'Suspended', 'Thunder', 'Star', 'Leader', 'Editor', 'Admin', 'Advanced']).optional(),
  followedPages: z.array(z.string()).optional(),
  likedPages: z.array(z.string()).optional(),
  followedGroups: z.array(z.string()).optional(),
  participatedEvents: z.array(z.string()).optional(),
  participatedQuizzes: z.array(z.string()).optional(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const PostSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  pageId: z.string().optional(),
  groupId: z.string().optional(),
  eventId: z.string().optional(),
  quizId: z.string().optional(),
  text: z.string().optional(),
  mediaUrls: z.array(z.string().url()).optional(),
  mediaType: z.enum(['image', 'video']).optional().or(z.literal("")),
  createdAt: z.any(), 
  likes: z.array(z.string()),
  viewCount: z.number().default(0),
  shareCount: z.number().default(0),
  commentCount: z.number().default(0),
  author: UserProfileSchema,
  scheduledAt: z.any().optional(),
  postType: z.enum(['user', 'page', 'group', 'event', 'event_announcement', 'quiz', 'quiz_announcement']),
  source: z.union([
    z.object({ type: z.literal('user') }),
    z.object({ type: z.literal('page'), id: z.string(), name: z.string() }),
    z.object({ type: z.literal('group'), id: z.string(), name: z.string() }),
    z.object({ type: z.literal('event'), id: z.string(), name: z.string() }),
    z.object({ type: z.literal('quiz'), id: z.string(), name: z.string() }),
    z.string() 
  ]).optional(),
});
export type Post = z.infer<typeof PostSchema>;

export const CommentSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  postId: z.string(),
  postType: z.string().optional(),
  text: z.string(),
  createdAt: z.any(),
  author: UserProfileSchema,
});
export type Comment = z.infer<typeof CommentSchema>;

export const ConnectionSchema = z.object({
    id: z.string(),
    status: z.enum(['pending_sent', 'pending_received', 'connected']),
});
export type Connection = z.infer<typeof ConnectionSchema>;

export const PageInfoSchema = z.object({
    id: z.string(),
    pageId: z.string(),
    name: z.string(),
    category: z.string(),
    description: z.string().optional(),
    profilePictureUrl: z.string().url().optional().or(z.literal("")),
    coverImageUrl: z.string().url().optional().or(z.literal("")),
    ownerId: z.string(),
    admins: z.array(z.string()),
    followers: z.array(z.string()),
    likes: z.array(z.string()),
    createdAt: z.any(),
    posters: z.enum(['admins', 'followers']).or(z.array(z.string())).default('admins'),
    bannedUsers: z.array(z.string()).optional(),
});
export type PageInfo = z.infer<typeof PageInfoSchema>;


export const GroupInfoSchema = z.object({
    id: z.string(),
    groupId: z.string(),
    name: z.string(),
    category: z.string(),
    description: z.string().optional(),
    profilePictureUrl: z.string().url().optional().or(z.literal("")),
    coverImageUrl: z.string().url().optional().or(z.literal("")),
    ownerId: z.string(),
    admins: z.array(z.string()),
    members: z.array(z.string()),
    pendingMembers: z.array(z.string()).optional(),
    declinedMembers: z.record(z.string(), z.any()).optional(),
    createdAt: z.any(),
    posters: z.enum(['admins', 'members']).or(z.array(z.string())).default('admins'),
    groupType: z.enum(['public', 'private']).default('public'),
});
export type GroupInfo = z.infer<typeof GroupInfoSchema>;


export const EventInfoSchema = z.object({
    id: z.string(),
    eventId: z.string(),
    name: z.string(),
    category: z.string(),
    description: z.string().optional(),
    profilePictureUrl: z.string().url().optional().or(z.literal("")),
    coverImageUrl: z.string().url().optional().or(z.literal("")),
    ownerId: z.string(),
    admins: z.array(z.string()),
    participants: z.array(z.string()),
    pendingParticipants: z.array(z.string()).optional(),
    declinedParticipants: z.record(z.string(), z.any()).optional(),
    createdAt: z.any(),
    startDate: z.any(),
    endDate: z.any(),
    posters: z.enum(['admins', 'participants']).or(z.array(z.string())).default('admins'),
    eventType: z.enum(['public', 'private']).default('public'),
    participantPostLimit: z.number().min(0).default(5),
});
export type EventInfo = z.infer<typeof EventInfoSchema>;

export const QuizInfoSchema = z.object({
    id: z.string(),
    quizId: z.string(),
    name: z.string(),
    category: z.string(),
    description: z.string().optional(),
    profilePictureUrl: z.string().url().optional().or(z.literal("")),
    coverImageUrl: z.string().url().optional().or(z.literal("")),
    ownerId: z.string(),
    admins: z.array(z.string()),
    participants: z.array(z.string()),
    pendingParticipants: z.array(z.string()).optional(),
    declinedParticipants: z.record(z.string(), z.any()).optional(),
    createdAt: z.any(),
    startDate: z.any(),
    endDate: z.any(),
    quizType: z.enum(['public', 'private']).default('public'),
    attemptLimit: z.number().min(0).default(1),
    timeLimitMinutes: z.number().min(0).default(10),
    posters: z.enum(['admins', 'participants']).or(z.array(z.string())).default('admins'),
});
export type QuizInfo = z.infer<typeof QuizInfoSchema>;

export const QuizQuestionSchema = z.object({
    id: z.string(),
    quizId: z.string(),
    questionText: z.string(),
    imageUrl: z.string().url().optional().or(z.literal("")),
    answerType: z.enum(['radio', 'checkbox', 'text', 'true_false', 'image']),
    options: z.array(z.object({ id: z.string(), text: z.string().optional(), imageUrl: z.string().url().optional().or(z.literal("")) })).optional(),
    correctAnswers: z.array(z.string()),
    points: z.coerce.number().min(0).default(1),
    createdAt: z.any(),
});
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

export const QuizSubmissionSchema = z.object({
    id: z.string(),
    quizId: z.string(),
    userId: z.string(),
    answers: z.record(z.string(), z.array(z.string())), // questionId -> answerIds
    score: z.number(),
    startedAt: z.any(),
    completedAt: z.any().optional(),
    user: UserProfileSchema.optional(),
    status: z.enum(['started', 'completed']).optional(),
});
export type QuizSubmission = z.infer<typeof QuizSubmissionSchema>;

export const PublicationPageSchema = z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    contentType: z.enum(['paragraph', 'code']),
    imageUrls: z.array(z.string().url()).optional(),
    order: z.number(),
    createdAt: z.any(),
});
export type PublicationPage = z.infer<typeof PublicationPageSchema>;

export const PublicationSchema = z.object({
    id: z.string(),
    bookId: z.string(),
    title: z.string(),
    description: z.string().optional(),
    coverPhotoUrl: z.string().url().optional().or(z.literal("")),
    authorId: z.string(),
    author: UserProfileSchema.optional(),
    tags: z.array(z.string()).optional(),
    pages: z.array(PublicationPageSchema).optional(),
    isPublished: z.boolean().default(false),
    publishDate: z.any().optional(),
    readCount: z.number().default(0),
    createdAt: z.any(),
    updatedAt: z.any().optional(),
});
export type Publication = z.infer<typeof PublicationSchema>;

export const LyricsSchema = z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    fullLyrics: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()),
    songAudioUrl: z.string().url().optional(),
    karaokeAudioUrl: z.string().url().optional(),
    authorId: z.string(),
    author: UserProfileSchema.optional(),
    viewCount: z.number().default(0),
    likes: z.array(z.string()).default([]),
    shareCount: z.number().default(0),
    commentCount: z.number().default(0),
    createdAt: z.any(),
    updatedAt: z.any().optional(),
});
export type Lyrics = z.infer<typeof LyricsSchema>;

export const VideoSchema = z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    description: z.string().optional(),
    videoUrls: z.record(z.string(), z.string().url()),
    thumbnailUrl: z.string().url(),
    uploaderId: z.string(),
    tags: z.array(z.string()),
    viewCount: z.number().default(0),
    likes: z.array(z.string()).default([]),
    dislikes: z.array(z.string()).default([]),
    createdAt: z.any(),
    scheduledTime: z.any().optional(),
    commentCount: z.number().default(0),
});
export type Video = z.infer<typeof VideoSchema>;

export const ProductCategorySchema = z.enum(['Women Fashion', 'Men Fashion', 'Traditional', 'Culture', 'Hand crafted', 'Electronic', 'Foods', 'Kids assets', 'Instruments', 'others']);
export type ProductCategory = z.infer<typeof ProductCategorySchema>;

export const ProductSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    price: z.number(),
    category: ProductCategorySchema,
    images: z.array(z.string().url()),
    stock: z.number().int(),
    sellerId: z.string(),
    sellerContact: z.string(),
    createdAt: z.any(),
});
export type Product = z.infer<typeof ProductSchema>;

export const ReviewSchema = z.object({
  id: z.string(),
  productId: z.string(),
  userId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  createdAt: z.any(),
  author: UserProfileSchema.optional(),
});
export type Review = z.infer<typeof ReviewSchema>;

export const AboutBawmPageSchema = z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    contentType: z.enum(['paragraph', 'code']),
    imageUrls: z.array(z.string().url()).optional(),
    order: z.number(),
    createdAt: z.any(),
});
export type AboutBawmPage = z.infer<typeof AboutBawmPageSchema>;

export const AboutBawmSchema = z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    description: z.string().optional(),
    coverPhotoUrl: z.string().url().optional().or(z.literal("")),
    authorId: z.string(),
    author: UserProfileSchema.optional(),
    tags: z.array(z.string()).optional(),
    pages: z.array(AboutBawmPageSchema).optional(),
    isPublished: z.boolean().default(false),
    publishDate: z.any().optional(),
    readCount: z.number().default(0),
    createdAt: z.any(),
    updatedAt: z.any().optional(),
});
export type AboutBawm = z.infer<typeof AboutBawmSchema>;

export const UserTypes: UserProfile['userType'][] = ['Active', 'Thunder', 'Star', 'Leader', 'Editor', 'Admin', 'Advanced', 'Inactive', 'Suspended'];
export const AssignableUserTypes: UserProfile['userType'][] = ['Active', 'Thunder', 'Star', 'Leader', 'Editor', 'Admin', 'Advanced'];


export const PostPermissionsSchema = z.object({
  canPost: z.array(z.string()),
  dailyPostLimit: z.record(z.string().or(z.number()).transform(v => Number(v) || 0)),
  canUploadImage: z.array(z.string()),
  imageUploadLimit: z.record(z.string().or(z.number()).transform(v => Number(v) || 0)),
  canUploadVideo: z.array(z.string()),
  canDeleteOthersPosts: z.array(z.string()),
  canEditOwnPost: z.array(z.string()),
  canSchedulePost: z.array(z.string()),
});
export type PostPermissions = z.infer<typeof PostPermissionsSchema>;

export const DefaultPostPermissions: PostPermissions = {
    canPost: ['Active', 'Thunder', 'Star', 'Leader', 'Editor', 'Admin', 'Advanced'],
    dailyPostLimit: {
        'Active': 5,
        'Thunder': 10,
        'Star': 15,
        'Leader': 20,
        'Editor': 25,
        'Admin': 999,
        'Advanced': 999,
        'Inactive': 0,
        'Suspended': 0,
    },
    canUploadImage: ['Active', 'Thunder', 'Star', 'Leader', 'Editor', 'Admin', 'Advanced'],
    imageUploadLimit: {
        'Active': 1,
        'Thunder': 2,
        'Star': 4,
        'Leader': 6,
        'Editor': 8,
        'Admin': 10,
        'Advanced': 10,
        'Inactive': 0,
        'Suspended': 0,
    },
    canUploadVideo: ['Star', 'Leader', 'Editor', 'Admin', 'Advanced'],
    canDeleteOthersPosts: ['Admin', 'Advanced'],
    canEditOwnPost: ['Editor', 'Admin', 'Leader', 'Advanced'],
    canSchedulePost: ['Editor', 'Admin', 'Leader', 'Advanced'],
};

export const UserManagementPermissionsSchema = z.object({
    canUpdateUserType: z.array(z.string()),
    canDeleteUsers: z.array(z.string()),
});
export type UserManagementPermissions = z.infer<typeof UserManagementPermissionsSchema>;

export const DefaultUserManagementPermissions: UserManagementPermissions = {
    canUpdateUserType: ['Admin'],
    canDeleteUsers: ['Admin'],
};


export const PageCreationPermissionsSchema = z.object({
    allowedUserIds: z.array(z.string()),
});
export type PageCreationPermissions = z.infer<typeof PageCreationPermissionsSchema>;

export const DefaultPageCreationPermissions: PageCreationPermissions = {
    allowedUserIds: [],
};


export const GroupCreationPermissionsSchema = z.object({
    allowedUserIds: z.array(z.string()),
});
export type GroupCreationPermissions = z.infer<typeof GroupCreationPermissionsSchema>;

export const DefaultGroupCreationPermissions: GroupCreationPermissions = {
    allowedUserIds: [],
};

export const EventCreationPermissionsSchema = z.object({
    allowedUserIds: z.array(z.string()),
});
export type EventCreationPermissions = z.infer<typeof EventCreationPermissionsSchema>;

export const DefaultEventCreationPermissions: EventCreationPermissions = {
    allowedUserIds: [],
};

export const QuizCreationPermissionsSchema = z.object({
    allowedUserIds: z.array(z.string()),
});
export type QuizCreationPermissions = z.infer<typeof QuizCreationPermissionsSchema>;

export const DefaultQuizCreationPermissions: QuizCreationPermissions = {
    allowedUserIds: [],
};

export const BookCreationPermissionsSchema = z.object({
    allowedUserIds: z.array(z.string()),
});
export type BookCreationPermissions = z.infer<typeof BookCreationPermissionsSchema>;

export const DefaultBookCreationPermissions: BookCreationPermissions = {
    allowedUserIds: [],
};

export const LyricsCreationPermissionsSchema = z.object({
    allowedUserIds: z.array(z.string()),
});
export type LyricsCreationPermissions = z.infer<typeof LyricsCreationPermissionsSchema>;

export const DefaultLyricsCreationPermissions: LyricsCreationPermissions = {
    allowedUserIds: [],
};

export const VideoCreationPermissionsSchema = z.object({
    allowedUserIds: z.array(z.string()),
});
export type VideoCreationPermissions = z.infer<typeof VideoCreationPermissionsSchema>;

export const DefaultVideoCreationPermissions: VideoCreationPermissions = {
    allowedUserIds: [],
};

export const MarketplacePermissionsSchema = z.object({
    allowedUserIds: z.array(z.string()),
});
export type MarketplacePermissions = z.infer<typeof MarketplacePermissionsSchema>;

export const DefaultMarketplacePermissions: MarketplacePermissions = {
    allowedUserIds: [],
};

export const AboutBawmCreationPermissionsSchema = z.object({
    allowedUserIds: z.array(z.string()),
});
export type AboutBawmCreationPermissions = z.infer<typeof AboutBawmCreationPermissionsSchema>;

export const DefaultAboutBawmCreationPermissions: AboutBawmCreationPermissions = {
    allowedUserIds: [],
};

export type UserQuizAttempt = {
    id: string;
    quizId: string;
    userId: string;
    score: number;
    completedAt: any;
    attemptNumber: number;
};

// Messaging Types
export const MessageSchema = z.object({
    id: z.string(),
    senderId: z.string(),
    text: z.string().optional(),
    imageUrl: z.string().optional(),
    videoUrl: z.string().optional(),
    createdAt: z.any(),
    status: z.enum(['sending', 'sent', 'delivered', 'read']).optional(),
});
export type Message = z.infer<typeof MessageSchema>;

export const ConversationSchema = z.object({
    id: z.string(),
    participants: z.array(z.string()),
    lastMessage: MessageSchema.optional(),
    updatedAt: z.any(),
    unreadCount: z.record(z.string(), z.number()).optional(),
});
export type Conversation = z.infer<typeof ConversationSchema>;

export const MessageSettingsSchema = z.record(
    z.string(), // UserType
    z.object({
        canSendPhoto: z.boolean(),
        canSendVideo: z.boolean(),
    })
);
export type MessageSettings = z.infer<typeof MessageSettingsSchema>;


export const NotificationSchema = z.object({
    id: z.string(),
    recipientId: z.string(),
    senderId: z.string(),
    type: z.enum(['connection_request', 'group_join_request', 'event_join_request', 'quiz_join_request']),
    entityId: z.string(), // e.g., groupId or eventId
    entityType: z.enum(['user', 'group', 'event', 'quiz']),
    createdAt: z.any(),
    read: z.boolean(),
});
export type Notification = z.infer<typeof NotificationSchema>;
