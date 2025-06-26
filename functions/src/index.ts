import * as functions from 'firebase-functions';
import * as express from 'express';
import * as cors from 'cors';
import { Pool } from 'pg';

const app = express();

// Enable CORS
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database setup
let pool: Pool;
let dbConnected = false;

const initializeDatabase = async () => {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not found');
    return;
  }

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  try {
    const client = await pool.connect();
    console.log('PostgreSQL connected');
    dbConnected = true;
    client.release();
    await setupTables();
  } catch (error) {
    console.error('Database connection failed:', error);
  }
};

const setupTables = async () => {
  if (!pool) return;
  
  try {
    console.log('Creating database tables...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        tenant_name VARCHAR(255),
        tenant_email VARCHAR(255),
        tenant_phone VARCHAR(20),
        rent_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        deposit_amount DECIMAL(10,2),
        lease_start_date DATE,
        lease_end_date DATE,
        has_vat BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS company_settings (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        registration_number VARCHAR(100),
        vat_number VARCHAR(100),
        address TEXT,
        contact_person VARCHAR(255),
        phone VARCHAR(20),
        email VARCHAR(255),
        vat_rate DECIMAL(5,2) DEFAULT 15.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
        invoice_number VARCHAR(100) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        invoice_date DATE NOT NULL,
        due_date DATE NOT NULL,
        rent_period_start DATE NOT NULL,
        rent_period_end DATE NOT NULL,
        cc_emails TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default data
    await pool.query(`
      INSERT INTO users (username, password) 
      VALUES ('admin', 'admin1234') 
      ON CONFLICT (username) DO NOTHING
    `);

    await pool.query(`
      INSERT INTO company_settings (
        company_name, registration_number, vat_number, address, 
        contact_person, phone, email, vat_rate
      ) VALUES (
        'Newald Fullard Trust', 'IT3469/1996', '4820187534',
        'P.O. Box 3016, Paarl 7646', 'Newald Fullard',
        '0711426452', 'fullardpropertymgmt@gmail.com', 15.00
      ) ON CONFLICT DO NOTHING
    `);

    console.log('All database tables created successfully!');
    
  } catch (error) {
    console.error('Table creation failed:', error);
  }
};

// Initialize database on startup
initializeDatabase();

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: dbConnected,
    timestamp: new Date().toISOString()
  });
});

// Auth endpoints
app.post('/login', async (req, res) => {
  if (!pool || !dbConnected) {
    return res.status(503).json({ error: 'Database not available' });
  }

  const { username, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT id, username FROM users WHERE username = $1 AND password = $2',
      [username, password]
    );

    if (result.rows.length > 0) {
      res.json({ success: true, user: result.rows[0] });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Properties endpoints
app.get('/properties', async (req, res) => {
  if (!pool || !dbConnected) {
    return res.status(503).json({ error: 'Database not available' });
  }
  
  try {
    const result = await pool.query('SELECT * FROM properties ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/properties', async (req, res) => {
  if (!pool || !dbConnected) {
    return res.status(503).json({ error: 'Database not available' });
  }
  
  const { name, address, tenant_name, tenant_email, tenant_phone, rent_amount, deposit_amount, lease_start_date, lease_end_date, has_vat } = req.body;
  
  try {
    const result = await pool.query(`
      INSERT INTO properties (name, address, tenant_name, tenant_email, tenant_phone, rent_amount, deposit_amount, lease_start_date, lease_end_date, has_vat)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [name, address, tenant_name, tenant_email, tenant_phone, rent_amount, deposit_amount, lease_start_date, lease_end_date, has_vat]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Company settings
app.get('/company-settings', async (req, res) => {
  if (!pool || !dbConnected) {
    return res.status(503).json({ error: 'Database not available' });
  }
  
  try {
    const result = await pool.query('SELECT * FROM company_settings LIMIT 1');
    res.json(result.rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Dashboard stats
app.get('/dashboard/stats', async (req, res) => {
  if (!pool || !dbConnected) {
    return res.status(503).json({ error: 'Database not available' });
  }
  
  try {
    const totalProperties = await pool.query('SELECT COUNT(*) FROM properties');
    const occupiedProperties = await pool.query('SELECT COUNT(*) FROM properties WHERE tenant_name IS NOT NULL');
    const totalRevenue = await pool.query('SELECT SUM(rent_amount) FROM properties WHERE tenant_name IS NOT NULL');
    
    res.json({
      totalProperties: parseInt(totalProperties.rows[0].count),
      occupiedProperties: parseInt(occupiedProperties.rows[0].count),
      totalInvoices: 0,
      totalRevenue: parseFloat(totalRevenue.rows[0].sum || 0)
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Notifications
app.get('/notifications', async (req, res) => {
  if (!pool || !dbConnected) {
    return res.status(503).json({ error: 'Database not available' });
  }
  
  try {
    const result = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Invoices
app.get('/invoices', async (req, res) => {
  if (!pool || !dbConnected) {
    return res.status(503).json({ error: 'Database not available' });
  }
  
  try {
    const result = await pool.query('SELECT * FROM invoices ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Export the API
export const api = functions.https.onRequest(app);