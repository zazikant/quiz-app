# Supabase Database Schema - Q&A Quiz System

Complete database schema for the Quiz Application with all tables, constraints, indexes, RLS policies, and business logic functions.

---

## Table of Contents
1. [Tables](#tables)
2. [Indexes](#indexes)
3. [Database Functions](#database-functions)
4. [Row Level Security (RLS) Policies](#row-level-security-rls-policies)
5. [Setup Instructions](#setup-instructions)

---

## Tables

### 1. `questions` Table
**Purpose:** Central repository for all questions in the Question Bank

```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  total_attempts INTEGER DEFAULT 0,
  correct_attempts INTEGER DEFAULT 0,
  difficulty_level TEXT DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'tough')),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE questions IS 'Stores all questions in the Question Bank';
COMMENT ON COLUMN questions.is_deleted IS 'Soft delete flag - true = deleted but preserved';
COMMENT ON COLUMN questions.total_attempts IS 'Total number of times this question was attempted';
COMMENT ON COLUMN questions.correct_attempts IS 'Number of times answered correctly';
COMMENT ON COLUMN questions.difficulty_level IS 'Auto-calculated: easy (>75%), medium (30-75%), tough (<30%)';
```

---

### 2. `answers` Table
**Purpose:** Store answer options for each question

```sql
CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE answers IS 'Answer options for questions (typically 4 options per question)';
COMMENT ON COLUMN answers.is_correct IS 'True if this is the correct answer';
```

---

### 3. `quizzes` Table
**Purpose:** Define quiz cards (like "Safety A", "Written Communication")

```sql
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_name TEXT NOT NULL,
  exam_name TEXT NOT NULL,
  status TEXT DEFAULT 'activated' CHECK (status IN ('activated', 'deactivated')),
  duration INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE quizzes IS 'Quiz cards that admins create and assign to users';
COMMENT ON COLUMN quizzes.quiz_name IS 'Short identifier (e.g., "A", "B", "C")';
COMMENT ON COLUMN quizzes.exam_name IS 'Full name (e.g., "Safety A", "Written Communication")';
COMMENT ON COLUMN quizzes.duration IS 'Quiz duration in minutes';
```

---

### 4. `quiz_questions` Table (Junction)
**Purpose:** Many-to-many relationship between quizzes and questions

```sql
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  display_order INTEGER DEFAULT 0,

  CONSTRAINT unique_quiz_question UNIQUE(quiz_id, question_id)
);

COMMENT ON TABLE quiz_questions IS 'Junction table: which questions are in which quizzes';
COMMENT ON COLUMN quiz_questions.display_order IS 'Order of questions in admin view (not user view)';
COMMENT ON CONSTRAINT unique_quiz_question ON quiz_questions IS 'Prevent duplicate questions in same quiz';
```

---

### 5. `quiz_assignments` Table
**Purpose:** Track which quizzes are assigned to which users (by email)

```sql
CREATE TABLE quiz_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE NULL,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed')),
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  current_question_index INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_active_assignment UNIQUE(user_email, quiz_id, status)
);

COMMENT ON TABLE quiz_assignments IS 'Email-based quiz assignments - user may not exist yet';
COMMENT ON COLUMN quiz_assignments.user_email IS 'User email - assignment visible when they register';
COMMENT ON COLUMN quiz_assignments.status IS 'assigned � in_progress � completed';
COMMENT ON COLUMN quiz_assignments.current_question_index IS 'Current position in quiz (for resume)';
COMMENT ON COLUMN quiz_assignments.last_activity_at IS 'Last time user interacted with quiz';
COMMENT ON CONSTRAINT unique_active_assignment ON quiz_assignments IS 'Prevent duplicate active assignments';
```

---

### 6. `user_quiz_progress` Table
**Purpose:** Track progress for each question in an assignment (random sequence)

```sql
CREATE TABLE user_quiz_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES quiz_assignments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_id UUID NULL REFERENCES answers(id) ON DELETE SET NULL,
  is_answered BOOLEAN DEFAULT FALSE,
  answered_at TIMESTAMP WITH TIME ZONE NULL,
  question_order INTEGER NOT NULL,

  CONSTRAINT unique_assignment_question UNIQUE(assignment_id, question_id),
  CONSTRAINT unique_assignment_order UNIQUE(assignment_id, question_order)
);

COMMENT ON TABLE user_quiz_progress IS 'Per-question progress tracking with random sequence';
COMMENT ON COLUMN user_quiz_progress.question_order IS 'Random sequence position (0-indexed) for this user';
COMMENT ON COLUMN user_quiz_progress.is_answered IS 'True if user has selected an answer';
COMMENT ON CONSTRAINT unique_assignment_question ON user_quiz_progress IS 'One record per question per assignment';
COMMENT ON CONSTRAINT unique_assignment_order ON user_quiz_progress IS 'Each position in sequence is unique';
```

---

### 7. `user_attempts` Table
**Purpose:** Final record of all user attempts (for results/analytics)

```sql
CREATE TABLE user_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID NULL REFERENCES quizzes(id) ON DELETE SET NULL,
  assignment_id UUID NULL REFERENCES quiz_assignments(id) ON DELETE SET NULL,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_answer_id UUID NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  is_correct BOOLEAN NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE user_attempts IS 'Historical record of all attempts - NOT affected by admin deletions';
COMMENT ON COLUMN user_attempts.assignment_id IS 'Link to specific assignment attempt';
COMMENT ON COLUMN user_attempts.is_correct IS 'Whether the selected answer was correct';
```

---

## Indexes

### Performance Optimization Indexes

```sql
-- Question searches (Question Bank)
CREATE INDEX idx_questions_text ON questions USING gin(to_tsvector('english', question_text));
CREATE INDEX idx_questions_difficulty ON questions(difficulty_level);
CREATE INDEX idx_questions_deleted ON questions(is_deleted);
CREATE INDEX idx_questions_created ON questions(created_at DESC);

-- Quiz queries
CREATE INDEX idx_quiz_questions_quiz ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_questions_question ON quiz_questions(question_id);

-- Assignment lookups
CREATE INDEX idx_assignments_email ON quiz_assignments(user_email);
CREATE INDEX idx_assignments_status ON quiz_assignments(status);
CREATE INDEX idx_assignments_quiz ON quiz_assignments(quiz_id);
CREATE INDEX idx_assignments_composite ON quiz_assignments(user_email, status);

-- Progress tracking
CREATE INDEX idx_progress_assignment ON user_quiz_progress(assignment_id);
CREATE INDEX idx_progress_order ON user_quiz_progress(assignment_id, question_order);

-- User attempts
CREATE INDEX idx_attempts_user ON user_attempts(user_id);
CREATE INDEX idx_attempts_question ON user_attempts(question_id);
CREATE INDEX idx_attempts_quiz ON user_attempts(quiz_id);
CREATE INDEX idx_attempts_assignment ON user_attempts(assignment_id);
CREATE INDEX idx_attempts_date ON user_attempts(attempted_at DESC);

-- Answers lookup
CREATE INDEX idx_answers_question ON answers(question_id);
```

---

## Database Functions

### 1. Increment Question Statistics
**Purpose:** Update question attempt counters without decrementing

```sql
CREATE OR REPLACE FUNCTION increment_question_stats(
  q_id UUID,
  is_correct BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  UPDATE questions
  SET
    total_attempts = total_attempts + 1,
    correct_attempts = correct_attempts + CASE WHEN is_correct THEN 1 ELSE 0 END,
    updated_at = NOW()
  WHERE id = q_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_question_stats IS 'Increment question statistics - NEVER decrement (even on delete)';
```

---

### 2. Calculate Question Difficulty
**Purpose:** Auto-calculate difficulty based on success rate

```sql
CREATE OR REPLACE FUNCTION calculate_difficulty(
  q_id UUID
)
RETURNS TEXT AS $$
DECLARE
  total INT;
  correct INT;
  success_rate NUMERIC;
BEGIN
  SELECT total_attempts, correct_attempts
  INTO total, correct
  FROM questions
  WHERE id = q_id;

  IF total = 0 THEN
    RETURN 'medium';
  END IF;

  success_rate := (correct::NUMERIC / total::NUMERIC) * 100;

  IF success_rate > 75 THEN
    RETURN 'easy';
  ELSIF success_rate < 30 THEN
    RETURN 'tough';
  ELSE
    RETURN 'medium';
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_difficulty IS 'Calculate difficulty: easy (>75%), medium (30-75%), tough (<30%)';
```

---

### 3. Update Question Difficulty (Trigger Helper)
**Purpose:** Automatically update difficulty after stats change

```sql
CREATE OR REPLACE FUNCTION update_question_difficulty()
RETURNS TRIGGER AS $$
BEGIN
  NEW.difficulty_level := calculate_difficulty(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_difficulty
  BEFORE UPDATE OF total_attempts, correct_attempts ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_question_difficulty();

COMMENT ON TRIGGER trigger_update_difficulty ON questions IS 'Auto-update difficulty when attempt counts change';
```

---

### 4. Get User Assignment Progress
**Purpose:** Get detailed progress for an assignment

```sql
CREATE OR REPLACE FUNCTION get_assignment_progress(
  p_assignment_id UUID
)
RETURNS TABLE (
  total_questions INT,
  answered_questions INT,
  current_index INT,
  progress_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INT as total_questions,
    COUNT(CASE WHEN is_answered THEN 1 END)::INT as answered_questions,
    (SELECT current_question_index FROM quiz_assignments WHERE id = p_assignment_id)::INT as current_index,
    ROUND((COUNT(CASE WHEN is_answered THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2) as progress_percentage
  FROM user_quiz_progress
  WHERE assignment_id = p_assignment_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_assignment_progress IS 'Get detailed progress statistics for an assignment';
```

---

## Row Level Security (RLS) Policies

### Enable RLS on All Tables

```sql
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quiz_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_attempts ENABLE ROW LEVEL SECURITY;
```

---

### Questions Table Policies

```sql
-- Users can only read non-deleted questions
CREATE POLICY "users_read_active_questions" ON questions
  FOR SELECT
  USING (is_deleted = false);

-- Admins can read all questions (including deleted)
CREATE POLICY "admins_read_all_questions" ON questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Only admins can insert/update/delete questions
CREATE POLICY "admins_manage_questions" ON questions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );
```

---

### Answers Table Policies

```sql
-- Users can read answers for non-deleted questions
CREATE POLICY "users_read_answers" ON answers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM questions
      WHERE questions.id = answers.question_id
      AND questions.is_deleted = false
    )
  );

-- Admins can manage all answers
CREATE POLICY "admins_manage_answers" ON answers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );
```

---

### Quizzes Table Policies

```sql
-- Users can read activated quizzes
CREATE POLICY "users_read_active_quizzes" ON quizzes
  FOR SELECT
  USING (status = 'activated');

-- Admins can manage all quizzes
CREATE POLICY "admins_manage_quizzes" ON quizzes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );
```

---

### Quiz Assignments Policies

```sql
-- Users can read their own assignments (by email)
CREATE POLICY "users_read_own_assignments" ON quiz_assignments
  FOR SELECT
  USING (
    user_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Users can update their own assignments (progress tracking)
CREATE POLICY "users_update_own_assignments" ON quiz_assignments
  FOR UPDATE
  USING (
    user_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Admins can manage all assignments
CREATE POLICY "admins_manage_assignments" ON quiz_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );
```

---

### User Quiz Progress Policies

```sql
-- Users can read/update their own progress
CREATE POLICY "users_manage_own_progress" ON user_quiz_progress
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM quiz_assignments
      WHERE quiz_assignments.id = user_quiz_progress.assignment_id
      AND quiz_assignments.user_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

-- Admins can read all progress
CREATE POLICY "admins_read_all_progress" ON user_quiz_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );
```

---

### User Attempts Policies

```sql
-- Users can read their own attempts
CREATE POLICY "users_read_own_attempts" ON user_attempts
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own attempts
CREATE POLICY "users_insert_own_attempts" ON user_attempts
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins can manage all attempts
CREATE POLICY "admins_manage_attempts" ON user_attempts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );
```

---

## Setup Instructions

### Step 1: Enable Required Extensions

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

---

### Step 2: Create Tables (In Order)

Execute in this order to satisfy foreign key dependencies:

```sql
-- 1. Core tables (no dependencies)
CREATE TABLE questions (...);
CREATE TABLE quizzes (...);

-- 2. Dependent tables
CREATE TABLE answers (...);
CREATE TABLE quiz_questions (...);
CREATE TABLE quiz_assignments (...);

-- 3. Progress tracking
CREATE TABLE user_quiz_progress (...);
CREATE TABLE user_attempts (...);
```

---

### Step 3: Create Indexes

```sql
-- Run all CREATE INDEX statements
```

---

### Step 4: Create Functions

```sql
-- Run all CREATE FUNCTION statements
CREATE OR REPLACE FUNCTION increment_question_stats(...);
CREATE OR REPLACE FUNCTION calculate_difficulty(...);
CREATE OR REPLACE FUNCTION update_question_difficulty(...);
CREATE OR REPLACE FUNCTION get_assignment_progress(...);
```

---

### Step 5: Create Triggers

```sql
CREATE TRIGGER trigger_update_difficulty
  BEFORE UPDATE OF total_attempts, correct_attempts ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_question_difficulty();
```

---

### Step 6: Enable RLS

```sql
-- Enable RLS on all tables
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
-- ... (all tables)
```

---

### Step 7: Create RLS Policies

```sql
-- Create all policies for each table
CREATE POLICY "users_read_active_questions" ON questions ...;
-- ... (all policies)
```

---

## Business Logic Notes

### Critical Constraints

1. **Unique Assignment**: User cannot have duplicate active assignments for same quiz
2. **Soft Delete**: Questions with `is_deleted=true` preserved with stats
3. **Order Uniqueness**: Each question has unique position in user's random sequence
4. **Cascade Deletes**: Deleting quiz removes assignments, progress, and junction records

---

### Important Behaviors

1. **Question Statistics**:
   - NEVER decrement counters (even when admin deletes user attempts)
   - Use `increment_question_stats()` function, never manual UPDATE

2. **Assignment Status Flow**:
   - `assigned` � User hasn't started
   - `in_progress` � User started, can resume
   - `completed` � Quiz finished, hidden from user

3. **Random Sequencing**:
   - Generated at assignment creation time
   - Stored in `question_order` column
   - Consistent for entire attempt

4. **Network Resilience**:
   - Progress auto-saved after each answer
   - `current_question_index` tracks position
   - `last_activity_at` tracks user activity

---

## Testing Queries

### Check Question Difficulty Distribution

```sql
SELECT
  difficulty_level,
  COUNT(*) as count
FROM questions
WHERE is_deleted = false
GROUP BY difficulty_level;
```

---

### View User Progress

```sql
SELECT * FROM get_assignment_progress('assignment-uuid-here');
```

---

### Find Stuck Users

```sql
SELECT
  user_email,
  exam_name,
  status,
  current_question_index,
  last_activity_at
FROM quiz_assignments qa
JOIN quizzes q ON q.id = qa.quiz_id
WHERE status = 'in_progress'
AND last_activity_at < NOW() - INTERVAL '24 hours';
```

---

## Maintenance

### Cleanup Completed Assignments (Optional)

```sql
-- Archive old completed assignments (older than 1 year)
DELETE FROM quiz_assignments
WHERE status = 'completed'
AND completed_at < NOW() - INTERVAL '1 year';
```

---

### Recalculate All Difficulties

```sql
UPDATE questions
SET difficulty_level = calculate_difficulty(id)
WHERE is_deleted = false;
```

---

*Schema Version: 1.0*
*Last Updated: 2025-01-XX*