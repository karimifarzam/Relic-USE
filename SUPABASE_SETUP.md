# Supabase Backend Setup Guide

This guide will walk you through setting up Supabase as the backend for your Relic application, including authentication, database, storage, and real-time notifications.

## Prerequisites

- A Supabase account (sign up at [https://supabase.com](https://supabase.com))
- Node.js and npm installed
- The Relic application code

## Step 1: Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Fill in the project details:
   - **Name**: Relic (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the closest region to your users
4. Click "Create new project"
5. Wait for your project to be provisioned (this may take a few minutes)

## Step 2: Get Your API Credentials

1. Once your project is ready, go to **Project Settings** (gear icon in sidebar)
2. Navigate to **API** section
3. You'll need two values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon/public key** (a long JWT token)
4. Copy these values for the next step

## Step 3: Configure Environment Variables

1. Open the `.env` file in the root of your Relic project
2. Replace the placeholder values with your actual Supabase credentials:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-actual-anon-key-here
```

3. Save the file

**⚠️ IMPORTANT**: Never commit the `.env` file to version control. It's already in `.gitignore`.

## Step 4: Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click "New query"
3. Open the `supabase-schema.sql` file in your Relic project root
4. Copy the entire contents of the file
5. Paste it into the SQL Editor
6. Click "Run" to execute the schema

This will create:
- ✅ `profiles` table for user data
- ✅ `sessions` table for recording sessions
- ✅ `recordings` table for screenshots
- ✅ `comments` table for session comments
- ✅ `notifications` table for user notifications
- ✅ Row Level Security (RLS) policies for data protection
- ✅ Database triggers for auto-creating profiles and notifications
- ✅ Storage bucket for recording images

## Step 5: Enable Realtime for Notifications

1. In your Supabase dashboard, go to **Database** > **Replication**
2. Find the `notifications` table in the list
3. Toggle the switch to **enable** replication for this table
4. This allows real-time updates when new notifications are created

## Step 6: Configure Authentication

1. Go to **Authentication** > **Providers** in your Supabase dashboard
2. Make sure **Email** provider is enabled (it should be by default)
3. Optional: Configure email templates
   - Go to **Authentication** > **Email Templates**
   - Customize the confirmation and recovery email templates if desired

### Email Confirmation Settings

By default, Supabase requires email confirmation for new signups. You have two options:

**Option A: Disable Email Confirmation (for development)**
1. Go to **Authentication** > **Settings**
2. Under "Email Auth", toggle **OFF** "Enable email confirmations"
3. Users can sign in immediately after signup

**Option B: Configure Email Confirmation (for production)**
1. Keep email confirmations enabled
2. Configure your SMTP settings or use Supabase's default email service
3. Users will receive a confirmation email after signup

## Step 7: Configure Storage Bucket

The schema already creates a `recordings` bucket, but verify it exists:

1. Go to **Storage** in your Supabase dashboard
2. You should see a bucket named `recordings`
3. If not, create it:
   - Click "New bucket"
   - Name: `recordings`
   - **Public**: **OFF** (keep it private)
   - Click "Create bucket"

## Step 8: Test the Setup

### Test Authentication

Run your application and try to:

1. **Sign Up**: Create a new user account
   - Should create entry in `auth.users`
   - Should automatically create entry in `profiles` table
   - Check in **Authentication** > **Users** to verify

2. **Sign In**: Log in with the credentials
   - Should receive a valid session token

3. **Sign Out**: Log out successfully

### Test Database

1. Go to **Table Editor** in Supabase dashboard
2. You should see all tables: `profiles`, `sessions`, `recordings`, `comments`, `notifications`
3. Try creating a test session in your app
4. Verify the session appears in the `sessions` table
5. Verify it's associated with your user ID

### Test Notifications

1. Manually update a session's `approval_state` to `'approved'` in the Table Editor
2. Check the `notifications` table - a notification should be auto-created
3. Check the `profiles` table - points should be automatically awarded

## Step 9: Install Application Dependencies

If you haven't already, install the required npm packages:

```bash
npm install
```

The Supabase dependencies (`@supabase/supabase-js`, `dotenv`) should already be installed.

## Step 10: Run Your Application

```bash
npm start
```

## Architecture Overview

### Authentication Flow

```
User Sign Up
    ↓
Supabase Auth (creates auth.users entry)
    ↓
Database Trigger (creates profiles entry)
    ↓
User Receives Session Token
```

### Data Flow

```
User Creates Session
    ↓
Supabase Database (sessions table)
    ↓
User Adds Recordings
    ↓
Supabase Storage (images) + Database (metadata)
    ↓
User Submits Session
    ↓
Admin Approves/Rejects
    ↓
Database Trigger (awards points + creates notification)
    ↓
Realtime Update (user receives notification)
```

### Security

All tables have Row Level Security (RLS) enabled:
- Users can only access their own data
- Users cannot access other users' sessions, recordings, or notifications
- Automatic data isolation by user ID

## API Reference

### Authentication

```typescript
// Sign up
await window.electron.ipcRenderer.invoke('auth:sign-up', {
  email: 'user@example.com',
  password: 'password123',
  username: 'myusername'
});

// Sign in
await window.electron.ipcRenderer.invoke('auth:sign-in', {
  email: 'user@example.com',
  password: 'password123'
});

// Sign out
await window.electron.ipcRenderer.invoke('auth:sign-out');

// Get current user
await window.electron.ipcRenderer.invoke('auth:get-current-user');

// Get user profile
await window.electron.ipcRenderer.invoke('auth:get-profile', userId);
```

### Notifications

```typescript
// Get notifications
await window.electron.ipcRenderer.invoke('get-notifications', userId);

// Mark as read
await window.electron.ipcRenderer.invoke('mark-notification-read', notificationId);

// Clear all
await window.electron.ipcRenderer.invoke('clear-all-notifications', userId);
```

### Points

```typescript
// Get user points
await window.electron.ipcRenderer.invoke('get-user-points', userId);
```

## Troubleshooting

### Error: "Missing Supabase credentials"

- Make sure your `.env` file exists in the project root
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set correctly
- Restart your application after updating `.env`

### Error: "Failed to create user profile"

- Check that the database trigger `on_auth_user_created` exists
- Verify RLS policies allow INSERT on `profiles` table
- Check Supabase logs in **Logs** > **Postgres Logs**

### Notifications not appearing

- Verify Realtime is enabled for `notifications` table
- Check **Database** > **Replication**
- Ensure frontend is subscribing to notification changes

### Authentication not working

- Check **Authentication** > **Settings** for proper configuration
- Verify email confirmation settings match your setup
- Check browser console for errors
- Review Supabase logs in **Logs** > **Auth Logs**

## Next Steps

Now that your backend is set up, you need to:

1. **Create Frontend Components**:
   - Login page
   - Sign-up page
   - User profile page
   - Notification UI component

2. **Add Authentication Context**:
   - Create React context for authentication state
   - Protect routes that require authentication
   - Handle session persistence

3. **Implement Realtime Subscriptions**:
   - Subscribe to notifications table changes
   - Show desktop notifications when new notifications arrive

4. **Test the Full Flow**:
   - Sign up → Create session → Submit → Approve → Receive notification

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Realtime Guide](https://supabase.com/docs/guides/realtime)

## Support

If you encounter issues:
1. Check the Supabase dashboard logs
2. Review the browser console for errors
3. Check the Electron main process logs
4. Consult the Supabase documentation

---

**🎉 Congratulations!** Your Supabase backend is now configured and ready to use!
