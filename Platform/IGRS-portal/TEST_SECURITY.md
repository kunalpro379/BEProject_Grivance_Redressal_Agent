# Security Testing Guide

## Quick Security Tests

### 1. Test Unauthenticated Access
1. Open browser in incognito mode
2. Go to `http://localhost:5173/citizen/dashboard`
3. ✅ Should redirect to `/login`
4. Go to `http://localhost:5173/admin/dashboard`
5. ✅ Should redirect to `/login`

### 2. Test Citizen Access
1. Register as citizen: `citizen@test.com` / `Password123!`
2. ✅ Should auto-login and redirect to `/citizen/dashboard`
3. Try to access `/admin/dashboard`
4. ✅ Should redirect back to `/citizen/dashboard`
5. Try to access `/officer/dashboard`
6. ✅ Should redirect back to `/citizen/dashboard`

### 3. Test Officer Registration & Approval
1. Register as officer:
   - Email: `officer@test.com`
   - Password: `Password123!`
   - Role: Department Officer
   - Department: Select any
2. ✅ Should show "Pending approval" message
3. Try to login with officer credentials
4. ✅ Should show "Account pending approval" error
5. Login as admin
6. Go to `/admin/dashboard`
7. ✅ Should see pending officer in list
8. Click "Approve"
9. ✅ Officer should be approved
10. Logout and login as officer
11. ✅ Should access `/officer/dashboard`

### 4. Test Token Expiration
1. Login as any user
2. Open browser DevTools → Application → Local Storage
3. Note the `accessToken` value
4. Wait 15 minutes (or manually expire token)
5. Make any API call (navigate to different page)
6. ✅ Should auto-refresh token
7. Check Local Storage - token should be different
8. ✅ Should continue working without logout

### 5. Test Role-Based UI
1. Login as citizen
2. ✅ Should see citizen-specific navigation
3. ✅ Should NOT see admin/officer options
4. Login as officer
5. ✅ Should see officer-specific navigation
6. ✅ Should NOT see admin options
7. Login as admin
8. ✅ Should see all navigation options
9. ✅ Should see "Pending Approvals" section

### 6. Test Logout
1. Login as any user
2. Click logout button
3. ✅ Should redirect to `/login`
4. ✅ Local Storage should be cleared
5. Try to access protected route
6. ✅ Should redirect to `/login`

### 7. Test Invalid Credentials
1. Go to `/login`
2. Enter wrong email/password
3. ✅ Should show "Invalid credentials" error
4. ✅ Should NOT login

### 8. Test Registration Validation
1. Go to `/register`
2. Try to submit with:
   - Short password (< 8 chars)
   - Invalid email
   - Missing required fields
3. ✅ Should show validation errors
4. ✅ Should NOT create account

## Automated Test Script

Run this in browser console after logging in:

```javascript
// Test 1: Check if user is authenticated
console.log('User:', localStorage.getItem('user'));
console.log('Token:', localStorage.getItem('accessToken') ? 'Present' : 'Missing');

// Test 2: Check role-based access
const user = JSON.parse(localStorage.getItem('user'));
console.log('Role:', user?.role);

// Test 3: Try to access admin endpoint (should fail if not admin)
fetch('http://localhost:5000/api/admin/pending-users', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  }
})
.then(r => r.json())
.then(data => console.log('Admin access:', data))
.catch(err => console.log('Admin access denied:', err));
```

## Expected Results Summary

| Test | Expected Result | Status |
|------|----------------|--------|
| Unauthenticated access to protected routes | Redirect to login | ✅ |
| Citizen auto-approval | Immediate access | ✅ |
| Officer pending approval | Blocked until approved | ✅ |
| Role-based route access | Only allowed routes accessible | ✅ |
| Token auto-refresh | Seamless continuation | ✅ |
| Logout clears session | Cannot access protected routes | ✅ |
| Invalid credentials | Login denied | ✅ |
| Registration validation | Errors shown | ✅ |

## Security Checklist

- [x] All protected routes require authentication
- [x] Role-based access control working
- [x] Token expiration handled gracefully
- [x] Logout clears all session data
- [x] Invalid credentials rejected
- [x] Registration validation working
- [x] Admin approval system functional
- [x] No sensitive data in localStorage (only tokens)
- [x] API endpoints protected
- [x] CORS configured correctly

## Common Issues

### Issue: Infinite redirect loop
**Cause**: User object not properly set in AuthContext
**Fix**: Check localStorage has valid user object

### Issue: 401 errors not refreshing token
**Cause**: Refresh token expired or invalid
**Fix**: Logout and login again

### Issue: Can access routes for other roles
**Cause**: ProtectedRoute not properly configured
**Fix**: Check allowedRoles prop in App.jsx

### Issue: Admin can't approve users
**Cause**: Admin token not sent or invalid
**Fix**: Check Authorization header in DevTools Network tab

---

**All tests should pass before deploying to production!**
