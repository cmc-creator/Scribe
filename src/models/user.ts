export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
  created_at: string;
}

export type CreateUserInput = Omit<User, 'id' | 'created_at'>;
