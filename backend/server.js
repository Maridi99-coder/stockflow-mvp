require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const authenticate = require('./middleware/auth');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// --- AUTH ROUTES (FR-1, FR-2) ---
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, organizationName } = req.body;
    if (!email || !password || !organizationName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: organizationName.trim() },
      });
      const user = await tx.user.create({
        data: {
          email: email.trim().toLowerCase(),
          passwordHash,
          organizationId: org.id,
        },
      });
      return { org, user };
    });

    const token = jwt.sign(
      { userId: result.user.id, organizationId: result.org.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: result.user.id, email: result.user.email },
      organization: result.org,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Signup failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email: email?.trim().toLowerCase() },
      include: { organization: true },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.id, organizationId: user.organizationId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email },
      organization: user.organization,
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// --- DASHBOARD ROUTE (FR-6) ---
app.get('/api/dashboard', authenticate, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    const products = await prisma.product.findMany({
      where: { organizationId: orgId },
      orderBy: { updatedAt: 'desc' },
    });

    const totalProducts = products.length;
    const totalQuantity = products.reduce((sum, p) => sum + p.quantityOnHand, 0);

    const lowStockItems = products
      .map((p) => ({
        ...p,
        effectiveThreshold: p.lowStockThreshold ?? org.defaultLowStockThresh,
      }))
      .filter((p) => p.quantityOnHand <= p.effectiveThreshold);

    res.json({
      totalProducts,
      totalQuantity,
      lowStockItems,
      defaultLowStockThresh: org.defaultLowStockThresh,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// --- PRODUCT ROUTES (FR-3, FR-4, FR-5) ---
app.get('/api/products', authenticate, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    const products = await prisma.product.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = products.map((p) => ({
      ...p,
      effectiveThreshold: p.lowStockThreshold ?? org.defaultLowStockThresh,
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.post('/api/products', authenticate, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const {
      name,
      sku,
      description,
      quantityOnHand,
      costPrice,
      sellingPrice,
      lowStockThreshold,
    } = req.body;

    if (!name || !sku) {
      return res.status(400).json({ error: 'Name and SKU are required' });
    }

    const product = await prisma.product.create({
      data: {
        organizationId: orgId,
        name: name.trim(),
        sku: sku.trim(),
        description: description?.trim() || null,
        quantityOnHand: Math.max(0, Number(quantityOnHand) || 0),
        costPrice: costPrice !== '' && costPrice != null ? Number(costPrice) : null,
        sellingPrice: sellingPrice !== '' && sellingPrice != null ? Number(sellingPrice) : null,
        lowStockThreshold:
          lowStockThreshold !== '' && lowStockThreshold != null
            ? Number(lowStockThreshold)
            : null,
      },
    });

    res.status(201).json(product);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'SKU already exists in your organization' });
    }
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.put('/api/products/:id', authenticate, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const { id } = req.params;
    const {
      name,
      sku,
      description,
      quantityOnHand,
      costPrice,
      sellingPrice,
      lowStockThreshold,
    } = req.body;

    const existing = await prisma.product.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: name.trim(),
        sku: sku.trim(),
        description: description?.trim() || null,
        quantityOnHand: Math.max(0, Number(quantityOnHand)),
        costPrice: costPrice !== '' && costPrice != null ? Number(costPrice) : null,
        sellingPrice: sellingPrice !== '' && sellingPrice != null ? Number(sellingPrice) : null,
        lowStockThreshold:
          lowStockThreshold !== '' && lowStockThreshold != null
            ? Number(lowStockThreshold)
            : null,
      },
    });

    res.json(updated);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'SKU already exists in your organization' });
    }
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.patch('/api/products/:id/adjust', authenticate, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const { id } = req.params;
    const { delta } = req.body;

    const existing = await prisma.product.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const newQty = Math.max(0, existing.quantityOnHand + Number(delta));
    const updated = await prisma.product.update({
      where: { id },
      data: { quantityOnHand: newQty },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to adjust stock' });
  }
});

app.delete('/api/products/:id', authenticate, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const { id } = req.params;

    const existing = await prisma.product.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    await prisma.product.delete({ where: { id } });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// --- SETTINGS ROUTES (FR-7) ---
app.get('/api/settings', authenticate, async (req, res) => {
  const org = await prisma.organization.findUnique({
    where: { id: req.user.organizationId },
  });
  res.json(org);
});

app.put('/api/settings', authenticate, async (req, res) => {
  try {
    const { defaultLowStockThresh } = req.body;
    const updated = await prisma.organization.update({
      where: { id: req.user.organizationId },
      data: { defaultLowStockThresh: Math.max(0, Number(defaultLowStockThresh)) },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));