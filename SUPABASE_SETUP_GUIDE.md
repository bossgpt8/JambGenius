# Supabase Setup Guide for JambGenius

## Step 1: Create Supabase Account & Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up for a free account
3. Create a new project
4. Choose a project name (e.g., "jambgenius")
5. Set a strong database password (save this!)
6. Choose a region (closest to Nigeria for best performance)

## Step 2: Create Questions Table

After your project is created:

1. Go to **Table Editor** in the left sidebar
2. Click **New Table**
3. Configure the table:
   - **Name**: `questions`
   - Enable **Row Level Security (RLS)** for now (we'll configure it later)

4. Add these columns:

| Column Name | Type | Default | Extra Options |
|------------|------|---------|---------------|
| id | int8 | Auto-increment | Primary Key, Auto Increment |
| subject | text | - | Not Null |
| question | text | - | Not Null |
| option_a | text | - | Not Null |
| option_b | text | - | Not Null |
| option_c | text | - | Not Null |
| option_d | text | - | Not Null |
| correct_answer | text | - | Not Null (A, B, C, or D) |
| explanation | text | - | Nullable |
| difficulty | text | easy | Nullable (easy, medium, hard) |
| created_at | timestamptz | now() | Default: now() |

## Step 3: Configure Row Level Security (RLS)

Since questions should be readable by everyone but only you can add/edit them:

1. Go to **Authentication** > **Policies** > **questions** table
2. Add a new policy:
   - **Policy name**: "Enable read access for all users"
   - **Policy command**: SELECT
   - **Target roles**: anon, authenticated
   - **Using expression**: `true` (allows everyone to read)

## Step 4: Get Your Supabase Credentials

1. Go to **Settings** > **API** in your Supabase project
2. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (the public API key)

## Step 5: Add Credentials to Vercel Environment Variables

**IMPORTANT:** Never put your Supabase credentials directly in your code!

Since you're deploying to Vercel, add these environment variables:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add two new environment variables:
   - **Name:** `SUPABASE_URL`  
     **Value:** Your Supabase project URL (from step 4)
   
   - **Name:** `SUPABASE_ANON_KEY`  
     **Value:** Your Supabase anon public key (from step 4)

4. Make sure they're available in **Production**, **Preview**, and **Development** environments
5. Click **Save**

Your credentials are now securely stored in Vercel and will be automatically loaded by the app!

## Step 6: Insert Sample Questions

Use the SQL Editor or Table Editor to insert the 3 sample questions I've created for you.

---

## Sample Questions to Insert

You can copy these SQL commands and run them in the **SQL Editor**:

```sql
-- English Question
INSERT INTO questions (subject, question, option_a, option_b, option_c, option_d, correct_answer, explanation, difficulty)
VALUES (
  'english',
  'Choose the option that best completes the sentence: The committee _____ its findings yesterday.',
  'submit',
  'submits',
  'submitted',
  'submitting',
  'C',
  'The sentence is in past tense (yesterday), and "committee" is a collective noun that takes a singular verb. "Submitted" is the correct past tense form.',
  'medium'
);

-- Mathematics Question
INSERT INTO questions (subject, question, option_a, option_b, option_c, option_d, correct_answer, explanation, difficulty)
VALUES (
  'mathematics',
  'If 3x - 7 = 14, what is the value of x?',
  '5',
  '7',
  '21',
  '9',
  'B',
  'Add 7 to both sides: 3x = 21. Divide both sides by 3: x = 7.',
  'easy'
);

-- Physics Question  
INSERT INTO questions (subject, question, option_a, option_b, option_c, option_d, correct_answer, explanation, difficulty)
VALUES (
  'physics',
  'A car accelerates uniformly from rest to a velocity of 20 m/s in 5 seconds. What is its acceleration?',
  '2 m/s²',
  '4 m/s²',
  '5 m/s²',
  '10 m/s²',
  'B',
  'Using the formula a = (v - u) / t, where v = 20 m/s, u = 0 m/s (from rest), and t = 5 s. Therefore, a = (20 - 0) / 5 = 4 m/s².',
  'medium'
);
```

## Or Insert via Table Editor

If you prefer the visual interface:

1. Go to **Table Editor** > **questions**
2. Click **Insert row**
3. Fill in the values from the samples above
4. Click **Save**

---

## Next Steps

After inserting questions:
1. Provide me with your Supabase URL and anon key
2. I'll update your `config.js` with these credentials
3. I'll reconnect the app to load questions from Supabase
4. Test that questions load correctly

## Tips for Adding More Questions

- Keep questions clear and concise
- Always provide explanations (helps students learn!)
- Use proper difficulty levels: easy, medium, hard
- Ensure correct_answer is exactly 'A', 'B', 'C', or 'D'
- Cover all JAMB subjects: English, Mathematics, Physics, Chemistry, Biology, Government, Economics, Commerce, Literature, Geography, CRS, Civic Education
