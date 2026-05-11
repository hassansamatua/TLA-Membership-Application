# Aiven Database Migration Guide

## Overview
This guide helps you migrate your TLA (Tanzania Library Association) database from XAMPP localhost to Aiven cloud MySQL.

## Prerequisites
- Aiven account with MySQL service created
- Database connection credentials from Aiven
- MySQL client tool (MySQL Workbench, phpMyAdmin, or command line)

## Step 1: Get Aiven Database Credentials

From your Aiven console, get:
- **Host**: Your Aiven MySQL endpoint (e.g., `your-project.aivencloud.com`)
- **Port**: Usually `25060` for Aiven MySQL
- **Database**: Create database name `next_auth`
- **Username**: Usually `avnadmin`
- **Password**: Your generated password
- **SSL Certificates**: Download CA certificate (and optionally client cert/key)

## Step 2: Prepare Environment Variables

1. Copy `.env.aiven` to `.env.local`:
```bash
cp .env.aiven .env.local
```

2. Update `.env.local` with your actual Aiven credentials:
```env
# Aiven MySQL Database Configuration
MYSQL_HOST=your-actual-host.aivencloud.com
MYSQL_PORT=25060
MYSQL_USER=avnadmin
MYSQL_PASSWORD=your-actual-password
MYSQL_DATABASE=next_auth

# SSL Configuration (if required)
MYSQL_SSL_CA=/path/to/ca.pem
MYSQL_SSL_CERT=/path/to/cert.pem
MYSQL_SSL_KEY=/path/to/key.pem
```

## Step 3: Import Database to Aiven

### Option A: Using MySQL Workbench
1. Connect to your Aiven MySQL instance using the credentials
2. Run the SQL import: `File > Run SQL Script`
3. Select your `aiven_ready.sql` file
4. Execute the import

### Option B: Using Command Line
```bash
mysql -h your-host.aivencloud.com -P 25060 -u avnadmin -p next_auth < aiven_ready.sql
```

### Option C: Using phpMyAdmin (if available)
1. Access your Aiven phpMyAdmin interface
2. Select the `next_auth` database
3. Use the "Import" tab to upload `aiven_ready.sql`

## Step 4: Update Application Configuration

Your database configuration is already updated in `lib/db.ts` to support:
- Custom port configuration
- SSL certificate support
- Aiven connection pooling

## Step 5: Test the Connection

Start your application and verify:
```bash
npm run dev
```

Check the console for successful database connection.

## Step 6: Verify Data Migration

1. Test user login with existing credentials
2. Check if all data is present:
   - Users and profiles
   - Memberships and payments
   - Events and registrations
   - Content management data

## Troubleshooting

### SSL Connection Issues
If you get SSL errors:
1. Ensure SSL certificates are in the correct path
2. Update file paths in `.env.local`
3. Test without SSL first (remove SSL env vars)

### Connection Timeout
1. Check Aiven firewall settings
2. Verify host and port are correct
3. Ensure your IP is whitelisted in Aiven

### Import Errors
1. Split large SQL file into smaller chunks
2. Check MySQL version compatibility
3. Ensure character set is utf8mb4

## Production Considerations

1. **Security**: Never commit `.env.local` to version control
2. **Backups**: Enable Aiven automated backups
3. **Monitoring**: Set up Aiven monitoring alerts
4. **Performance**: Monitor connection pool usage

## Rollback Plan

If migration fails:
1. Restore original `.env.local` (localhost configuration)
2. Your local XAMPP database remains unchanged
3. Application will work with localhost immediately

## Files Created/Modified

- ✅ `aiven_ready.sql` - Clean SQL file for import
- ✅ `.env.aiven` - Aiven environment template
- ✅ `lib/db.ts` - Updated for Aiven compatibility
- ✅ Original database preserved in `lib/next_auth(4).sql`

## Next Steps

After successful migration:
1. Update any hardcoded localhost URLs in the database
2. Test all application features
3. Update DNS to point to your deployed application
4. Set up monitoring and alerts

## Support

- Aiven Documentation: https://aiven.io/docs/
- MySQL Connection Issues: Check Aiven service status
- Application Issues: Review application logs
