import bcrypt from 'bcrypt';
import { db } from '../../database/client';
import { users, NewUser, User } from '../../database/schema';
import { eq } from 'drizzle-orm';

const SALT_ROUNDS = 10;

export class AuthService {
  /**
   * Hash a password
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Verify a password against a hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Register a new user
   */
  async register(data: { email: string; name: string; password: string }): Promise<User> {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(data.password);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email: data.email,
        name: data.name,
        passwordHash,
        preferences: {
          brand_voice: 'professional',
          tone: 'informative',
          default_hashtags: [],
        },
      })
      .returning();

    return newUser;
  }

  /**
   * Login a user
   */
  async login(email: string, password: string): Promise<User> {
    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.passwordHash) {
      throw new Error('Password not set for this user');
    }

    // Verify password
    const isValid = await this.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    return user;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user || null;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return user || null;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(userId: string, preferences: Partial<User['preferences']>): Promise<User> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        preferences: {
          ...user.preferences,
          ...preferences,
        },
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }
}
