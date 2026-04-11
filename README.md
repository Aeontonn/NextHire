# LIA Tracker

A polished internship application tracker with user accounts and real-time sync across all your devices. Built with plain HTML/CSS/JS and powered by Supabase.

[aeontonn.github.io/NextHire/](https://aeontonn.github.io/NextHire/)

## Features

- **Accounts** — sign up / sign in with email and password
- **Synced data** — applications are stored in Supabase and sync across every device you log into
- **Track applications** — company, role, location, date applied, deadline, job link, notes
- **Status tracking** — Applied, Interview Scheduled, Interviewed, Offer Received, Rejected, Withdrawn
- **Stats dashboard** — total, applied, interviews, offers, rejected at a glance
- **Search, filter & sort** — find any application instantly
- **Polished UI** — dark purple theme, glassmorphism, smooth animations

## Getting started

### 1. Clone the repo

```bash
git clone https://github.com/Aeontonn/LIA_Tracker.git
cd LIA_Tracker
```

### 2. Open in browser

No build step needed — just open `index.html` in any modern browser.

### 3. Create an account

Click **Create Account**, enter your email and password, and you're in.

> **If signup seems stuck:** Your Supabase project may have email confirmation enabled (the default). To disable it:
> 1. Go to your [Supabase dashboard](https://supabase.com/dashboard)
> 2. Select your project → **Authentication → Providers → Email**
> 3. Toggle off **"Confirm email"**
> 4. Save — signup will now work instantly with no email needed

## Supabase setup (for forks / self-hosting)

If you fork this repo and want your own database:

1. Create a free account at [supabase.com](https://supabase.com) and create a new project
2. Run this SQL in the **SQL Editor**:

```sql
create table applications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  company text not null,
  role text not null,
  location text,
  date_applied date not null,
  deadline date,
  status text not null default 'Applied',
  link text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table applications enable row level security;

create policy "Users manage own applications"
  on applications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

3. Go to **Project Settings → API** and copy your **Project URL** and **anon public** key
4. Replace the values at the top of `app.js`:

```js
const SUPABASE_URL  = 'your-project-url';
const SUPABASE_ANON = 'your-anon-key';
```

## Deployment (GitHub Pages)

1. Push to GitHub
2. Go to **Settings → Pages**
3. Set source to `main` branch, `/ (root)`
4. Your tracker will be live at `https://YOUR_USERNAME.github.io/LIA_Tracker`

## Tech stack

- Plain HTML / CSS / JavaScript (ES modules, no build tools)
- [Supabase](https://supabase.com) — auth + PostgreSQL database
- [Inter](https://rsms.me/inter/) — font
