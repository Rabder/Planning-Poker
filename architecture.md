
# Architecture

planning-poker/                 # root folder
├── client/                     # frontend (React app)
│   ├── src/                    # source code
│   │   ├── components/         # React components (UI pieces)
│   │   ├── hooks/              # custom React hooks
│   │   ├── types/              # TS type definitions
│   │   └── App.tsx             # main React component
│   ├── package.json            # frontend dependencies (react, socket.io-client)
│   └── tsconfig.json           # TS config for frontend
│
└── server/                     # backend (Node.js + Socket.io)
    ├── src/                    # Source code
    │   ├── types/              # TypeScript type definitions
    │   └── server.ts           # Main server file (Socket.io logic)
    ├── package.json            # Backend dependencies (express, socket.io)
    └── tsconfig.json           # TypeScript config for backend

