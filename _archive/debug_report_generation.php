<?php
// Debug script to check what might be causing report generation issues

echo "=== REPORT GENERATION DEBUG CHECKLIST ===\n\n";

echo "1. FRONTEND ISSUES TO CHECK:\n";
echo "   ✅ Is user logged in as admin?\n";
echo "   ✅ Is JWT token valid and not expired?\n";
echo "   ✅ Does user have isAdmin flag set to true?\n";
echo "   ✅ Are cookies being sent with the request?\n";
echo "   ✅ Is the request reaching the API endpoint?\n\n";

echo "2. BACKEND ISSUES TO CHECK:\n";
echo "   ✅ Does /api/admin/reports/generate endpoint exist?\n";
echo "   ✅ Are database tables accessible?\n";
echo "   ✅ Are SQL queries syntactically correct?\n";
echo "   ✅ Is error handling working properly?\n\n";

echo "3. COMMON CAUSES OF 'Failed to generate report':\n";
echo "   ❌ User not authenticated (401 error)\n";
echo "   ❌ User not admin (403 error)\n";
echo "   ❌ Invalid report type (400 error)\n";
echo "   ❌ Database connection issues (500 error)\n";
echo "   ❌ SQL query syntax errors (500 error)\n";
echo "   ❌ Missing or invalid request body (400 error)\n";
echo "   ❌ Date format issues (400 error)\n\n";

echo "4. DEBUGGING STEPS:\n";
echo "   1. Open browser Developer Tools (F12)\n";
echo "   2. Go to Network tab\n";
echo "   3. Try to generate a report\n";
echo "   4. Look for the /api/admin/reports/generate request\n";
echo "   5. Check the response status and body\n";
echo "   6. Look for specific error messages\n\n";

echo "5. QUICK FIXES TO TRY:\n";
echo "   - Log out and log back in as admin\n";
echo "   - Clear browser cookies and cache\n";
echo "   - Check that JWT token hasn't expired\n";
echo "   - Verify user account has admin privileges\n";
echo "   - Try different report types\n";
echo "   - Check date format (should be YYYY-MM-DD)\n\n";

echo "6. API ENDPOINTS TO VERIFY:\n";
echo "   ✅ GET /api/admin/reports (should work)\n";
echo "   ✅ POST /api/admin/reports/generate (should work)\n";
echo "   ✅ Authentication should be working\n\n";

echo "If the issue persists, check the browser console\n";
echo "for specific error messages and network responses.\n";
?>
