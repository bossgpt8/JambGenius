# Chatroom Auto-Cleanup Setup

## Option 1: Use Firestore TTL (Recommended - Automatic)

Firestore now supports automatic document deletion using TTL (Time To Live):

1. Go to your Firestore Console
2. In the `chatMessages` collection, add a new field to ALL documents:
   - Field name: `expiresAt`
   - Type: Timestamp
   - Value: Current time + 30 days

3. Once done, enable TTL in the Console:
   - Click "TTL" button (usually at the bottom)
   - Select `expiresAt` field
   - Firestore will auto-delete documents 30 days after creation

## Option 2: Server-Side Cleanup (Manual)

Call this endpoint daily via cron:
```
GET /api/cleanup-chatroom?key=YOUR_CLEANUP_AUTH_KEY
```

Set `CLEANUP_AUTH_KEY` in your Vercel environment variables.

## How Messages Will Auto-Delete

When a message is sent:
1. Message gets `expiresAt` timestamp = now + 30 days
2. Images & voice notes stored in messages also get deleted
3. After 30 days, Firestore automatically removes the document
4. No manual intervention needed!

## Cost Benefit

- Firestore Free Tier: 1GB storage → Stays below limit
- Paid Tier: Saves storage costs by auto-purging old data
- Performance: Keeps collection lean and queries fast
