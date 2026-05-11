// lib/db-mock.ts - For testing without database
export const mockUsers = [
  {
    id: 1,
    name: "Test User",
    email: "test@example.com",
    is_approved: true,
    isAdmin: false,
    membership_number: "TLA24001"
  }
];

export const mockPayments = [
  {
    id: 1,
    user_id: 1,
    amount: 50000,
    payment_method: "Mobile Money",
    status: "completed",
    created_at: new Date().toISOString()
  }
];

export const mockQuery = async (sql: string, params: any[] = []) => {
  console.log('Mock query:', sql, params);
  
  if (sql.includes('SELECT') && sql.includes('users')) {
    return mockUsers;
  }
  if (sql.includes('SELECT') && sql.includes('payments')) {
    return mockPayments;
  }
  
  return [];
};

export const mockConnection = {
  query: mockQuery,
  release: () => {},
  beginTransaction: async () => {},
  commit: async () => {},
  rollback: async () => {}
};

export const mockPool = {
  getConnection: () => mockConnection
};
