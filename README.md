<div align="center">
  <img src="https://img.shields.io/badge/MERN-Stack-blue?style=for-the-badge&logo=mongodb" alt="MERN Stack">
  <img src="https://img.shields.io/badge/Socket.io-Realtime-black?style=for-the-badge&logo=socket.io" alt="Socket.io">
  <img src="https://img.shields.io/badge/Odoo-Hackathon-purple?style=for-the-badge" alt="Odoo Hackathon">
</div>

<h1 align="center">AssetFlow 🌊</h1>

<p align="center">
  <strong>A Production-Quality MERN Skeleton for the Odoo Hackathon</strong><br>
  <em>Built for speed, scalability, and stunning user experiences.</em>
</p>

---

## ✨ Why AssetFlow?

AssetFlow is a robust, ready-to-deploy MERN template engineered specifically for the Odoo hackathon's dynamic problem statements. Whether the challenge is a Q&A platform, a skill swap, an expense approval system, or a resource booking engine, AssetFlow provides a beautifully architected starting point. 

**Stop writing boilerplate. Start building features.**

---

## 🚀 Key Features

AssetFlow ships with essential functionalities right out of the box, verified end-to-end:

*   **🛡️ Multi-Role Authentication:** Secure JWT-based auth handling Guest, User, and Admin flows seamlessly.
*   **⚡ Real-Time Everything:** Powered by `Socket.io`. Watch statuses flip, notifications arrive, and feeds update live without refreshing.
*   **🧩 Cloneable Core Resource:** A meticulously crafted CRUD engine with search, filtering, pagination, and text indexing ready to be adapted to any theme.
*   **💬 Social Signals & Interactions:** Built-in support for threaded comments, upvotes/downvotes, and user-to-user workflow requests (bookings, assignments, approvals).
*   **👑 Admin Moderation Dashboard:** A fully functional command center for admins to approve items, manage users, and broadcast real-time alerts.
*   **🖼️ Media Uploads:** Integrated `multer` support for image uploads, pre-configured for easy swapping to Cloudinary.
*   **💅 Premium Design System:** A flexible Tailwind-powered UI class system (`client/src/lib/ui.js`). Re-theme the entire application in minutes.

---

## 🛠️ Tech Stack

| Frontend                | Backend                | Database & Real-Time |
| :---------------------- | :--------------------- | :------------------- |
| **React** (Vite)        | **Node.js**            | **MongoDB** (Atlas/Local) |
| **Tailwind CSS**        | **Express.js**         | **Socket.io**        |
| **Zustand** (State)     | **JWT** (Auth)         | **Mongoose**         |
| **Axios**               | **Express Validator**  | **Multer**           |

---

## 🚦 Quick Start

### 1. Prerequisites
- **Node.js 18+**
- **MongoDB** running locally (`mongodb://127.0.0.1:27017`) or an Atlas URI.

### 2. Installation & Setup

```bash
# 1. Install all dependencies across root, server, and client
npm run install:all

# 2. Setup Environment Variables (Templates provided)
cp server/.env.example server/.env
cp client/.env.example client/.env

# 3. Seed the Database with demo data
npm run seed

# 4. Blast Off! 🚀 (Starts client & server concurrently)
npm run dev
```

### 3. Access the App
- 🖥️ **Client Interface:** [http://localhost:5173](http://localhost:5173)
- ⚙️ **API & Socket Server:** `http://localhost:5000`

---

## 🎭 Demo Credentials

Jump right into the action with our seeded accounts:

| Role  | Email            | Password    | Capabilities |
| :---- | :--------------- | :---------- | :----------- |
| 👑 Admin | `admin@demo.com` | `admin1234` | Full moderation, broadcasts, user management |
| 👤 User  | `demo@demo.com`  | `demo1234`  | Create items, request, comment, vote |
| 👤 User  | `priya@demo.com` | `priya1234` | Interact, receive real-time notifications |

---

## 📡 The Real-Time Magic (Try It!)

1. Open two browser tabs. Log into **Tab A** as a User (`demo@demo.com`) and **Tab B** as Admin (`admin@demo.com`).
2. In **Tab A**, create a new item. It will initially show as `pending`.
3. In **Tab B**, navigate to **Admin → Moderation** and click **Approve**.
4. *Watch the magic!* The item instantly appears on the public feed, and a notification bell rings in Tab A—**all without a single page reload.**

---

## 🏗️ Architecture Blueprint

AssetFlow is organized for clarity and modularity.

*   **Layered Backend:** Data flows cleanly from `Routes` (validation) ➔ `Controllers` (logic) ➔ `Models` (schema).
*   **Predictable API Responses:** Standardized success/error envelopes across every endpoint.
*   **Socket Rooms:** Employs targeted rooms (`items`, `item:<id>`, `user:<id>`) for hyper-efficient real-time delivery.
*   **5-Step Clone Recipe:** Easily pivot the core resource by duplicating and renaming its Model, Controller, Route, Store, and Page components.

<p align="center">
  <i>Built with ❤️ for the Odoo Hackathon. Let's code something amazing.</i>
</p>
