// For simple queries
const users = await query('SELECT * FROM users WHERE id = ?', [userId]);

// For transactions
await executeInTransaction(async (connection) => {
  await connection.query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, fromId]);
  await connection.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, toId]);
});