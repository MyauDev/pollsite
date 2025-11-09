# Poll State Tracking Implementation

## Overview
This implementation handles tracking which polls a user has already answered, supporting both authenticated users and anonymous users via device tracking.

## Backend Implementation (Already Complete)

### Vote Tracking Logic
The backend (`api/polls/serializers/poll_read.py`) includes a `get_user_vote()` method that:

1. **For Authenticated Users**: Checks votes by `user_id`
2. **For Anonymous Users**: Checks votes by `device_hash` (SHA-256 hash of device ID)

```python
def get_user_vote(self, obj: Poll):
    """
    Return the option ID voted by the current user or device (if any).
    """
    request = self.context.get("request")
    if not request:
        return None

    user = getattr(request, "user", None)
    if user and user.is_authenticated:
        vote = Vote.objects.filter(poll=obj, user=user).only("option_id").first()
        if vote:
            return vote.option_id

    device_id = request.headers.get("X-Device-Id")
    if not device_id:
        return None

    device_hash = sha256_hex(device_id)
    vote = Vote.objects.filter(poll=obj, device_hash=device_hash).only("option_id").first()
    return vote.option_id if vote else None
```

### Vote Recording
When a vote is cast (`api/polls/viewsets/poll.py`):
- Stores `user` if authenticated
- Stores `device_hash` if not authenticated
- Prevents duplicate votes via database constraints

## Frontend Implementation (Just Completed)

### 1. Device ID Management (`frontend/src/utils/device.ts`)

Creates and persists a unique device identifier in localStorage:

```typescript
export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem('device_id');
  
  if (!deviceId) {
    deviceId = generateDeviceId(); // Cryptographically random ID
    localStorage.setItem('device_id', deviceId);
  }
  
  return deviceId;
}
```

### 2. Automatic Device ID Header (`frontend/src/api/client.ts`)

All API requests now automatically include the device ID:

```typescript
api.interceptors.request.use((config) => {
  const deviceId = getOrCreateDeviceId();
  config.headers['X-Device-Id'] = deviceId;
  return config;
});
```

### 3. Poll Card Vote State (`frontend/src/components/PollCard.tsx`)

The PollCard component:
- Reads `poll.user_vote` from backend (populated for both authenticated and device-tracked users)
- Disables voting if `poll.user_vote !== null`
- Shows selected option with highlighting
- Displays percentages when voted

```typescript
const hasVoted = useMemo(
  () => optimisticVote !== null || poll.user_vote !== null,
  [optimisticVote, poll.user_vote]
);
```

## How It Works

### First Visit (Anonymous User)
1. User visits site
2. Device ID generated and stored in localStorage: `device_id = "abc123..."`
3. User votes on poll
4. Vote stored with `device_hash = SHA256("abc123...")`
5. Backend returns `user_vote: <option_id>` in poll data

### Subsequent Visits (Same Device)
1. User returns to site
2. Device ID retrieved from localStorage: `device_id = "abc123..."`
3. API requests include `X-Device-Id: abc123...` header
4. Backend checks votes by `device_hash = SHA256("abc123...")`
5. Poll data includes `user_vote: <option_id>` if voted
6. Frontend shows poll as already voted, disables voting

### After Login
1. User logs in
2. Backend migration function runs: `migrate_device_votes_to_user()`
3. All votes with matching `device_hash` are assigned to `user_id`
4. Future votes tracked by `user_id` instead of `device_hash`

### Cross-Device Behavior
- **Anonymous**: Each device has separate vote state (different device IDs)
- **Authenticated**: Votes follow the user across all devices

## Key Features

✅ **Persistent Vote Tracking**: Device ID stored in localStorage persists across sessions
✅ **Automatic Header Injection**: Every API request includes device ID
✅ **Backend Vote Detection**: Backend automatically checks user_id OR device_hash
✅ **Seamless Migration**: Device votes transfer to user account on login
✅ **UI State Management**: PollCard respects `user_vote` field from backend
✅ **Optimistic Updates**: Immediate UI feedback with backend confirmation
✅ **Error Rollback**: Failed votes revert optimistic state

## Testing Scenarios

### Test 1: Anonymous Vote Persistence
1. Open site in incognito/private window
2. Vote on poll A
3. Close and reopen browser (same incognito session)
4. Poll A should show as voted

### Test 2: Device Isolation
1. Vote on poll A in Chrome
2. Open poll A in Firefox (same machine)
3. Should be able to vote again (different device ID)

### Test 3: Login Migration
1. Vote on polls A, B, C while logged out
2. Log in to account
3. Polls A, B, C should still show as voted
4. Open different browser, log in
5. Polls A, B, C should show as voted (migrated to user)

### Test 4: Clear Storage
1. Vote on poll A
2. Open DevTools → Application → Local Storage
3. Delete `device_id` key
4. Refresh page
5. Should be able to vote on poll A again (new device ID)

## Data Flow Diagram

```
┌─────────────┐
│   Browser   │
│ localStorage│
│  device_id  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│  API Request Interceptor        │
│  Headers: X-Device-Id: abc123   │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Backend: poll.user_vote        │
│  - Check user.id (if auth)      │
│  - Check device_hash (if anon)  │
│  - Return option_id or null     │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  PollCard Component             │
│  - hasVoted = !!user_vote       │
│  - Disable vote if hasVoted     │
│  - Show selected option         │
└─────────────────────────────────┘
```

## Security Considerations

1. **Device ID is not cryptographically secure authentication** - It's for UX/tracking only
2. **Backend still validates all votes** - Prevents duplicate votes via DB constraints
3. **Device ID can be manipulated** - Backend uses IP hash as additional check
4. **Rate limiting applied** - Per device and per IP to prevent abuse
5. **User votes take precedence** - After login, device votes are superseded

## Files Modified

- ✅ `frontend/src/utils/device.ts` - Device ID generation and storage
- ✅ `frontend/src/api/client.ts` - Automatic device ID header injection
- ✅ `frontend/src/components/PollCard.tsx` - Already using `poll.user_vote`
- ✅ `frontend/src/hooks/useVote.ts` - Vote submission with device tracking

## No Changes Needed

- ❌ Backend already implements full vote tracking logic
- ❌ Poll serializer already includes `user_vote` field
- ❌ Vote endpoint already handles device_hash storage
- ❌ Migration on login already implemented
