# Test Credentials for Officials Portal

## Official Test Accounts

### 1. Senior Officer Account
- **Email:** `official@test.com`
- **Password:** `official123`
- **Role:** Official
- **Department:** Municipal Corporation
- **Designation:** Senior Officer

### 2. Administrator Account
- **Email:** `admin@test.com`
- **Password:** `admin123`
- **Role:** Official
- **Department:** Administration
- **Designation:** Administrator

### 3. Engineer Account
- **Email:** `officer@test.com`
- **Password:** `officer123`
- **Role:** Official
- **Department:** Public Works
- **Designation:** Engineer

## Citizen Test Accounts

### 1. Test Citizen
- **Email:** `citizen@test.com`
- **Password:** `citizen123`
- **Role:** Citizen
- **Phone:** +91-9876543210

### 2. Test User
- **Email:** `user@test.com`
- **Password:** `user123`
- **Role:** Citizen
- **Phone:** +91-9876543211

## How to Use

1. Navigate to the authentication page: `/authentication`
2. Select "Sign In" tab
3. Enter any of the test credentials above
4. Click "Sign In"
5. You will be automatically redirected to:
   - Officials Portal Dashboard (`/officials-portal/dashboard`) for official accounts
   - Citizen Portal Dashboard (`/citizen-portal/dashboard`) for citizen accounts

## Notes

- These are test credentials only for development/testing purposes
- All test accounts have the role automatically set based on the email
- The system will bypass Supabase authentication for these test accounts
- Real accounts will still use the normal Supabase authentication flow
