# Odoo - AssetFlow

A production-quality **MERN** skeleton built for the Odoo hackathon's *surprise* problem
statement. Every past theme (StackIt Q&A, Skill Swap, ReWear, QuickDesk, CivicTrack, Expense
approvals, QuickCourt bookings) is the **same skeleton**: 3 roles, auth, a core resource you
create/search/filter/paginate, a status workflow, a user-to-user request, social signals, media
upload, real-time updates, and an admin moderation dashboard.

This repo ships all of that as **clean, modular, clearly-labeled reusable pieces**. At start-hour
you keep what maps to the PS, rename it, delete the rest, and only write theme-specific logic.

> Everything is real: DB-backed data, live Socket.io updates, client + server validation, JWT auth
> with 3 roles, and a genuinely functional admin dashboard. Verified end-to-end (21 API checks +
> real-time delivery) before you touched it.

---

## Prerequisites

- **Node.js 18+** (built and tested on Node 22)
- **MongoDB** running locally on `mongodb://127.0.0.1:27017`, or a MongoDB Atlas URI
  - **Windows:** MongoDB usually runs as a service already. Check with
    `Get-Service *mongo*`. If stopped: `net start MongoDB`.
  - **macOS (Homebrew):** `brew services start mongodb-community`
  - **Linux:** `sudo systemctl start mongod`
  - **Docker(any OS):** `docker run -d -p 27017:27017 --name mongo mongo:7`
  - **No local Mongo?** Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas),
    then set `MONGODB_URI` in `server/.env` to your Atlas connection string — no code changes.

---

## Setup (first run)

```bash
# 1. Install root + server + client dependencies
npm run install:all

# 2. Create env files (examples are provided)
#    server/.env and client/.env already exist in this template; if missing:
cp server/.env.example server/.env
cp client/.env.example client/.env

# 3. Seed the database (admin + 2 users + sample items/comments/requests/notifications)
npm run seed

# 4. Start server + client together
npm run dev
```

- Client: **http://localhost:5173**
- API + Socket.io: **http://localhost:5000** (health check: `/api/health`)

The client dev server proxies `/api` and `/uploads` to `:5000`, so there's no CORS friction in dev.

### Handy scripts (root `package.json`)

| Script                | What it does                                        |
| --------------------- | --------------------------------------------------- |
| `npm run install:all` | Install root + server + client deps                 |
| `npm run dev`         | Run server (nodemon) **and** client (vite) together |
| `npm run server`      | Server only                                         |
| `npm run client`      | Client only                                         |
| `npm run seed`        | Wipe + reseed the database                          |

---

## Demo credentials

| Role  | Email            | Password    |
| ----- | ---------------- | ----------- |
| Admin | `admin@demo.com` | `admin1234` |
| User  | `demo@demo.com`  | `demo1234`  |
| User  | `priya@demo.com` | `priya1234` |

---

## See real-time working (the headline demo)

Open **two browser tabs**:

1. Tab A: log in as `demo@demo.com`. Tab B: log in as `admin@demo.com`.
2. In Tab A, **Create** an item → it's `pending`.
3. In Tab B (admin), open **Admin → Moderation**, click **Approve**.
   → The item appears on the public **Browse** page live, and Tab A's **bell** increments.
4. In one tab, open an approved item you don't own and click **Send request**.
   → The owner's **bell** increments in real time; accepting it **flips the status live**.
5. Admin → **Broadcast** → every open tab's bell increments at once.

---

## Folder map

```
root/
  package.json            # dev/seed/install scripts (concurrently)
server/
  src/
    index.js              # express + http + socket.io, static /uploads, /api routes, error mw
    config/db.js          # mongoose connect (local or Atlas)
    models/
      User.js             # name,email,password(hash),role,avatar,bio,isPublic,isBanned
      Item.js             # ★ CORE RESOURCE — clone target (status, votes, text index, geo)
      Comment.js          # threaded responses (answers/replies), isAccepted
      Request.js          # ★ user-to-user workflow (swap/booking/assignment/approval)
      Notification.js     # per-user in-app notifications
    controllers/          # auth, item ★, comment, request ★, notification, admin
    routes/               # auth, item, comment, request, notification, admin (under /api)
    middleware/
      auth.middleware.js      # protect: verify JWT -> req.user (blocks banned)
      role.middleware.js      # requireRole('admin'), optionalAuth (guest reads)
      validate.middleware.js  # express-validator -> 400 envelope
      error.middleware.js     # notFound + central error handler
      upload.middleware.js    # multer -> /uploads (Cloudinary swap noted inline)
    sockets/index.js      # authed sockets; rooms: items, item:<id>, user:<id>; emit helpers
    utils/                # asyncHandler, ApiError, generateToken
  seed.js                 # demo dataset
client/
  vite.config.js          # proxy /api + /uploads -> :5000
  src/
    main.jsx App.jsx       # routes + toast host
    api/axios.js           # baseURL /api, token interceptor, 401 -> logout
    socket/socket.js       # single socket.io-client, connect(token)/disconnect
    hooks/useSocket.js     # subscribe + item-room helpers
    store/                 # authStore, itemStore ★, requestStore, notificationStore (zustand)
    lib/ui.js              # ★ design-system class constants (btn/input/card/badge/status)
    components/
      layout/              # Navbar, Sidebar (mobile drawer), Layout (mounts live notifications)
      ui/                  # Button,Input,Textarea,Select,Card,Badge,Modal,Loader,EmptyState,Pagination
      RichTextEditor, ImageUploader, SearchFilterBar, NotificationBell,
      StatusBadge, ItemCard, ProtectedRoute, RoleRoute
    pages/
      Login, Register, Home, ItemDetail, CreateEditItem, Dashboard, Profile, NotFound
      admin/ AdminDashboard, AdminUsers, AdminModeration, AdminBroadcast
```

★ = the reference pieces you clone/rename for the problem statement.

---

## Architecture at a glance

- **Layered backend:** `route → controller → model`. Routes hold validation rules; controllers hold
  logic; models hold schema + indexes. Errors flow through `asyncHandler → ApiError → errorHandler`.
- **Response envelope everywhere:** success `{ success: true, data }`, error
  `{ success: false, message, errors? }`, with correct status codes (400/401/403/404/409/500).
- **3 roles:** *guest* (no token, `optionalAuth` read access), *user* (JWT, 7d), *admin*
  (moderation). Banned users are blocked at login **and** in `protect`.
- **Real-time:** one Socket.io server with three room types — `items` (public feed),
  `item:<id>` (a detail page's live thread), `user:<id>` (private notifications). Controllers emit
  via named helpers in `sockets/index.js`.
- **Design system:** every class lives in `client/src/lib/ui.js` + the `brand` color in
  `tailwind.config.js`. Re-theme the whole app by editing those two files.

---

## MAP A PROBLEM STATEMENT TO THIS TEMPLATE IN 15 MINUTES

The five generic pieces cover every past theme. Decide what each becomes, rename, delete the rest:

| Template piece      | StackIt (Q&A)      | Skill Swap          | QuickDesk (helpdesk)   | QuickCourt (booking)  | Expense approvals     |
| ------------------- | ------------------ | ------------------- | ---------------------- | --------------------- | --------------------- |
| **Item** (core)     | Question           | Skill listing       | Support ticket         | Court / venue         | Expense claim         |
| `status`            | open/closed        | available/hidden    | open/resolved          | listed/unlisted       | pending/approved      |
| **Comment**         | Answers + accept   | Q&A on a listing    | Ticket replies         | Reviews               | Approver notes        |
| **Request**         | (n/a or "assign")  | Swap request        | Assign ticket to agent | Booking for a slot    | Approval request      |
| Request `status`    | —                  | accepted/completed  | accepted/completed     | accepted/completed    | accepted/rejected     |
| Request `meta`      | —                  | offered skill       | priority/agent         | slot time             | amount/currency       |
| **Notification**    | "your answer…"     | "swap accepted"     | "ticket assigned"      | "booking confirmed"   | "expense approved"    |
| **Admin**           | moderate questions | moderate listings   | manage agents/tickets  | moderate venues       | oversee all claims    |
| Social signals      | up/down vote       | ratings             | upvote a reply         | star rating           | —                     |

**Concretely:** rename `Item` → `Ticket`/`Skill`/`Court`, adjust its fields, update the
`CATEGORIES` arrays in `Home.jsx` / `CreateEditItem.jsx`, and put theme-specific data
(slot times, amounts, skill offered) in `Request.meta`. The status workflow, votes, uploads,
real-time, notifications and admin moderation already work — you rarely touch them.

---

## The 5-step clone recipe (add or rename a resource)

To add a **new** resource (or rename `Item` to your theme's noun), copy the reference pieces
marked ★ and follow the data as it flows through the layers:

1. **Model** — copy `server/src/models/Item.js` → `YourThing.js`. Rename, adjust fields, keep the
   shape (owner ref, `status` enum, vote arrays, text index, timestamps).
2. **Controller** — copy `server/src/controllers/item.controller.js` → `yourThing.controller.js`.
   Swap the model import; keep `list` (search/filter/paginate), ownership checks, and the socket
   emits.
3. **Route** — copy `server/src/routes/item.routes.js` → `yourThing.routes.js`, update the
   validation rules, then mount it in `server/src/index.js`:
   `app.use('/api/yourthings', yourThingRoutes)`.
4. **Store** — copy `client/src/store/itemStore.js` → `yourThingStore.js`. Point the endpoints at
   `/yourthings`. It already has filters, pagination, CRUD, vote, and socket upsert/remove.
5. **Page + socket** — copy the `Home.jsx` / `ItemDetail.jsx` / `CreateEditItem.jsx` pages, add
   routes in `client/src/App.jsx`, and wire `useSocket('yourthing:created'|'updated'|'deleted')`
   plus emit the matching events from the controller. Live updates now work end-to-end.

That's the whole loop: **model → controller → route → store → page/socket.**

---

## Uploads

Images are handled by `multer` and stored in `server/uploads`, served statically at `/uploads`.
The client `ImageUploader` posts `multipart/form-data`; controllers persist the returned paths on
the model. To move to **Cloudinary**, set the `CLOUDINARY_*` keys in `server/.env` and swap the
storage engine in `server/src/middleware/upload.middleware.js` (a note marks the exact spot) —
no controller changes needed.

## Validation

Every write endpoint runs `express-validator` rules (in the route files) through
`validate.middleware.js`, and every form has matching inline client-side validation with clear
messages and disabled-submit-while-pending. The two stay in sync — update both when you change a
field.

## Security notes for production

This is a hackathon template optimized for speed and clarity. Before production, add: server-side
HTML sanitization for rich-text (`Comment.body`, `Item.description` — see the note in
`RichTextEditor.jsx`), rate limiting, and stricter CORS/helmet headers.

---

## Troubleshooting

- **`✗ Could not connect to MongoDB`** — Mongo isn't running. Start it (see Prerequisites) or point
  `MONGODB_URI` at Atlas.
- **Port 5000/5173 in use** — stop the other process, or change `PORT` in `server/.env` (and the
  proxy target in `client/vite.config.js`).
- **401 loops in the client** — the token expired; you'll be redirected to `/login`. Log in again.
- **Real-time not updating** — confirm the socket connected (Network tab → WS). The client connects
  after login with the JWT; guests still get the public `items` feed.
