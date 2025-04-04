import { IUser, UserType } from '../interfaces';
import { v4 as uuidv4 } from 'uuid';

export class UserService {
  // In-memory storage
  private users: Map<string, IUser> = new Map();

  async createUser(name: string, type: UserType): Promise<IUser> {
    if (!name || !type) {
        throw new Error('User name and type are required.');
    }
    const newUser: IUser = {
      id: uuidv4(),
      name,
      type,
      balance: 0, // Initial balance
    };
    this.users.set(newUser.id, newUser);
    console.log(`[UserService] Created user: ${name} (${type}), ID: ${newUser.id}`);
    return newUser;
  }

  async getUser(id: string): Promise<IUser | null> {
    if (!id) return null;
    const user = this.users.get(id);
    return user ? { ...user } : null; // Return a copy to prevent direct mutation
  }

  async findUserByName(name: string): Promise<IUser | null> {
    for (const user of this.users.values()) {
        if (user.name === name) {
            return { ...user };
        }
    }
    return null;
  }

  async deposit(userId: string, amount: number): Promise<IUser> {
      if (amount <= 0) {
          throw new Error('Deposit amount must be positive.');
      }
      const user = this.users.get(userId);
      if (!user) {
          throw new Error(`User with ID ${userId} not found.`);
      }
      user.balance += amount;
      console.log(`[UserService] Deposited ${amount} to user ${userId}. New balance: ${user.balance}`);
      return { ...user };
  }

   async withdraw(userId: string, amount: number): Promise<IUser> {
      if (amount <= 0) {
          throw new Error('Withdrawal amount must be positive.');
      }
       const user = this.users.get(userId);
       if (!user) {
           throw new Error(`User with ID ${userId} not found.`);
       }
       if (user.balance < amount) {
            throw new Error(`Insufficient balance for user ${userId}. Available: ${user.balance}, Requested: ${amount}`);
       }
       user.balance -= amount;
       console.log(`[UserService] Withdrew ${amount} from user ${userId}. New balance: ${user.balance}`);
       return { ...user };
   }

   // Helper to get multiple users (used internally maybe)
   async getUsers(ids: string[]): Promise<Map<string, IUser>> {
       const foundUsers = new Map<string, IUser>();
       ids.forEach(id => {
           const user = this.users.get(id);
           if (user) {
               foundUsers.set(id, { ...user });
           }
       });
       return foundUsers;
   }
}