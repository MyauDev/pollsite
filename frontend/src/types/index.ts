// User and Authentication Types
export interface User {
  id: number;
  email: string;
  username: string;
  is_staff?: boolean;
}

export interface AuthResponse {
  user: User;
}

export interface LoginRequest {
  identifier: string;  // Can be username or email
  password: string;
}

export interface SignupRequest {
  email: string;
  username: string;
  password: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ResetPasswordConfirm {
  uid: string;
  token: string;
  new_password: string;
}

// Vote Response from backend
export interface VoteResponse {
  poll_id: number;
  voted_option_id: number;
  already_voted: boolean;
  idempotent: boolean;
  total_votes: number;
  counts: Record<number, number>;
  percents: Record<number, number>;
}

// Poll Stats from backend
export interface PollStats {
  total_votes: number;
  option_counts: Record<string, number>;
  updated_at: string;
}

// Poll Types
export interface Poll {
  id: number;
  title: string;
  description?: string;
  type_multi: boolean;
  results_mode: 'open' | 'hidden_until_vote' | 'hidden_until_close';
  visibility: string;
  media_url?: string;
  closes_at?: string;
  created_at: string;
  updated_at: string;
  options: PollOption[];
  stats?: PollStats;
  topics?: Topic[];
  results_available: boolean;
  user_vote?: number; // option id user voted for (null if not voted)
  author?: User;
}

export interface PollOption {
  id: number;
  text: string;
  order: number;
}

export interface Topic {
  id: number;
  name: string;
  slug: string;
}

export interface CreatePollRequest {
  title: string;
  description?: string;
  question: string;
  options: string[];
  expires_at?: string;
  topic?: number;
}

export interface VoteRequest {
  option_id: number;
}

// Comment Types
export interface CommentAuthor {
  id: number;
  username: string;
}

export interface Comment {
  id: number;
  poll: number;
  parent?: number | null;
  content: string;
  status: 'visible' | 'hidden';
  author?: CommentAuthor | null;
  created_at: string;
  replies_count: number;
}

export interface CreateCommentRequest {
  content: string;
  parent?: number | null;
}

export interface CommentListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Comment[];
}

// Profile Types
export interface Profile {
  id: number;
  user: User;
  bio?: string;
  avatar?: string;
  created_polls_count: number;
  votes_count: number;
  followers_count: number;
  following_count: number;
  is_following?: boolean;
}

// Topic Types
export interface Topic {
  id: number;
  name: string;
  slug: string;
  description?: string;
  polls_count: number;
}

// Analytics Types
export interface PollAnalytics {
  poll_id: number;
  total_votes: number;
  unique_voters: number;
  vote_distribution: {
    option_id: number;
    option_text: string;
    votes: number;
    percentage: number;
  }[];
  votes_over_time: {
    date: string;
    count: number;
  }[];
}

// Follow Types
export interface FollowUser {
  follower: User;
  following: User;
  created_at: string;
}

// Report Types
export interface Report {
  id: number;
  content_type: 'poll' | 'comment';
  content_id: number;
  reason: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  created_at: string;
}

// Pagination
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// API Error Response
export interface APIError {
  detail?: string;
  [key: string]: any;
}
