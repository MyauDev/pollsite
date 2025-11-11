import api from "./client";
import type {
  User,
  AuthResponse,
  LoginRequest,
  SignupRequest,
  ChangePasswordRequest,
  ResetPasswordRequest,
  ResetPasswordConfirm,
  Poll,
  CreatePollRequest,
  VoteRequest,
  Comment,
  CreateCommentRequest,
  Profile,
  Topic,
  PollAnalytics,
  PaginatedResponse,
} from "../types";

// ============ Auth Endpoints ============
export const authAPI = {
  // Get current session
  session: () => api.get<{ authenticated: boolean; user?: User }>("/auth/session/"),

  // Get current user details
  me: () => api.get<User>("/auth/me/"),

  // Sign up
  signup: (data: SignupRequest) => api.post<AuthResponse>("/auth/signup/", data),

  // Login
  login: (data: LoginRequest) => api.post<AuthResponse>("/auth/login/", data),

  // Logout
  logout: () => api.post<{ ok: boolean }>("/auth/logout/"),

  // Change password
  changePassword: (data: ChangePasswordRequest) =>
    api.post<{ ok: boolean }>("/auth/change-password/", data),

  // Request password reset
  resetPasswordRequest: (data: ResetPasswordRequest) =>
    api.post<{ ok: boolean }>("/auth/password/reset/request/", data),

  // Confirm password reset
  resetPasswordConfirm: (data: ResetPasswordConfirm) =>
    api.post<{ ok: boolean }>("/auth/password/reset/confirm/", data),

  // Check username availability
  checkUsername: (username: string) =>
    api.get<{ ok: boolean; available: boolean; normalized: string; reason?: string; hint?: string }>(
      `/auth/check-username/?u=${encodeURIComponent(username)}`
    ),

  // Check email availability
  checkEmail: (email: string) =>
    api.get<{ ok: boolean; available: boolean; normalized: string; reason?: string }>(
      `/auth/check-email/?e=${encodeURIComponent(email)}`
    ),

  // Refresh token
  refreshToken: () => api.post<{ ok: boolean }>("/auth/token/refresh/"),
};

// ============ Poll Endpoints ============
export const pollAPI = {
  // List polls (supports both page and cursor pagination)
  list: (params?: { page?: number; topic?: string; search?: string; cursor?: string }) =>
    api.get<PaginatedResponse<Poll>>("/polls/", { params }),

  // Get single poll
  get: (id: number) => api.get<Poll>(`/polls/${id}/`),

  // Create poll
  create: (data: CreatePollRequest) => api.post<Poll>("/polls/", data),

  // Update poll
  update: (id: number, data: Partial<CreatePollRequest>) =>
    api.patch<Poll>(`/polls/${id}/`, data),

  // Delete poll
  delete: (id: number) => api.delete(`/polls/${id}/`),

  // Vote on poll
  vote: (pollId: number, data: VoteRequest) =>
    api.post<import("../types").VoteResponse>(`/polls/${pollId}/vote/`, data),

  // Get poll analytics
  analytics: (pollId: number) => api.get<PollAnalytics>(`/polls/${pollId}/analytics/`),

  // My polls
  myPolls: (params?: { page?: number }) =>
    api.get<PaginatedResponse<Poll>>("/polls/my-polls/", { params }),
};

// ============ Comment Endpoints ============
export const commentAPI = {
  // List comments for a poll
  list: (pollId: number, params?: { page?: number; parent?: number }) =>
    api.get<import("../types").CommentListResponse>(`/polls/${pollId}/comments/`, { params }),

  // Create comment for a poll
  create: (pollId: number, data: CreateCommentRequest) => 
    api.post<Comment>(`/polls/${pollId}/comments/`, data),

  // Moderate comment (hide/unhide)
  moderate: (id: number, action: 'hide' | 'unhide') =>
    api.post(`/comments/${id}/moderate/`, { action }),
};

// ============ Profile Endpoints ============
export const profileAPI = {
  // Get profile by username
  get: (username: string) => api.get<Profile>(`/profiles/${username}/`),

  // Update own profile
  update: (data: { bio?: string; avatar?: string }) =>
    api.patch<Profile>("/profiles/me/", data),

  // Follow user
  follow: (username: string) => api.post<{ ok: boolean }>(`/profiles/${username}/follow/`),

  // Unfollow user
  unfollow: (username: string) => api.post<{ ok: boolean }>(`/profiles/${username}/unfollow/`),

  // Get followers
  followers: (username: string, params?: { page?: number }) =>
    api.get<PaginatedResponse<Profile>>(`/profiles/${username}/followers/`, { params }),

  // Get following
  following: (username: string, params?: { page?: number }) =>
    api.get<PaginatedResponse<Profile>>(`/profiles/${username}/following/`, { params }),
};

// ============ Topic Endpoints ============
export const topicAPI = {
  // List topics
  list: () => api.get<Topic[]>("/topics/"),

  // Get single topic
  get: (slug: string) => api.get<Topic>(`/topics/${slug}/`),

  // Get polls by topic
  polls: (slug: string, params?: { page?: number }) =>
    api.get<PaginatedResponse<Poll>>(`/topics/${slug}/polls/`, { params }),
};

// ============ Moderation Endpoints ============
export const moderationAPI = {
  // Report content
  report: (data: { content_type: "poll" | "comment"; content_id: number; reason: string }) =>
    api.post<{ ok: boolean }>("/moderation/report/", data),

  // Get reports (moderator only)
  listReports: (params?: { status?: string; page?: number }) =>
    api.get("/moderation/reports/", { params }),

  // Review report (moderator only)
  reviewReport: (id: number, action: "approve" | "dismiss") =>
    api.post(`/moderation/reports/${id}/review/`, { action }),
};
