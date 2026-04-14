# Sonic Music App - Backend

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ (or Docker)
- pnpm or npm

## Setup

### 1. Database Setup

**Option A: Using Docker**
```bash
docker run --name sonic-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=sonic_music -p 5432:5432 -d postgres
```

**Option B: Local PostgreSQL**
Create a database named `sonic_music`

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Edit `.env` file:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/sonic_music?schema=public"
JWT_SECRET="your-secure-jwt-secret-key"
JWT_EXPIRES_IN="7d"
GAANAPY_URL="http://127.0.0.1:8000"
API_TIMEOUT=7000
```

### 4. Generate Prisma Client

```bash
npx prisma generate
```

### 5. Run Migrations

```bash
npx prisma migrate dev --name init
```

### 6. Start Development Server

```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Playlists
- `GET /api/playlists` - Get user playlists
- `POST /api/playlists` - Create playlist
- `GET /api/playlists/:id` - Get playlist details
- `PUT /api/playlists/:id` - Update playlist
- `DELETE /api/playlists/:id` - Delete playlist
- `POST /api/playlists/:id/songs` - Add song to playlist
- `DELETE /api/playlists/:id/songs?songId=xxx` - Remove song

### Saved Albums
- `GET /api/saved-albums` - Get saved albums
- `POST /api/saved-albums` - Save album
- `DELETE /api/saved-albums/:id` - Remove saved album

### Listening History
- `GET /api/history` - Get listening history
- `POST /api/history` - Add to history

### Music Data
- `GET /api/trending` - Get trending songs
- `GET /api/search?q=xxx` - Search songs
- `GET /api/explore` - Get paginated explore data
- `GET /api/albums` - Get albums list
- `GET /api/albums/:id` - Get album details
- `GET /api/categories` - Get categories
- `GET /api/suggestions?q=xxx` - Get search suggestions

## Authentication

Include JWT token in Authorization header:
```
Authorization: Bearer <token>
```
