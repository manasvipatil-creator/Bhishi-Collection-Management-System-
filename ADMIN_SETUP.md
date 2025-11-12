# Admin Login Setup Instructions

## Overview
The system now includes an admin login feature with Firebase authentication.

## Admin Credentials
- **Email**: `admin123@gmail.com`
- **Password**: `admin123`

## Setup Steps

### Option 1: Using Setup Page (Recommended)
1. Start your application: `npm start`
2. Navigate to: `http://localhost:3000/setup-admin`
3. Click "Create Admin Credentials" button
4. Credentials will be automatically created in Firebase
5. Navigate to `/login` to access the login page

### Option 2: Manual Firebase Setup
1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project: `bishi-collection-project`
3. Go to "Realtime Database"
4. Click on the root node
5. Add a new child node called `Admin` with the following structure:
```json
{
  "Admin": {
    "email": "admin123@gmail.com",
    "password": "admin123",
    "name": "Admin User",
    "role": "Administrator",
    "createdAt": "2025-01-16T10:00:00.000Z"
  }
}
```

## Features Implemented

### 1. Login Page (`/login`)
- Modern gradient design
- Email and password authentication
- Error handling
- Loading states
- Responsive design

### 2. Protected Routes
- All main application routes are now protected
- Redirects to login if not authenticated
- Maintains session using localStorage

### 3. Logout Functionality
- Logout button in Navbar (top right)
- Confirmation dialog before logout
- Clears session and redirects to login

### 4. Authentication Context
- Global authentication state management
- Persistent login sessions
- User information available throughout the app

## File Structure
```
src/
├── pages/
│   └── Login.jsx                 # Login page component
├── components/
│   ├── Navbar.jsx                # Updated with logout button
│   ├── ProtectedRoute.jsx        # Route protection wrapper
│   └── SetupAdmin.jsx            # Admin setup utility page
├── context/
│   └── AuthContext.jsx           # Authentication state management
└── utils/
    └── setupAdmin.js             # Firebase admin setup functions
```

## Security Notes
⚠️ **Important**: This is a basic authentication implementation for demonstration purposes.

For production use, consider:
1. Using Firebase Authentication service instead of storing passwords in Realtime Database
2. Implementing password hashing
3. Adding password reset functionality
4. Implementing role-based access control
5. Adding session timeout
6. Using environment variables for sensitive data

## Testing
1. Visit `/setup-admin` to create credentials
2. Visit `/login` to test login
3. Try accessing protected routes without login (should redirect to login)
4. Login with correct credentials
5. Test logout functionality
6. Verify session persistence (refresh page while logged in)

## Troubleshooting

### Cannot access admin panel
- Ensure admin credentials are created in Firebase
- Check browser console for errors
- Verify Firebase connection

### Login not working
- Check Firebase Realtime Database rules
- Verify credentials in Firebase console
- Clear browser cache and localStorage

### Session not persisting
- Check browser localStorage
- Verify AuthContext is properly wrapped around App
- Check for JavaScript errors in console
