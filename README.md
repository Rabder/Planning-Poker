# Planning Poker

A real-time Planning Poker application built with React, TypeScript, Node.js, Express, and Socket.io.

## Project Structure

```
planning-poker/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── types/          # TypeScript type definitions
│   │   ├── App.tsx         # Main App component
│   │   ├── main.tsx        # Entry point
│   │   └── index.css       # Global styles
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
└── server/                 # Backend Node.js server
    ├── src/
    │   ├── types/          # TypeScript type definitions
    │   └── server.ts       # Main server file with Socket.io logic
    ├── package.json
    └── tsconfig.json
```

## Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install server dependencies:
   ```bash
   cd server
   npm install
   ```

2. Install client dependencies:
   ```bash
   cd client
   npm install
   ```

## Running the Application

### Start the server:
```bash
cd server
npm run dev
```

The server will run on http://localhost:3001

### Start the client:
```bash
cd client
npm run dev
```

The client will run on http://localhost:3000

## Features

- Create and join planning poker rooms
- Real-time voting with Socket.io
- Reveal votes functionality
- Reset votes for new stories
- Player list with vote status

## Technologies

### Frontend
- React 18
- TypeScript
- Socket.io Client
- Vite

### Backend
- Node.js
- Express
- Socket.io
- TypeScript
