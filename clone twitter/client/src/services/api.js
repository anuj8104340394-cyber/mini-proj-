import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

// Attach Authorization header if token exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth endpoints
export const authAPI = {
  signup: (userData) => api.post('/auth/signup', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me')
};

// Posts endpoints
export const postsAPI = {
  getPosts: (params) => api.get('/posts', { params }),
  getFollowingPosts: (params) => api.get('/posts/following', { params }),
  getPostsByTag: (tag, params) => api.get(`/posts/tag/${tag}`, { params }),
  getComplaints: (params) => api.get('/posts/complaints', { params }),
  getPostById: (id) => api.get(`/posts/${id}`),
  createPost: (formData) =>
    api.post('/posts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  editPost: (id, data) => api.put(`/posts/${id}`, data),
  updateComplaintStatus: (id, data) => api.patch(`/posts/${id}/status`, data),
  retryBmcIntegration: (id) => api.post(`/posts/${id}/retry-bmc`),
  deletePost: (id) => api.delete(`/posts/${id}`),
  toggleLike: (id) => api.post(`/posts/${id}/like`)
};

// Comments endpoints
export const commentsAPI = {
  getComments: (postId) => api.get(`/posts/${postId}/comments`),
  createComment: (postId, data) => api.post(`/posts/${postId}/comments`, data),
  deleteComment: (id) => api.delete(`/comments/${id}`)
};

// Notifications endpoints
export const notificationsAPI = {
  getNotifications: () => api.get('/notifications'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all')
};

// Users endpoints (Search, Follow, Profile update, Followers/Following)
export const usersAPI = {
  getProfile: (username) => api.get(`/users/${username}`),
  getFollowers: (username) => api.get(`/users/${username}/followers`),
  getFollowing: (username) => api.get(`/users/${username}/following`),
  search: (q) => api.get('/users/search', { params: { q } }),
  getSuggestions: () => api.get('/users/suggestions'),
  toggleFollow: (username) => api.post(`/users/${username}/follow`),
  updateProfile: (formData) =>
    api.patch('/users/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
};

export default api;
