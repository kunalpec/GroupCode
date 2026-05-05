# Online VS Code

Online VS Code is a collaborative coding workspace that lets users create rooms, invite teammates, and work from a browser-based environment with isolated Docker-backed sandboxes.

This project is being built to make shared coding sessions simpler:
- create a room for a task or project
- invite collaborators with a shareable link
- manage workspace access from one dashboard
- expose useful service ports from each user container

## Screenshots

<table align="center">
  <tr>
    <td align="center" valign="top">
      <img src="https://github.com/user-attachments/assets/c531a52c-6921-453a-ad30-b75cc3d0a877" alt="Dashboard view" width="460" />
    </td>
    <td align="center" valign="top">
      <img src="https://github.com/user-attachments/assets/c2182d82-e07c-4f4d-853c-932cf7a22532" alt="Room interface" width="460" />
    </td>
  </tr>
  <tr>
    <td align="center" valign="top">
      <img src="https://github.com/user-attachments/assets/09130d0d-3e4a-49f0-891e-08662015a928" alt="Invite flow" width="460" />
    </td>
    <td align="center" valign="top">
      <img src="https://github.com/user-attachments/assets/448f3484-2640-4014-a3ea-b05a107b4eee" alt="Workspace ports" width="460" />
    </td>
  </tr>
  <tr>
    <td align="center" valign="top" colspan="2">
      <img src="https://github.com/user-attachments/assets/4cefbc43-4100-41fe-9185-60855d8231a8" alt="Additional project view" width="460" />
    </td>
  </tr>
</table>

## Features

- user authentication with JWT and OAuth support
- room creation and invite-based collaboration
- incoming invite history with accept, decline, and remove actions
- per-user Docker container provisioning
- dashboard for rooms, invites, profile, and container ports
- React frontend with Vite
- Express and MongoDB backend
- Socket.IO support for realtime collaboration features

## Tech Stack

- Frontend: React, Vite, Redux Toolkit, Tailwind CSS
- Backend: Node.js, Express, MongoDB, Mongoose
- Auth: JWT, Google OAuth, GitHub OAuth
- Infra: Docker
- Media/Email: Cloudinary, Nodemailer

## Project Structure

```text
online-vscode/
|-- Backend/
|   |-- src/
|   |-- .env.example
|   `-- package.json
|-- frontend/
|   |-- src/
|   |-- .env.example
|   `-- package.json
|-- Dockerfile
`-- README.md
```

## Why This Project Exists

Many teams and students need a quick way to spin up a shared coding space without spending time on local environment differences. This project aims to give each user a cleaner workspace flow:
- open the app
- create a room
- invite others
- work inside a container-backed environment

## Prerequisites

Make sure these are installed before running the project:

- Node.js 20+ or newer
- npm
- MongoDB local instance or MongoDB Atlas
- Docker

## Environment Setup

This repository now includes safe environment skeletons:

- `Backend/.env.example`
- `frontend/.env.example`

Copy them and create your real env files:

```bash
cp Backend/.env.example Backend/.env
cp frontend/.env.example frontend/.env
```

On Windows PowerShell:

```powershell
Copy-Item Backend/.env.example Backend/.env
Copy-Item frontend/.env.example frontend/.env
```

### Backend Variables

Fill these values in `Backend/.env`:

- `FRONTEND_URL`: frontend app URL
- `PORT`: backend port
- `NODE_ENV`: usually `development` locally
- `CORS_ORIGIN`: allowed frontend origin
- `MONGODB_URI`: MongoDB connection string
- `ACCESS_TOKEN_SECRET`: JWT access token secret
- `ACCESS_TOKEN_EXPIRY`: access token duration
- `REFRESH_TOKEN_SECRET`: JWT refresh token secret
- `REFRESH_TOKEN_EXPIRY`: refresh token duration
- `GOOGLE_CLIENT_ID`: Google OAuth client id
- `GOOGLE_CLIENT_SECRET`: Google OAuth secret
- `GOOGLE_CALLBACK_URL`: Google OAuth callback URL
- `GITHUB_CLIENT_ID`: GitHub OAuth client id
- `GITHUB_CLIENT_SECRET`: GitHub OAuth secret
- `GITHUB_CALLBACK_URL`: GitHub OAuth callback URL
- `CLOUDINARY_CLOUD_NAME`: Cloudinary cloud name
- `CLOUDINARY_API_KEY`: Cloudinary API key
- `CLOUDINARY_API_SECRET`: Cloudinary API secret
- `MAIL_USER`: sender email
- `MAIL_PASS`: email app password

### Frontend Variables

Fill these values in `frontend/.env`:

- `VITE_BACKEND_URL`: backend base URL, for example `http://localhost:3000`

## Installation

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd online-vscode
```

### 2. Install backend dependencies

```bash
cd Backend
npm install
```

### 3. Install frontend dependencies

```bash
cd ../frontend
npm install
```

## Docker Setup

This project expects a Docker image named `user_sandbox_image` for user workspaces.

Build it from the root `Dockerfile`:

```bash
docker build -t user_sandbox_image .
```

Make sure Docker Desktop or the Docker daemon is running before using container features.

## Running the App

Open two terminals.

### Terminal 1: backend

```bash
cd Backend
npm run dev
```

### Terminal 2: frontend

```bash
cd frontend
npm run dev
```

Then open:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

## Basic User Flow

1. Register or log in.
2. Open the dashboard.
3. Create a room.
4. Copy the invite link or send an invite by email.
5. Accept invites from the incoming invites section.
6. Use the dashboard to monitor container ports and room access.

## Notes For Public Users

- OAuth login requires your own Google and GitHub app credentials.
- Email invite delivery requires valid mail credentials.
- Cloudinary is required for avatar upload features.
- Docker must be available if you want per-user container workspaces.

If you only want to explore the UI first, you can still set up the frontend and backend, but some features will not work until all external services are configured.

## Roadmap Ideas

- add screenshots and architecture diagrams
- improve public deployment steps
- add seeded demo data
- add automated tests
- support production Docker Compose setup

## Contributing

Issues, suggestions, and pull requests are welcome. If you plan to contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Open a pull request

## License

Add your preferred license here before public release.
