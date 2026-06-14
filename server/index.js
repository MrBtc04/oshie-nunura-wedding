require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const { neon } = require('@neondatabase/serverless');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Database Setup (Neon Postgres) ───────────────────────────────────────────
const sql = neon(process.env.DATABASE_URL);

// Initialize schema on startup
async function initDb() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS rsvps (
        id          SERIAL PRIMARY KEY,
        name        TEXT    NOT NULL,
        email       TEXT    NOT NULL,
        phone       TEXT,
        guests      INTEGER NOT NULL DEFAULT 1,
        attending   INTEGER NOT NULL DEFAULT 1,
        dietary     TEXT,
        message     TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('💾 Database: Neon Postgres connected & ready');
  } catch (err) {
    console.error('Failed to initialize database:', err.message);
  }
}
initDb();

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'changeme_in_production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 4, // 4 hours
  },
}));

const rsvpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10,
  message: { error: 'Too many submissions. Please try again later.' } });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5,
  message: { error: 'Too many login attempts. Please try again later.' } });

// ─── Static Files ──────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// ─── Email Transporter ─────────────────────────────────────────────────────────
let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

async function sendConfirmationEmail(rsvp) {
  if (!transporter) return;
  const attendingText = rsvp.attending ? 'attending' : 'not able to attend';
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Oshanie & Ninura" <${process.env.EMAIL_USER}>`,
      to: rsvp.email,
      subject: '💙 RSVP Confirmed — Oshanie & Ninura, 8 August 2026',
      html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
        <body style="font-family:Georgia,serif;background:#E8ECEF;padding:32px;">
          <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:40px;box-shadow:0 4px 24px rgba(28,43,72,0.08);">
            <h1 style="font-family:Georgia,serif;color:#1C2B48;text-align:center;font-size:2rem;margin-bottom:8px;">Oshanie & Ninura</h1>
            <p style="text-align:center;color:#8EB1D1;letter-spacing:0.2em;font-size:0.85rem;margin-bottom:32px;">8 · 8 · 2026</p>
            <p style="color:#1C2B48;">Dear <strong>${rsvp.name}</strong>,</p>
            <p style="color:#1C2B48;line-height:1.7;">Thank you for your RSVP! We have recorded that you are <strong>${attendingText}</strong> our celebration.</p>
            ${rsvp.attending ? `
            <div style="background:#A7C7E7;border-radius:12px;padding:20px;margin:24px 0;">
              <p style="color:#1C2B48;margin:0;"><strong>📅</strong> Saturday, 8 August 2026</p>
              <p style="color:#1C2B48;margin:8px 0 0;"><strong>⏰</strong> Three o'clock in the evening (3:00 PM)</p>
              <p style="color:#1C2B48;margin:8px 0 0;"><strong>📍</strong> St. Joseph's Church, Malwatta, Negombo</p>
              <p style="color:#1C2B48;margin:8px 0 0;"><strong>👗</strong> Soft, light-colored pastel or neutral shades</p>
            </div>
            <p style="color:#1C2B48;line-height:1.7;">We are so excited to celebrate this special day with you!</p>
            ` : `<p style="color:#1C2B48;line-height:1.7;">We will miss you dearly. Thank you for letting us know!</p>`}
            <p style="color:#1C2B48;margin-top:32px;">With all our love,</p>
            <p style="color:#8EB1D1;font-size:1.4rem;font-style:italic;">Oshanie & Ninura 💙</p>
          </div>
        </body></html>`,
    });
  } catch (err) {
    console.error('[Email] Failed to send:', err.message);
  }
}

// ─── RSVP Routes ───────────────────────────────────────────────────────────────

app.post('/api/rsvp', rsvpLimiter, async (req, res) => {
  const { name, email, phone, guests, attending, dietary, message } = req.body;

  if (!name || !name.trim()) return res.status(400).json({ error: 'Full name is required.' });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'A valid email address is required.' });

  const guestsNum = parseInt(guests) || 1;
  if (guestsNum < 1 || guestsNum > 5)
    return res.status(400).json({ error: 'Guest count must be between 1 and 5.' });

  const attendingBool = attending === 'true' || attending === true || attending === 1;

  try {
    const existing = await sql`SELECT id FROM rsvps WHERE email = ${email.trim().toLowerCase()}`;
    if (existing.length > 0)
      return res.status(409).json({ error: 'An RSVP with this email already exists. Please contact us if you need to make changes.' });

    const result = await sql`
      INSERT INTO rsvps (name, email, phone, guests, attending, dietary, message)
      VALUES (
        ${name.trim()},
        ${email.trim().toLowerCase()},
        ${phone ? phone.trim() : null},
        ${guestsNum},
        ${attendingBool ? 1 : 0},
        ${dietary ? dietary.trim() : null},
        ${message ? message.trim() : null}
      )
      RETURNING id
    `;

    sendConfirmationEmail({ name: name.trim(), email: email.trim(), attending: attendingBool });

    res.status(201).json({
      success: true,
      message: "Thank you! We can't wait to celebrate with you 💙",
      id: result[0].id,
    });
  } catch (err) {
    console.error('[RSVP POST]', err.message);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ─── Admin Routes ──────────────────────────────────────────────────────────────

app.post('/api/admin/login', loginLimiter, (req, res) => {
  const { password } = req.body;
  if (password === (process.env.ADMIN_PASSWORD || 'OshieNinura2026!')) {
    req.session.isAdmin = true;
    return res.json({ success: true });
  }
  res.status(401).json({ error: 'Incorrect password.' });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

function requireAdmin(req, res, next) {
  if (req.session?.isAdmin) return next();
  res.status(401).json({ error: 'Unauthorized.' });
}

app.get('/api/admin/check', (req, res) => {
  res.json({ isAdmin: !!req.session?.isAdmin });
});

app.get('/api/admin/rsvps', requireAdmin, async (req, res) => {
  const { search } = req.query;
  try {
    let rows;
    if (search?.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      rows = await sql`
        SELECT * FROM rsvps
        WHERE LOWER(name) LIKE ${term} OR LOWER(email) LIKE ${term}
        ORDER BY created_at DESC
      `;
    } else {
      rows = await sql`SELECT * FROM rsvps ORDER BY created_at DESC`;
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load RSVPs.' });
  }
});

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const [total, attending, notAtt, guests] = await Promise.all([
      sql`SELECT COUNT(*) as c FROM rsvps`,
      sql`SELECT COUNT(*) as c FROM rsvps WHERE attending = 1`,
      sql`SELECT COUNT(*) as c FROM rsvps WHERE attending = 0`,
      sql`SELECT COALESCE(SUM(guests),0) as c FROM rsvps WHERE attending = 1`,
    ]);
    res.json({
      total: parseInt(total[0].c),
      attending: parseInt(attending[0].c),
      notAttending: parseInt(notAtt[0].c),
      totalGuests: parseInt(guests[0].c),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load stats.' });
  }
});

app.delete('/api/admin/rsvps/:id', requireAdmin, async (req, res) => {
  try {
    const result = await sql`DELETE FROM rsvps WHERE id = ${req.params.id} RETURNING id`;
    if (result.length === 0) return res.status(404).json({ error: 'Not found.' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete.' });
  }
});

app.get('/api/admin/export', requireAdmin, async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM rsvps ORDER BY created_at DESC`;
    const header = ['ID', 'Name', 'Email', 'Phone', 'Guests', 'Attending', 'Dietary', 'Message', 'Submitted At'];
    const lines = rows.map(r => [
      r.id,
      `"${(r.name || '').replace(/"/g, '""')}"`,
      `"${(r.email || '').replace(/"/g, '""')}"`,
      `"${(r.phone || '').replace(/"/g, '""')}"`,
      r.guests,
      r.attending ? 'Yes' : 'No',
      `"${(r.dietary || '').replace(/"/g, '""')}"`,
      `"${(r.message || '').replace(/"/g, '""')}"`,
      `"${r.created_at}"`,
    ].join(','));
    const csv = [header.join(','), ...lines].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="rsvps-oshie-ninura.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Export failed.' });
  }
});

// ─── Page Routes ───────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../admin/index.html')));
app.get('/admin/*', (req, res) => res.sendFile(path.join(__dirname, '../admin/index.html')));

// ─── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n💙 Oshanie & Ninura Wedding RSVP`);
  console.log(`   RSVP page:   http://localhost:${PORT}`);
  console.log(`   Admin panel: http://localhost:${PORT}/admin\n`);
});

module.exports = app;
