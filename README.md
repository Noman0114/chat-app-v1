# Socket.IO Chat Application

A simple real-time chat application built with Node.js, Express, and Socket.IO.

## Features

- Real-time messaging
- Simple and clean UI
- Automatic message broadcasting to all connected clients

## Installation

1. Make sure you have Node.js installed on your system
2. Clone this repository
3. Install dependencies:
```bash
npm install
```

## Running the Application

1. Start the server:
```bash
npm start
```
2. Open your browser and navigate to `http://localhost:3000`
3. Open multiple browser windows to test the chat functionality

## How it Works

- The server uses Express to serve the static files and handle HTTP requests
- Socket.IO is used for real-time bidirectional communication
- Messages are broadcasted to all connected clients in real-time 