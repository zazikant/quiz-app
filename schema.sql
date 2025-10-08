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

-- answers Table
CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE answers IS 'Answer options for questions (typically 4 options per question)';
COMMENT ON COLUMN answers.is_correct IS 'True if this is the correct answer';

-- quizzes Table
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

-- quiz_questions Table (Junction)
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

-- quiz_assignments Table
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
COMMENT ON COLUMN quiz_assignments.status IS 'assigned  in_progress  completed';
COMMENT ON COLUMN quiz_assignments.current_question_index IS 'Current position in quiz (for resume)';
COMMENT ON COLUMN quiz_assignments.last_activity_at IS 'Last time user interacted with quiz';
COMMENT ON CONSTRAINT unique_active_assignment ON quiz_assignments IS 'Prevent duplicate active assignments';

-- user_quiz_progress Table
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

-- user_attempts Table
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

-- Indexes
CREATE INDEX idx_questions_text ON questions USING gin(to_tsvector('english', question_text));
CREATE INDEX idx_questions_difficulty ON questions(difficulty_level);
CREATE INDEX idx_questions_deleted ON questions(is_deleted);
CREATE INDEX idx_questions_created ON questions(created_at DESC);
CREATE INDEX idx_quiz_questions_quiz ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_questions_question ON quiz_questions(question_id);
CREATE INDEX idx_assignments_email ON quiz_assignments(user_email);
CREATE INDEX idx_assignments_status ON quiz_assignments(status);
CREATE INDEX idx_assignments_quiz ON quiz_assignments(quiz_id);
CREATE INDEX idx_assignments_composite ON quiz_assignments(user_email, status);
CREATE INDEX idx_progress_assignment ON user_quiz_progress(assignment_id);
CREATE INDEX idx_progress_order ON user_quiz_progress(assignment_id, question_order);
CREATE INDEX idx_attempts_user ON user_attempts(user_id);
CREATE INDEX idx_attempts_question ON user_attempts(question_id);
CREATE INDEX idx_attempts_quiz ON user_attempts(quiz_id);
CREATE INDEX idx_attempts_assignment ON user_attempts(assignment_id);
CREATE INDEX idx_attempts_date ON user_attempts(attempted_at DESC);
CREATE INDEX idx_answers_question ON answers(question_id);

-- Database Functions
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

CREATE OR REPLACE FUNCTION update_question_difficulty()
RETURNS TRIGGER AS $$
BEGIN
  NEW.difficulty_level := calculate_difficulty(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_difficulty
  BEFORE UPDATE OF total_attempts, correct_attempts ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_question_difficulty();

COMMENT ON TRIGGER trigger_update_difficulty ON questions IS 'Auto-update difficulty when attempt counts change';

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

-- RLS Policies
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quiz_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_active_questions" ON questions
  FOR SELECT
  USING (is_deleted = false);

CREATE POLICY "admins_read_all_questions" ON questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "admins_manage_questions" ON questions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "users_read_answers" ON answers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM questions
      WHERE questions.id = answers.question_id
      AND questions.is_deleted = false
    )
  );

CREATE POLICY "admins_manage_answers" ON answers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "users_read_active_quizzes" ON quizzes
  FOR SELECT
  USING (status = 'activated');

CREATE POLICY "admins_manage_quizzes" ON quizzes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "users_read_own_assignments" ON quiz_assignments
  FOR SELECT
  USING (
    user_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_update_own_assignments" ON quiz_assignments
  FOR UPDATE
  USING (
    user_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "admins_manage_assignments" ON quiz_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

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

CREATE POLICY "admins_read_all_progress" ON user_quiz_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "users_read_own_attempts" ON user_attempts
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "users_insert_own_attempts" ON user_attempts
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admins_manage_attempts" ON user_attempts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );
