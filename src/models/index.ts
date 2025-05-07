// Mock data models as provided in the requirements

export interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  }
  
  export interface Product {
    id: string;
    title: string;
    resalePrice: number;
    inspectorId: string;
    privateFileNameOnS3: string;
  }
  
  export interface Order {
    id: string;
    productId: string;
    purchaserId: string;
    purchaseDate: Date;
  }
  
  // Additional model for download tokens
  export interface DownloadToken {
    id: string;
    orderId: string;
    userId: string;
    productId: string;
    createdAt: Date;
    expiresAt: Date;
    isUsed: boolean;
    usedAt?: Date;
    ipAddress?: string;
  }
  
  // Mock database
  export class MockDatabase {
    private users: Map<string, User> = new Map();
    private products: Map<string, Product> = new Map();
    private orders: Map<string, Order> = new Map();
    private downloadTokens: Map<string, DownloadToken> = new Map();
  
    // User operations
    public async findUserById(id: string): Promise<User | null> {
      return this.users.get(id) || null;
    }
  
    // Product operations
    public async findProductById(id: string): Promise<Product | null> {
      return this.products.get(id) || null;
    }
  
    // Order operations
    public async findOrderById(id: string): Promise<Order | null> {
      return this.orders.get(id) || null;
    }
  
    public async findOrderByUserAndProduct(userId: string, productId: string): Promise<Order | null> {
      for (const order of this.orders.values()) {
        if (order.purchaserId === userId && order.productId === productId) {
          return order;
        }
      }
      return null;
    }
  
    // Download token operations
    public async createDownloadToken(tokenData: Omit<DownloadToken, 'id'>): Promise<DownloadToken> {
      const id = `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const token: DownloadToken = { id, ...tokenData };
      this.downloadTokens.set(id, token);
      return token;
    }
  
    public async findDownloadToken(id: string): Promise<DownloadToken | null> {
      return this.downloadTokens.get(id) || null;
    }
  
    public async markTokenAsUsed(id: string, ipAddress?: string): Promise<DownloadToken | null> {
      const token = this.downloadTokens.get(id);
      if (!token) return null;
  
      const updatedToken: DownloadToken = {
        ...token,
        isUsed: true,
        usedAt: new Date(),
        ipAddress
      };
  
      this.downloadTokens.set(id, updatedToken);
      return updatedToken;
    }
  
    // Initialize with some mock data for testing
    public initMockData(): void {
      // Users
      this.users.set('user1', {
        id: 'user1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phoneNumber: '+61412345678'
      });
  
      // Products
      this.products.set('prod1', {
        id: 'prod1',
        title: '123 Main St, Sydney - Property Inspection Report',
        resalePrice: 49.99,
        inspectorId: 'insp1',
        privateFileNameOnS3: 'reports/123-main-st-sydney-20250507.pdf'
      });
  
      // Orders
      this.orders.set('order1', {
        id: 'order1',
        productId: 'prod1',
        purchaserId: 'user1',
        purchaseDate: new Date()
      });
    }
  }
  
  // Singleton instance
  export const db = new MockDatabase();
  db.initMockData();