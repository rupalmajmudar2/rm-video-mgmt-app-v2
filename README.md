# Video Management Application

A web-based gallery for family & friends to view photos/videos stored on a Synology DS224+ NAS.

## Features

- **Multi-source support**: VideoTapes, iCloud, Google Photos, Google Drive, User Uploads
- **VideoTape management**: Special handling for tape numbers (required and unique)
- **User authentication**: Admin and user roles with self-registration
- **Media gallery**: Responsive grid layout with filtering and search
- **Tags and comments**: User-generated content with moderation
- **Mobile/TV friendly**: Responsive design for all devices

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python 3.12
- **Database**: MySQL with SQLAlchemy ORM
- **Authentication**: JWT tokens with refresh mechanism

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- MySQL 8.0+

### Setup

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd rm-video-mgmt-app-cursor-v2
   ```

2. **Backend setup**:
   ```bash
   cd backend
   ./setup.sh  # Creates venv and installs dependencies
   ```

3. **Database setup**:
   - Install and start MySQL
   - Create database: `CREATE DATABASE video_mgmt_db;`
   - Update `backend/.env` with your database credentials
   - Run migrations: `cd backend && source venv/bin/activate && alembic upgrade head`

4. **Frontend setup**:
   ```bash
   cd frontend
   npm install
   ```

5. **Start the application**:
   ```bash
   ./start.sh  # Starts both backend and frontend
   ```

### Manual Start

**Backend** (Terminal 1):
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend** (Terminal 2):
```bash
cd frontend
npm run dev
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with email/password
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout and revoke token
- `GET /auth/me` - Get current user info

### Media
- `GET /media` - List media with filters
- `GET /media/{id}` - Get specific media
- `POST /media` - Create media (admin only)
- `POST /media/{id}/tags` - Add tag to media
- `DELETE /media/{id}/tags/{tag_id}` - Remove tag from media
- `POST /media/{id}/comments` - Add comment to media
- `GET /media/{id}/comments` - Get media comments

### Admin
- `GET /admin/users` - List all users
- `PATCH /admin/users/{id}` - Update user role/status
- `DELETE /admin/users/{id}` - Delete user

## Database Schema

The application uses a normalized MySQL schema with the following key tables:

- `users` - User accounts and roles
- `media` - Media files with metadata
- `media_sources` - Source types (VideoTape, iCloud, etc.)
- `tags` - User-created tags
- `media_tags` - Many-to-many relationship
- `comments` - User comments on media
- `sessions` - JWT refresh tokens

## VideoTape Special Handling

VideoTape media requires special handling:
- `tape_number` field is **required** and **unique** among VideoTape items
- Other sources **cannot** have a tape_number
- Validation is enforced through the `MediaSource` abstraction

## Development

### Backend Development
```bash
cd backend
source venv/bin/activate
pytest  # Run tests
alembic revision --autogenerate -m "Description"  # Create migration
alembic upgrade head  # Apply migrations
```

### Frontend Development
```bash
cd frontend
npm run dev  # Development server
npm run build  # Production build
npm run lint  # ESLint
```

## Deployment

The application is designed for deployment on Synology DS224+ NAS:

1. **Containerization**: Use Docker for both frontend and backend
2. **Database**: MySQL 8.0 on NAS
3. **Storage**: Media files stored on NAS volumes
4. **Reverse Proxy**: Nginx for SSL termination and routing

## Configuration

Environment variables (see `backend/env.example`):

```env
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/video_mgmt_db
SECRET_KEY=your-secret-key-here
MEDIA_STORAGE_PATH=/volume1/media
MAX_FILE_SIZE_MB=2048
```

## License

Private project for family use.
