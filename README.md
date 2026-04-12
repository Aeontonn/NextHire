# NextHire

A job application tracker with user accounts and real-time sync across all your devices. Built with plain HTML/CSS/JS and powered by Supabase.

[aeontonn.github.io/NextHire/](https://aeontonn.github.io/NextHire/)

## Features

### Applications
- **Kanban board** — two-column layout separating Planning and Applications, each with a quick-add button and live count
- **Track everything** — company, role, location, date applied, deadline, job posting URL, notes, and image attachments
- **Multiple image attachments** — attach screenshots or images to any application; upload multiple via click or drag-and-drop
- **Status tracking** — Planning, Applied, Interview Scheduled, Interviewed, Offer Received, Rejected, Withdrawn
- **Detail view** — click any card to see all fields, attachments, and quick edit/delete actions
- **Search, filter & sort** — search by company, role, or location; filter by status; sort by date or company name

### Dashboard
- **Stats bar** — live counts for Total, Planning, Applied, Interviews, Offers, and Rejected

### Calendar
- **Monthly calendar** — shows application dates (blue) and deadlines (orange) as colour-coded dots
- **Day details** — click any date to see all events, with a quick-jump to each application's detail view

### To-Do
- **Daily and weekly task lists** — separate sections each with their own task counts
- **Task states** — Todo, Doing, and Done, with inline editing and delete

### General
- **Accounts** — sign up / sign in with email and password
- **Synced data** — everything is stored in Supabase and syncs across every device you log into
- **Polished UI** — dark theme with pastel accents, toast notifications, and smooth animations

## Getting started

### 1. Clone the repo

```bash
git clone https://github.com/Aeontonn/NextHire.git
cd NextHire
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
  date_applied date,
  deadline date,
  status text not null default 'Applied',
  link text,
  notes text,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table applications enable row level security;

create policy "Users manage own applications"
  on applications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table todos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  text text not null,
  state text not null default 'todo',
  period text not null default 'daily',
  created_at timestamptz default now()
);

alter table todos enable row level security;

create policy "Users manage own todos"
  on todos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

3. Create a **Storage bucket** named `application-images` (public bucket) and add these three RLS policies:

| Policy name | Operation | Expression |
|---|---|---|
| Upload own images | INSERT | `(storage.foldername(name))[1] = auth.uid()::text` |
| View own images | SELECT | `(storage.foldername(name))[1] = auth.uid()::text` |
| Delete own images | DELETE | `(storage.foldername(name))[1] = auth.uid()::text` |

4. Go to **Project Settings → API** and copy your **Project URL** and **anon public** key
5. Replace the values at the top of `app.js`:

```js
const SUPABASE_URL  = 'your-project-url';
const SUPABASE_ANON = 'your-anon-key';
```

## Deployment (GitHub Pages)

1. Push to GitHub
2. Go to **Settings → Pages**
3. Set source to `main` branch, `/ (root)`
4. Your tracker will be live at `https://YOUR_USERNAME.github.io/NextHire`

## Tech stack

- Plain HTML / CSS / JavaScript (ES modules, no build tools)
- [Supabase](https://supabase.com) — auth + PostgreSQL database + file storage
- [Inter](https://rsms.me/inter/) — font
