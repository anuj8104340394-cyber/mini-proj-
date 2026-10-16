# Twitter Clone (MVP) 🐦

A small-scale, full-stack Twitter-like social media web application built with **React (Vite) + Tailwind CSS**, **Node.js + Express**, and **MongoDB with Mongoose**.

---

## 🛠️ Tech Stack

- **Frontend (`/client`)**: React 19, Vite, Tailwind CSS v4, React Router DOM, Axios, Lucide Icons, date-fns
- **Backend (`/server`)**: Node.js, Express, Mongoose, JWT (JSON Web Tokens), bcryptjs, Multer, Morgan, CORS, Dotenv
- **Database**: MongoDB

---

## ✨ Features

1. **Authentication**: Signup, login, logout, protected routes, and session persistence (`/api/auth/me`).
2. **Post Creation**: Create posts with up to 280 characters, optional local image upload via Multer, and optional location/ward field.
3. **Home Feed**: Real-time chronological feed (latest first) with pagination ("Load more posts").
4. **Like / Unlike**: Toggle like on any post, live count update, and highlight indicator if liked by the current user.
5. **Threaded Comments**: Comment on any post, and reply to existing comments with one level of nested hierarchy.
6. **Profile Page**: View avatar, name, username, bio, join date, like stats, and user's authored posts.
7. **Delete Management**: Delete own posts and comments (or by an admin).
8. **User Roles**: "user" and "admin" roles stored on the User schema.

---

## 📁 Project Structure

```
clone-twitter/
├── client/                     # React Frontend (Vite)
│   ├── public/
│   ├── src/
│   │   ├── components/         # Navbar, PostCard, CreatePostBox, CommentItem, TwitterIcon
│   │   ├── context/            # AuthContext (state, login, signup, logout)
│   │   ├── pages/              # Home, PostDetail, Profile, Login, Signup
│   │   ├── services/           # Axios API instance and endpoints
│   │   ├── App.jsx             # Routes & layout guards
│   │   ├── main.jsx
│   │   └── index.css           # Tailwind v4 styles
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── server/                     # Express Backend
│   ├── src/
│   │   ├── config/             # MongoDB connection (db.js)
│   │   ├── controllers/        # auth, post, comment, user controllers
│   │   ├── middleware/         # auth (JWT), upload (Multer)
│   │   ├── models/             # User, Post, Comment Mongoose schemas
│   │   ├── routes/             # auth, post, comment, user routes
│   │   ├── seed.js             # Demo data seeder (5 users, 20 posts)
│   │   └── server.js           # Express app entry point
│   ├── uploads/                # Local uploaded post images
│   ├── .env                    # Environment variables
│   ├── .env.example            # Environment sample
│   └── package.json
│
├── package.json                # Root package scripts
└── README.md
```

---

## 🗄️ Database Schemas

- **User**: `name`, `username` (unique), `email` (unique), `password` (hashed), `role` ("user" | "admin"), `avatar`, `bio`, `createdAt`
- **Post**: `author` (ref User), `text` (up to 280 chars), `image`, `location`, `status` (default: "open"), `likes` [ref User], `createdAt`
- **Comment**: `post` (ref Post), `author` (ref User), `text` (up to 280 chars), `parentComment` (ref Comment, nullable), `createdAt`

---

## 🚀 Setup & Run Instructions

### 1. Prerequisites
- **Node.js** (v18+)
- **MongoDB** running locally on `mongodb://127.0.0.1:27017`

### 2. Configure Environment (`server/.env`)
Copy `server/.env.example` to `server/.env`:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/twitter_app
JWT_SECRET=supersecretjwtkey_twitter_replica_2026
CLIENT_URL=http://localhost:5173
```

### 3. Run the Seed Script (5 Users & 20 Posts)
```bash
npm run seed
# or
cd server && npm run seed
```

### 4. Start the Application

You can start both backend and frontend from the root or in separate terminals:

**Terminal 1 (Backend Server):**
```bash
npm run server
# Express running on http://localhost:5000
```

**Terminal 2 (Frontend Client):**
```bash
npm run client
# Vite running on http://localhost:5173
```

---

## 👤 Pre-Seeded Demo Accounts

Password for all pre-seeded accounts is **`password123`**:

| Name | Username | Role | Notes |
| :--- | :--- | :--- | :--- |
| **Alex Rivera** | `alexrivera` | `admin` | Community Admin (can delete any post/comment) |
| **Sarah Chen** | `sarahc` | `user` | Frontend Engineer |
| **Marcus Johnson** | `marcusj` | `user` | Full-stack Developer |
| **Emily Davis** | `emilyd` | `user` | Product Designer |
| **Rohan Mehta** | `rohanm` | `user` | Civil Engineer |

*Quick autofill buttons for Alex and Sarah are available on the Login page.*

---

## 🔌 API Routes Reference

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Register user | No |
| `POST` | `/api/auth/login` | Login user & return JWT | No |
| `GET` | `/api/auth/me` | Fetch current session | **Yes** |
| `GET` | `/api/posts` | Get all posts (supports `page`, `limit`) | Optional |
| `POST` | `/api/posts` | Create new post (with text, image, location) | **Yes** |
| `GET` | `/api/posts/:id` | Get post by ID | Optional |
| `DELETE`| `/api/posts/:id` | Delete post (author or admin) | **Yes** |
| `POST` | `/api/posts/:id/like` | Toggle like/unlike | **Yes** |
| `GET` | `/api/posts/:id/comments` | Get comments & replies | Optional |
| `POST` | `/api/posts/:id/comments` | Add comment or reply | **Yes** |
| `DELETE`| `/api/comments/:id` | Delete comment (author or admin) | **Yes** |
| `GET` | `/api/users/:username` | Get profile & author's posts | Optional |
