# Quick Fix for Connection Pool Issues

## Immediate Solution

The connection pool exhaustion is likely caused by your database connection string. Here's how to fix it:

### Option 1: Check Your .env File

Open `Platform/Server/.env` and check your `DATABASE_URL`:

```bash
# If it's a cloud database (Supabase, Neon, etc.), it might be having issues
DATABASE_URL=postgresql://...

# Try commenting it out and using local connection instead:
# DATABASE_URL=postgresql://...

# Use local connection:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=igrs_db
DB_USER=postgres
DB_PASSWORD=your_password
```

### Option 2: Reduce Pool Size Temporarily

Edit `Platform/Server/src/config/database.js` and change:
```javascript
max: 50,  // Change to 5
min: 2,   // Change to 1
```

### Option 3: Restart PostgreSQL

If using local PostgreSQL:
```bash
# Windows
net stop postgresql-x64-14
net start postgresql-x64-14

# Or restart from Services app
```

### Option 4: Check PostgreSQL Max Connections

Connect to your database and run:
```sql
SHOW max_connections;
```

If it's less than 100, you need to increase it or reduce your pool size.

## Test the Fix

1. Stop the server (Ctrl+C)
2. Apply one of the fixes above
3. Restart the server: `npm run dev`
4. Check if it starts without errors

## If Still Failing

The issue might be that the database itself is down or unreachable. Check:

1. Can you connect to the database using pgAdmin or psql?
2. Is the database server running?
3. Are the credentials correct?
4. Is there a firewall blocking the connection?

## Emergency Workaround

If you need to get the server running immediately, you can temporarily disable database connection on startup:

In `Platform/Server/index.js`, comment out the health check query:
```javascript
app.get('/health', async (req, res) => {
  try {
    // await pool.query('SELECT 1');  // Comment this out
    res.json({ 
      status: 'ok', 
      // ... rest of response
    });
  } catch (error) {
    // ...
  }
});
```

This will let the server start, but database operations won't work until you fix the connection.
