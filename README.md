# 💙 Oshanie & Ninura — Wedding RSVP

A beautiful, production-ready wedding RSVP website for **Oshanie Rammuthupura & Ninura Thondilage**, celebrating on **Saturday, 8 August 2026** at St. Joseph's Church, Malwatta, Negombo.

---

## ✨ Features

### Public RSVP Page (`/`)
- Full-screen hero with animated couple names in Great Vibes font
- Live countdown timer to the wedding day
- Event details section with embedded Google Maps
- Dress code callout styled in the wedding's light blue palette
- Elegant RSVP form with client-side validation
- Beautiful animated success confirmation on submission
- Scroll-triggered fade-in animations throughout
- Fully mobile-responsive

### Admin Panel (`/admin`)
- Password-protected login
- Dashboard with live stats: total RSVPs, attending/not attending, total guests
- Interactive donut chart & attendance bar
- Searchable/filterable RSVP table
- Delete individual RSVP entries with confirmation modal
- Export all RSVPs to CSV
- Fully responsive sidebar layout

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
cd "Oshie and Nunura"
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set your admin password (and optionally email config):

```env
ADMIN_PASSWORD=YourSecurePassword!
SESSION_SECRET=your_long_random_secret_string
```

### 3. Run the App

```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

The app will be running at:
- **RSVP Page:** http://localhost:3000
- **Admin Panel:** http://localhost:3000/admin

---

## 📧 Optional: Email Confirmations

To send automatic confirmation emails to guests after they RSVP, configure email settings in `.env`:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_specific_password
EMAIL_FROM=Oshanie & Ninura Wedding <your_email@gmail.com>
```

**For Gmail:** Use an [App Password](https://support.google.com/accounts/answer/185833) (not your regular password) if you have 2-Step Verification enabled.

If email is not configured, the app will still work perfectly — just without email confirmations.

---

## 🗂️ Project Structure

```
Oshie and Nunura/
├── public/              ← Public RSVP frontend
│   ├── index.html       ← Main RSVP page
│   ├── styles.css       ← Design system & page styles
│   └── app.js           ← Client JS (countdown, form, animations)
│
├── admin/               ← Admin panel frontend
│   ├── index.html       ← Admin dashboard HTML
│   ├── admin.css        ← Admin styles
│   └── admin.js         ← Admin client JS
│
├── server/              ← Backend
│   └── index.js         ← Express server + SQLite API
│
├── db/                  ← Database directory (auto-created)
│   └── rsvp.db          ← SQLite database (auto-created on first run)
│
├── .env                 ← Your environment config (not committed)
├── .env.example         ← Environment template
├── package.json
└── README.md
```

---

## 🔐 Admin Login

Default password (change in `.env`!):
```
OshieNinura2026!
```

**URL:** http://localhost:3000/admin

---

## 🌐 Deploying to Railway / Render / Fly.io

1. Push the project to a GitHub repository
2. Connect to [Railway](https://railway.app) or [Render](https://render.com)
3. Set environment variables in the platform dashboard
4. For persistent SQLite, configure a volume mount at `/app/db`

---

## 🎨 Design System

| Token | Hex | Usage |
|---|---|---|
| Cool Cerulean | `#8EB1D1` | Buttons, borders, accents |
| Baby Blue Eyes | `#A7C7E7` | Hero backgrounds, highlights |
| Midnight Blue | `#1C2B48` | Headings, footer, dark text |
| Platinum | `#E8ECEF` | Page background, cards |
| Light Blue Grey | `#C4D8E5` | Section backgrounds, inputs |

**Fonts:** Cormorant Garamond (headings) · Lato (body) · Great Vibes (cursive accents)

---

Made with 💙 for Oshanie & Ninura · 8 August 2026
