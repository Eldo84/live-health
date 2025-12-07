# User Role System Explanation

## 🔐 How Roles Work

### Database Structure

The `user_roles` table stores one role per user:

```sql
user_roles (
  user_id uuid UNIQUE,  -- Each user can only have ONE role record
  role text,            -- 'user', 'admin', or 'moderator'
  permissions jsonb     -- Additional permissions (future use)
)
```

**Key Point:** `user_id` is UNIQUE, so each user can only have ONE role at a time.

---

## 👤 Role Types

### 1. **User** (Default)
- **Default role** for all new users
- Can submit advertising forms
- Can view/manage their own ads
- Can access `/dashboard/advertising`
- **Cannot** access admin panel

### 2. **Admin**
- Can do everything a user can do
- **Plus:**
  - Access `/admin/advertising`
  - View all submissions (not just their own)
  - Approve/reject submissions
  - Manage all ads
  - View all analytics
  - Manage user roles (make others admin)

### 3. **Moderator** (Future Use)
- Currently same as user
- Could be used for limited admin powers (e.g., can approve but not manage roles)

---

## ❓ Can a User Be Both Admin AND User?

**No, but they don't need to be!**

- **Admin role includes all user permissions**
- An admin can:
  - ✅ Submit ads (like a user)
  - ✅ View their own ads (like a user)
  - ✅ Plus do admin tasks

So an admin is essentially a "super user" - they have all user capabilities plus admin capabilities.

---

## 🚀 How to Make Someone an Admin

### Method 1: SQL (First Admin - Manual)

Since RLS policies require an admin to create admins, the **first admin** must be created manually:

```sql
-- Get your user ID first
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Insert admin role (replace YOUR_USER_ID with actual UUID)
INSERT INTO user_roles (user_id, role) 
VALUES ('YOUR_USER_ID', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

**Or via Supabase Dashboard:**
1. Go to **Table Editor** → `user_roles`
2. Click **Insert** → **Insert row**
3. Fill in:
   - `user_id`: Your user UUID (from Authentication → Users)
   - `role`: `admin`
4. Save

### Method 2: Via Admin Panel (After First Admin Exists)

Once you have one admin, they can make others admin through the UI (we should add this feature).

---

## 🔄 Changing Roles

### Make User → Admin

```sql
-- If user_roles record doesn't exist
INSERT INTO user_roles (user_id, role) 
VALUES ('USER_ID', 'admin');

-- If user_roles record exists
UPDATE user_roles 
SET role = 'admin' 
WHERE user_id = 'USER_ID';
```

### Make Admin → User

```sql
UPDATE user_roles 
SET role = 'user' 
WHERE user_id = 'USER_ID';
```

### Remove Role (User becomes default 'user')

```sql
DELETE FROM user_roles 
WHERE user_id = 'USER_ID';
```

**Note:** If no record exists, the system treats them as 'user' by default.

---

## 🔍 How the System Checks Roles

### In Code (AdminAdvertisingPanel.tsx):

```typescript
const checkAdminRole = async () => {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user?.id)
    .single();

  if (data?.role !== 'admin') {
    // Not admin - deny access
    return;
  }
  // Is admin - allow access
};
```

### In Database (RLS Policies):

```sql
-- Admins can view all submissions
CREATE POLICY "Admins can view all submissions"
  ON advertising_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

---

## 🎯 Role Hierarchy

```
Admin
  ├─ Can do everything User can do
  ├─ Can approve/reject submissions
  ├─ Can manage all ads
  ├─ Can view all analytics
  └─ Can manage user roles

User (Default)
  ├─ Can submit ads
  ├─ Can view own ads
  ├─ Can view own analytics
  └─ Can manage own subscription

Moderator (Future)
  ├─ Can approve/reject (limited)
  └─ Cannot manage roles
```

---

## 💡 Best Practices

### 1. First Admin Setup
- Create first admin manually via SQL (bypasses RLS)
- Use service role key if needed

### 2. Admin Management
- Keep admin count low (security)
- Only trusted team members
- Consider adding audit log for role changes

### 3. Role Assignment
- Users are 'user' by default (no record needed)
- Only create `user_roles` record when assigning admin/moderator
- Admins can manage roles via UI (we should add this)

---

## 🛠️ Future Enhancement: Admin Role Management UI

We could add to the Admin Panel:

```typescript
// In AdminAdvertisingPanel.tsx
- New tab: "User Management"
- List all users with their roles
- Button to "Make Admin" / "Remove Admin"
- Search/filter users
```

Would you like me to add this feature?

---

## 📋 Quick Reference

| Action | SQL Command |
|--------|-------------|
| Make user admin | `INSERT INTO user_roles (user_id, role) VALUES ('UUID', 'admin')` |
| Remove admin | `UPDATE user_roles SET role = 'user' WHERE user_id = 'UUID'` |
| Check if admin | `SELECT role FROM user_roles WHERE user_id = 'UUID'` |
| List all admins | `SELECT * FROM user_roles WHERE role = 'admin'` |

---

## ✅ Summary

- **One role per user** (user_id is UNIQUE)
- **Admin includes all user permissions** (no need to be both)
- **First admin** must be created manually via SQL
- **Subsequent admins** can be created by existing admins (if we add UI)
- **Default role** is 'user' (no record needed)

