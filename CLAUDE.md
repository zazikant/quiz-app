# Q&A Quiz System - Next.js & Tailwind CSS

Refer Final Schema from /home/zazikant/SCHEMA.md
## System Overview

A quiz application where users attempt questions and admins manage the question bank. Built with **Next.js**, **Tailwind CSS**, and **Supabase**.

### 🔑 Key Features:
- **Quiz Cards**: Pre-configured exams with curated questions
- **Question Bank**: Centralized question management system
- **Email-Based Assignment**: Assign quizzes to users by email (user registration not required)
- **Network Resilient**: Auto-save progress, resume from last question after disconnect
- **One Question Per Page**: Clean pagination with Previous/Next navigation
- **Random Sequencing**: Different question order per user, prevents cheating
- **Smart Duplicate Detection**: Reactivates existing questions instead of creating duplicates
- **Soft Delete**: Preserve question history and statistics
- **Dynamic Difficulty**: Auto-calculated based on user performance (Easy/Medium/Tough)
- **Flexible Architecture**: Same question can appear in multiple quizzes

### ⚠️ Critical Design Rules:
1. **Exact duplicate** (same text + same options) → **Reactivates** old question with preserved stats
2. **Same text, different options** → Creates **new question** with new ID
3. **Order doesn't matter**: `["A","B","C","D"]` = `["D","C","B","A"]`
4. **Only Question Bank** can permanently delete questions
5. Quiz Cards can only **unlink** questions (remove from quiz, not from database)
6. **Email-based assignment**: Quizzes assigned by email, visible when user registers
7. **One-time completion**: Quiz vanishes after completion, admin can reassign
8. **Network resilience**: Progress auto-saved, can resume from last question
9. **Timer behavior**: Pauses on disconnect, resumes when user returns

---

## User Roles

### Admin
- Add questions with answers to Supabase
- Edit existing questions
- View question statistics
- Restore soft-deleted questions

### Regular Users
- Attempt quiz questions
- View their scores
- Track their progress

---

## Database Schema (Supabase)

### `questions` Table
```sql
id                UUID PRIMARY KEY DEFAULT uuid_generate_v4()
question_text     TEXT NOT NULL
created_at        TIMESTAMP DEFAULT NOW()
updated_at        TIMESTAMP DEFAULT NOW()
is_deleted        BOOLEAN DEFAULT FALSE
total_attempts    INTEGER DEFAULT 0
correct_attempts  INTEGER DEFAULT 0
difficulty_level  TEXT DEFAULT 'medium' -- 'easy', 'medium', 'tough'
admin_id          UUID REFERENCES auth.users(id)
```

### `answers` Table
```sql
id             UUID PRIMARY KEY DEFAULT uuid_generate_v4()
question_id    UUID REFERENCES questions(id)
answer_text    TEXT NOT NULL
is_correct     BOOLEAN NOT NULL
created_at     TIMESTAMP DEFAULT NOW()
```

### `quizzes` Table
```sql
id             UUID PRIMARY KEY DEFAULT uuid_generate_v4()
quiz_name      TEXT NOT NULL -- e.g., "A", "B", "C"
exam_name      TEXT NOT NULL -- e.g., "Written Communication", "Safety A"
status         TEXT DEFAULT 'activated' -- 'activated', 'deactivated'
duration       INTEGER NOT NULL -- Duration in minutes
created_at     TIMESTAMP DEFAULT NOW()
updated_at     TIMESTAMP DEFAULT NOW()
admin_id       UUID REFERENCES auth.users(id)
```

### `quiz_questions` Table (Junction Table)
```sql
id             UUID PRIMARY KEY DEFAULT uuid_generate_v4()
quiz_id        UUID REFERENCES quizzes(id) ON DELETE CASCADE
question_id    UUID REFERENCES questions(id) ON DELETE CASCADE
added_at       TIMESTAMP DEFAULT NOW()
display_order  INTEGER DEFAULT 0

UNIQUE(quiz_id, question_id) -- Prevent duplicate questions in same quiz
```

### `quiz_assignments` Table
```sql
id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4()
user_email            TEXT NOT NULL
quiz_id               UUID REFERENCES quizzes(id) ON DELETE CASCADE
assigned_at           TIMESTAMP DEFAULT NOW()
completed_at          TIMESTAMP NULL
status                TEXT DEFAULT 'assigned' -- 'assigned', 'in_progress', 'completed'
assigned_by           UUID REFERENCES auth.users(id)
current_question_index INTEGER DEFAULT 0
last_activity_at      TIMESTAMP DEFAULT NOW()

UNIQUE(user_email, quiz_id, status) -- Prevent duplicate active assignments
```

### `user_quiz_progress` Table
```sql
id                UUID PRIMARY KEY DEFAULT uuid_generate_v4()
assignment_id     UUID REFERENCES quiz_assignments(id) ON DELETE CASCADE
question_id       UUID REFERENCES questions(id)
answer_id         UUID NULL REFERENCES answers(id)
is_answered       BOOLEAN DEFAULT FALSE
answered_at       TIMESTAMP NULL
question_order    INTEGER NOT NULL -- Random sequence position (0-indexed)

UNIQUE(assignment_id, question_id)
```

### `user_attempts` Table
```sql
id             UUID PRIMARY KEY DEFAULT uuid_generate_v4()
user_id        UUID REFERENCES auth.users(id)
quiz_id        UUID REFERENCES quizzes(id) NULL
assignment_id  UUID REFERENCES quiz_assignments(id) NULL
question_id    UUID REFERENCES questions(id)
selected_answer_id  UUID REFERENCES answers(id)
is_correct     BOOLEAN NOT NULL
attempted_at   TIMESTAMP DEFAULT NOW()
```

---

## Core Features & Workflows

### 1. Quiz Cards System

**Overview:**
Quiz cards display collections of questions picked from the Question Bank. Each card represents an exam with:
- Quiz identifier (A, B, C, etc.)
- Exam name
- Number of questions
- Duration
- Status (Activated/Deactivated)

**Card Layout:**
```
┌─────────────────────────────────────────────┐
│  A                                    ● (Status Indicator)  │
│                                                              │
│  Status: Activated                                          │
│  Exam Name: Written Communication                           │
│  Number of Questions: 23                                    │
│  Duration: 15 minutes                                       │
│                                                              │
│  [Questions]  [Deactivate]                                  │
└─────────────────────────────────────────────┘
```

**Important Rules:**
- Questions in quiz cards are selected from Question Bank
- Users can **REMOVE** questions from quiz cards (unlink)
- Users **CANNOT DELETE** questions from quiz cards
- All deletion operations happen **ONLY in Question Bank**
- Same question can appear in multiple quizzes

**Flow: Adding Questions to Quiz**
```
Admin navigates to Quiz Card
    ↓
Clicks "Questions" button
    ↓
Opens Question Bank selector
    ↓
Select questions from Question Bank
    ↓
Questions added to quiz_questions junction table
    ↓
Question count updates on card
```

**Flow: Removing Questions from Quiz**
```
Admin views questions in quiz
    ↓
Clicks "Remove" on specific question
    ↓
Delete record from quiz_questions table
    ↓
Question remains in Question Bank (unaffected)
    ↓
Question count updates on card
```

---

### 2. Question Bank Page

**Purpose:**
Centralized management system for all questions. This is the **ONLY** place where questions can be permanently deleted.

**Features:**
- **View All Questions**: Paginated list with full details
- **Search**: By question text, ID, difficulty level
- **Filter**: By difficulty (Easy/Medium/Tough), date range, attempt count
- **Difficulty Display**: Color-coded badges
  - 🟢 Easy (>75% correct)
  - 🟡 Medium (30-75% correct)
  - 🔴 Tough (<30% correct)
- **Statistics**: Total attempts, correct attempts, success rate
- **Edit**: Modify question text and answers
- **Delete**: Permanently remove questions (hard delete after soft delete)
- **Restore**: Undelete soft-deleted questions

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  Question Bank                                      [+ Add Question] │
│                                                                       │
│  Search: [_______________]  Difficulty: [All ▾]  [Search Button]    │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ID: abc-123          🟢 Easy     Attempts: 150 | Correct: 120 │   │
│  │ What is 2+2?                                                  │   │
│  │ [Edit] [Delete] [View Details]                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ID: def-456          🔴 Tough    Attempts: 80 | Correct: 20   │   │
│  │ Explain quantum entanglement                                  │   │
│  │ [Edit] [Delete] [View Details]                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  [< Previous]  Page 1 of 10  [Next >]                               │
└─────────────────────────────────────────────────────────────────────┘
```

**Important Logic:**
- Soft delete preserves question with is_deleted = TRUE
- Hard delete permanently removes from database
- Editing questions triggers soft delete mechanism (if exact duplicate exists)
- Search is real-time with debouncing
- Filters can be combined

---

### 3. Admin Adds Question (to Question Bank)

**Flow:**
```
Admin submits question with 4 answer options
    ↓
Check if exact question exists (question text + all 4 options, order-agnostic)
    ↓
    ├─→ EXACT MATCH FOUND (same text + same options)
    │       ↓
    │   Is question deleted?
    │       ↓
    │       ├─→ YES (is_deleted = TRUE)
    │       │       ↓
    │       │   Reactivate question (set is_deleted = FALSE)
    │       │   Keep same ID and all stats preserved
    │       │   Show alert: "Question already exists and has been reactivated"
    │       │
    │       └─→ NO (is_deleted = FALSE)
    │               ↓
    │           Do nothing
    │           Show alert: "Question already exists in Question Bank"
    │
    ├─→ SAME QUESTION, DIFFERENT OPTIONS (any option changed)
    │       ↓
    │   Create NEW question with new ID
    │   Start with 0 attempts
    │   Old question unaffected
    │
    └─→ NEW QUESTION (doesn't exist)
            ↓
        Create question with new ID
```

**Implementation Notes:**
- **Order-agnostic matching**: `["A", "B", "C", "D"]` = `["D", "C", "B", "A"]`
- Sort answer options alphabetically before comparing
- If ANY option text is different → treat as new question
- Reactivation preserves all stats (attempts, difficulty, etc.)

---

### 4. User Attempts Question

**Flow:**
```
User selects answer
    ↓
Store attempt in user_attempts table
    ↓
Update question statistics:
    - Increment total_attempts
    - Increment correct_attempts (if correct)
    ↓
Recalculate difficulty_level
    ↓
Return result to user
```

**Difficulty Calculation Logic:**
```javascript
const calculateDifficulty = (correctAttempts, totalAttempts) => {
  if (totalAttempts === 0) return 'medium';

  const successRate = (correctAttempts / totalAttempts) * 100;

  if (successRate > 75) return 'easy';
  if (successRate < 30) return 'tough';
  return 'medium';
};
```

---

### 5. Soft Delete Mechanism

**Why Soft Delete?**
- Preserve historical data and user attempts
- Maintain analytics integrity
- Allow question restoration with original stats
- Questions can be reactivated with preserved history

**When Soft Delete Happens:**
- Admin manually deletes question from Question Bank
- Question marked as `is_deleted = TRUE`
- Question hidden from active questions but remains in database

**What's Preserved:**
- Question ID (same ID forever)
- All user attempts (historical data)
- Attempt counts (total_attempts, correct_attempts)
- Difficulty level
- Creation timestamp
- All answers and their statistics

**Database State Example:**
```
Admin deletes question:
┌──────────────────────────────────────────────────────────────┐
│ ID: abc-123 | Text: "What is 2+2?" | is_deleted: TRUE       │
│ total_attempts: 150 | correct_attempts: 120                  │
│ difficulty: easy                                             │
└──────────────────────────────────────────────────────────────┘

Admin tries to add same question again:
┌──────────────────────────────────────────────────────────────┐
│ ID: abc-123 | Text: "What is 2+2?" | is_deleted: FALSE      │
│ total_attempts: 150 | correct_attempts: 120 (PRESERVED!)    │
│ difficulty: easy (PRESERVED!)                                │
└──────────────────────────────────────────────────────────────┘
```

---

### 6. Restore Deleted Question

**Flow:**
```
Admin requests restoration of question ID: abc-123
    ↓
Check if question is soft deleted
    ↓
Restore question:
    - Set is_deleted = FALSE
    - Preserve all original stats
    - Same ID (abc-123)
```

**Note:** This is the same as reactivating a question when adding a duplicate. Both operations result in `is_deleted = FALSE` with preserved stats.

---

### 7. Quiz Assignment System

**Purpose:**
Control which users can access which quizzes through email-based assignments with network-resilient progress tracking.

**Key Concepts:**
- Quizzes are **assigned** to users by email
- Users see only their assigned quizzes
- One-time completion (quiz vanishes after completion)
- Random question sequence per user
- Resume functionality for network interruptions
- Admin can reassign quizzes

---

#### 7.1 Assignment Flow

**Admin Assigns Quiz:**
```
Admin navigates to Assignment page
    ↓
Enters user email + selects quiz card
    ↓
System creates quiz_assignments record:
    - user_email: "john@example.com"
    - quiz_id: [Quiz Card ID]
    - status: 'assigned'
    - current_question_index: 0
    ↓
Generate random question sequence:
    - Fetch all questions for this quiz
    - Shuffle questions randomly
    - Create user_quiz_progress records:
      * One per question
      * question_order: 0, 1, 2, 3... (random sequence)
      * is_answered: false
    ↓
User sees quiz in their dashboard
```

**Important:** Email-based assignment means user doesn't need to exist in system yet. Assignment will be visible when they register with that email.

---

#### 7.2 User Quiz Attempt (Network Resilient)

**Quiz Display:**
- **One question per page**
- **Previous/Next buttons** for navigation
- **Timer** (pauses on disconnect, resumes on reconnect)
- **Random sequence** (consistent for this attempt)
- **Can edit previous answers** before final submission

**Start Quiz:**
```
User clicks "Start Quiz"
    ↓
Update assignment:
    - status: 'in_progress'
    - last_activity_at: NOW()
    ↓
Load first question (question_order: 0)
Start timer
```

**Answer Question:**
```
User selects answer on Question 5
    ↓
Clicks "Next"
    ↓
Auto-save progress:
    - Update user_quiz_progress:
      * answer_id: [selected]
      * is_answered: true
      * answered_at: NOW()
    - Update quiz_assignments:
      * current_question_index: 6
      * last_activity_at: NOW()
    ↓
Load Question 6
```

**Network Interruption:**
```
User on Question 7
Network drops / Browser crashes / Page refresh
    ↓
User logs back in
    ↓
System checks:
    - status: 'in_progress'
    - current_question_index: 7
    ↓
Resume from Question 7 (same random sequence)
Timer resumes from where it paused
Previously answered questions still accessible
```

**Complete Quiz:**
```
User answers last question
    ↓
Update quiz_assignments:
    - status: 'completed'
    - completed_at: NOW()
    ↓
Calculate score
Save final attempts to user_attempts table
    ↓
Quiz vanishes from user's available list
```

---

#### 7.3 Admin Reassignment - Two Options

**Option 1: Allow Resume (Continue from where they left off)**
```
User stuck at Question 15 / Network issue / Need more time
    ↓
Admin clicks "Allow Resume"
    ↓
No changes to assignment
Status stays: 'in_progress'
current_question_index preserved
user_quiz_progress unchanged
    ↓
User continues from Question 15
Same random sequence
Same timer state
```

**Option 2: Fresh Reassign (Start over)**
```
User needs to retake quiz completely
    ↓
Admin clicks "Fresh Reassign"
    ↓
Hard delete old user_quiz_progress records
Create NEW assignment:
    - status: 'assigned'
    - current_question_index: 0
    - Generate NEW random question sequence
    ↓
User starts from Question 1
Fresh timer
New random order
```

**Admin UI:**
```
┌─────────────────────────────────────────────────┐
│ Assignment Management                           │
│                                                 │
│ User: john@example.com                          │
│ Quiz: Safety A (20 questions)                   │
│ Status: in_progress                             │
│ Progress: 15/20 questions answered              │
│ Last Activity: 2 hours ago                      │
│                                                 │
│ [Allow Resume] [Fresh Reassign] [Delete]        │
└─────────────────────────────────────────────────┘
```

---

#### 7.4 User Dashboard

**Display Logic:**
```sql
SELECT * FROM quiz_assignments
WHERE user_email = current_user.email
AND status IN ('assigned', 'in_progress')
ORDER BY assigned_at DESC
```

**Quiz Card Display:**
```
┌────────────────────────────────┐
│ Safety A                       │
│ 20 Questions | 45 Minutes     │
│                                │
│ Status: Not Started            │
│ [Start Quiz]                   │
└────────────────────────────────┘

┌────────────────────────────────┐
│ Written Communication          │
│ 23 Questions | 15 Minutes     │
│                                │
│ Status: In Progress (12/23)   │
│ [Resume Quiz]                  │
└────────────────────────────────┘
```

**After Completion:**
- Quiz vanishes from list
- Shown in "Completed Quizzes" section (view only)
- Cannot re-attempt unless admin reassigns

---

#### 7.5 Random Question Sequencing

**Why Random?**
- Prevent cheating (different order per user)
- Fair assessment
- Consistent experience per attempt

**Implementation:**
```javascript
// When admin assigns quiz
const questions = await getQuestionsForQuiz(quizId);

// Shuffle using Fisher-Yates
const shuffled = questions.sort(() => Math.random() - 0.5);

// Store sequence
shuffled.forEach((question, index) => {
  await createUserQuizProgress({
    assignment_id,
    question_id: question.id,
    question_order: index,
    is_answered: false
  });
});
```

**Retrieval:**
```javascript
// Get question at specific position
const question = await getUserQuizProgress
  .where({ assignment_id, question_order: currentIndex })
  .first();
```

---

### 8. Results Page (Admin)

**Purpose:**
Admin dashboard to view all user quiz attempts, download results, and manage user attempt records.

**Page Location:** `/admin/results`

**Features:**
- View all user quiz attempts
- Paginated table with lazy loading
- Excel export (download all results)
- Delete individual attempt records

**Table Columns:**
```
┌──────────────┬──────────────────┬─────────────────┬───────┬──────────────┬────────┐
│ User Name    │ User Email       │ Quiz Card Name  │ Score │ Date         │ Action │
├──────────────┼──────────────────┼─────────────────┼───────┼──────────────┼────────┤
│ John Doe     │ john@email.com   │ Safety A        │ 85%   │ 2025-01-15   │ [Del]  │
│ Jane Smith   │ jane@email.com   │ Safety B        │ 92%   │ 2025-01-14   │ [Del]  │
│ Bob Wilson   │ bob@email.com    │ Written Comm.   │ 78%   │ 2025-01-14   │ [Del]  │
└──────────────┴──────────────────┴─────────────────┴───────┴──────────────┴────────┘

[< Previous]  Page 1 of 25  [Next >]                    [📥 Download Excel]
```

**Delete User Attempt - Critical Logic:**

⚠️ **IMPORTANT**: Deleting a user's attempt record does **NOT** affect question statistics!

```
Example:
Question ID: abc-123
- total_attempts: 150
- correct_attempts: 120
- difficulty: easy

User "John Doe" attempted this question (correct answer)
Admin deletes John's attempt record

Result:
✅ Record removed from user_attempts table
✅ Question stats UNCHANGED (still 150/120)
✅ Question difficulty UNCHANGED (still easy)
❌ NO decrement of counters
❌ NO recalculation of difficulty
```

**Why This Design?**
- **Data Integrity**: Question difficulty reflects actual performance, not admin actions
- **Analytics Accuracy**: Stats show what really happened
- **Audit Trail**: Removing user records doesn't rewrite history
- **Separation of Concerns**: User results ≠ Question analytics

**Flow: Delete User Attempt**
```
Admin clicks Delete on result row
    ↓
Confirm deletion dialog
    ↓
DELETE from user_attempts table (hard delete)
    ↓
Question statistics remain unchanged
    ↓
Result removed from UI
```

**Pagination Strategy:**
- Default: 20 results per page
- Lazy loading: Only fetch current page data
- Server-side pagination for large datasets
- Filter options: By user, quiz, date range

**Excel Export:**
- Downloads ALL results (not just current page)
- Includes all 5 columns
- File format: `.xlsx`
- Filename: `quiz_results_YYYY-MM-DD.xlsx`

---

## Duplicate Detection Rules

### Matching Logic Summary

| Scenario | Question Text | Answer Options | Action | Result |
|----------|--------------|----------------|--------|---------|
| **Exact Match (Deleted)** | Same | Same (any order) | Reactivate | Same ID, stats preserved |
| **Exact Match (Active)** | Same | Same (any order) | Do nothing | Show alert only |
| **Question Same, Options Different** | Same | Any difference | Create new | New ID, 0 attempts |
| **New Question** | Different | Any | Create new | New ID, 0 attempts |

### Key Rules:
1. **Order doesn't matter**: `["A", "B", "C", "D"]` equals `["D", "C", "B", "A"]`
2. **Any option change = new question**: Even 1 character difference creates new question
3. **Reactivation preserves everything**: Same ID, all attempts, difficulty level
4. **Active duplicates blocked**: Can't add same question twice when active

### Comparison Algorithm:
```javascript
function isExactMatch(newQuestion, newAnswers, existingQuestion, existingAnswers) {
  // 1. Question text must match exactly (case-insensitive)
  if (newQuestion.toLowerCase() !== existingQuestion.toLowerCase()) {
    return false;
  }

  // 2. Must have same number of answers
if (newAnswers.length !== existingAnswers.length) {
    return false;
  }

  // 3. Sort answers alphabetically for order-agnostic comparison
  const sortedNew = newAnswers.map(a => a.text.toLowerCase()).sort();
  const sortedExisting = existingAnswers.map(a => a.answer_text.toLowerCase()).sort();

  // 4. Compare sorted arrays
  return sortedNew.every((answer, index) => answer === sortedExisting[index]);
}
```

---

## Difficulty Level System

### Classification Rules

| Difficulty | Success Rate | Description |
|-----------|--------------|-------------|
| **Easy** | > 75% | More than 3 out of 4 users answer correctly |
| **Medium** | 30% - 75% | Moderate challenge level |
| **Tough** | < 30% | Less than 1 out of 3 users answer correctly |

### Auto-Update Trigger
Difficulty level recalculates after each user attempt:
```javascript
// After user submits answer
await updateQuestionStats(questionId, isCorrect);
await recalculateDifficulty(questionId);
```

---

## Tech Stack

### Frontend
- **Next.js 14+** (App Router)
- **Tailwind CSS** for styling
- **React Hook Form** for form management
- **Shadcn/ui** for UI components (optional)

### Backend
- **Supabase**
  - Database (PostgreSQL)
  - Authentication
  - Row Level Security (RLS)
  - Real-time subscriptions

### Key Libraries
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "tailwindcss": "^3.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "@supabase/auth-helpers-nextjs": "^0.8.0",
    "exceljs": "^4.3.0"
  }
}
```

---

## Implementation Roadmap

### Phase 1: Setup
- [ ] Initialize Next.js project with Tailwind
- [ ] Setup Supabase project
- [ ] Create database tables with schema
- [ ] Configure authentication

### Phase 2: Question Bank
- [ ] Question Bank page UI
- [ ] Add question form
- [ ] Search and filter functionality
- [ ] Duplicate detection logic
- [ ] Soft delete implementation
- [ ] Hard delete with validation
- [ ] Edit question functionality
- [ ] Restore deleted questions
- [ ] Difficulty level badges

### Phase 3: Quiz Cards System
- [ ] Quiz cards page (grid layout)
- [ ] Create quiz card
- [ ] Add questions to quiz (from Question Bank)
- [ ] Remove questions from quiz
- [ ] Activate/Deactivate quiz
- [ ] View quiz statistics
- [ ] Question count display
- [ ] Duration management

### Phase 4: User Features
- [ ] User authentication
- [ ] View available quizzes
- [ ] Quiz attempt interface
- [ ] Answer submission
- [ ] Results display
- [ ] User progress tracking

### Phase 5: Quiz Assignment System
- [ ] Assignment database tables (quiz_assignments, user_quiz_progress)
- [ ] Admin: Assign quiz to user by email
- [ ] Admin: View all assignments
- [ ] Admin: Allow resume / Fresh reassign
- [ ] User dashboard: Show assigned quizzes only
- [ ] Random question sequencing per user
- [ ] Progress tracking infrastructure

### Phase 6: User Quiz Attempt (Network Resilient)
- [ ] One question per page UI
- [ ] Previous/Next navigation
- [ ] Timer with pause/resume
- [ ] Auto-save progress after each answer
- [ ] Resume from last question on disconnect
- [ ] Can edit previous answers
- [ ] Complete quiz functionality
- [ ] Quiz vanishes after completion

### Phase 7: Results Page
- [ ] Results page UI with table
- [ ] Pagination implementation
- [ ] Lazy loading for performance
- [ ] Delete user attempt (without affecting question stats)
- [ ] Excel export functionality
- [ ] Filter by user, quiz, date range

### Phase 8: Advanced Features
- [ ] Difficulty calculation automation
- [ ] Analytics dashboard
- [ ] Question history viewer
- [ ] Bulk operations (add/remove questions)

---

## API Endpoints (Next.js Route Handlers)

### Admin Routes - Question Bank
```
POST   /api/admin/questions               - Add new question
GET    /api/admin/questions               - List all questions (including deleted)
GET    /api/admin/questions/[id]          - Get single question details
PUT    /api/admin/questions/[id]          - Update question
DELETE /api/admin/questions/[id]          - Delete question (soft or hard)
POST   /api/admin/questions/restore       - Restore soft-deleted question
GET    /api/admin/questions/search        - Search questions
GET    /api/admin/analytics               - View statistics
```

### Admin Routes - Quiz Cards
```
POST   /api/admin/quizzes                 - Create new quiz card
GET    /api/admin/quizzes                 - List all quiz cards
GET    /api/admin/quizzes/[id]            - Get quiz details with questions
PUT    /api/admin/quizzes/[id]            - Update quiz (name, duration, status)
DELETE /api/admin/quizzes/[id]            - Delete quiz card
POST   /api/admin/quizzes/[id]/questions  - Add questions to quiz
DELETE /api/admin/quizzes/[id]/questions/[qid] - Remove question from quiz
GET    /api/admin/quizzes/[id]/stats      - Get quiz statistics
```

### Admin Routes - Quiz Assignments
```
POST   /api/admin/assignments                - Assign quiz to user(s) by email
GET    /api/admin/assignments                - List all assignments
GET    /api/admin/assignments/[id]           - Get assignment details
PUT    /api/admin/assignments/[id]/resume    - Allow user to resume
POST   /api/admin/assignments/[id]/reassign  - Fresh reassign (new attempt)
DELETE /api/admin/assignments/[id]           - Delete assignment
GET    /api/admin/assignments/user/[email]   - Get user's assignments
```

### Admin Routes - Results Page
```
GET    /api/admin/results                 - Get paginated user attempts
GET    /api/admin/results/export          - Export all results to Excel
DELETE /api/admin/results/[id]            - Delete user attempt (no stats impact)
GET    /api/admin/results/stats           - Get overall statistics
```

### User Routes - Assignments
```
GET    /api/user/assignments              - Get assigned quizzes for current user
GET    /api/user/assignments/[id]         - Get assignment details
```

### User Routes - Quiz Attempt
```
POST   /api/quiz/start                    - Start quiz (create progress tracking)
GET    /api/quiz/[assignment_id]/current  - Get current question
POST   /api/quiz/[assignment_id]/answer   - Save answer & move to next
GET    /api/quiz/[assignment_id]/previous - Go to previous question
POST   /api/quiz/[assignment_id]/complete - Complete quiz
GET    /api/quiz/[assignment_id]/progress - Get progress state
```

---

## Security Considerations

### Row Level Security (RLS) Policies

**Questions Table:**
```sql
-- Users can only read non-deleted questions
CREATE POLICY "users_read_active_questions" ON questions
  FOR SELECT USING (is_deleted = false);

-- Admins can read all questions
CREATE POLICY "admins_read_all_questions" ON questions
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Only admins can insert/update
CREATE POLICY "admins_manage_questions" ON questions
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );
```

**User Attempts:**
```sql
-- Users can only see their own attempts
CREATE POLICY "users_view_own_attempts" ON user_attempts
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own attempts
CREATE POLICY "users_insert_attempts" ON user_attempts
  FOR INSERT WITH CHECK (user_id = auth.uid());
```

---

## UI Components Structure

### Admin Dashboard
```
/admin
  ├── /dashboard               - Overview stats
  ├── /quizzes                 - Quiz cards page (like image)
  │   ├── /[id]               - Manage specific quiz
  │   └── /create             - Create new quiz card
  ├── /question-bank           - Question Bank page
  │   ├── /add                - Add new question
  │   ├── /edit/[id]          - Edit question
  │   ├── /deleted            - View soft-deleted questions
  │   └── /search             - Advanced search interface
  ├── /assignments             - Assignment management
  │   ├── /assign             - Assign quiz to user(s)
  │   ├── /list               - View all assignments
  │   └── /[id]               - Manage specific assignment
  ├── /results                 - Results page (user attempts)
  │   └── /export             - Excel download
  └── /analytics              - Detailed analytics
```

### User Interface
```
/
  ├── /dashboard               - User dashboard (assigned quizzes)
  ├── /quiz/[assignment_id]    - Take quiz (one question per page)
  │   ├── /question            - Current question
  │   ├── /previous            - Previous question
  │   └── /complete            - Submit quiz
  ├── /completed               - View completed quizzes
  └── /profile                 - User profile & progress
```

---

## Example Code Snippets

### 1. Create Quiz Card
```javascript
// app/api/admin/quizzes/route.js
export async function POST(request) {
  const { quiz_name, exam_name, duration, status = 'activated' } = await request.json();

  const { data: quiz, error } = await supabase
    .from('quizzes')
    .insert({
      quiz_name,
      exam_name,
      duration,
      status,
      admin_id: session.user.id
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ success: true, quiz });
}

// GET - List all quiz cards with question counts
export async function GET() {
  const { data: quizzes } = await supabase
    .from('quizzes')
    .select(`
      *,
      quiz_questions(count)
    `)
    .order('created_at', { ascending: false });

  return Response.json({ quizzes });
}
```

### 2. Add Questions to Quiz Card
```javascript
// app/api/admin/quizzes/[id]/questions/route.js
export async function POST(request, { params }) {
  const { question_ids } = await request.json(); // Array of question IDs
  const { id: quiz_id } = params;

  // Prepare bulk insert
  const quizQuestions = question_ids.map((question_id, index) => ({
    quiz_id,
    question_id,
    display_order: index
  }));

  const { data, error } = await supabase
    .from('quiz_questions')
    .insert(quizQuestions)
    .select();

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ success: true, added: data.length });
}

// DELETE - Remove question from quiz (NOT from Question Bank)
export async function DELETE(request, { params }) {
  const { id: quiz_id } = params;
  const { question_id } = await request.json();

  const { error } = await supabase
    .from('quiz_questions')
    .delete()
    .eq('quiz_id', quiz_id)
    .eq('question_id', question_id);

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ success: true, message: 'Question removed from quiz' });
}
```

### 3. Question Bank - Search & Filter
```javascript
// app/api/admin/questions/search/route.js
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const difficulty = searchParams.get('difficulty');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  let queryBuilder = supabase
    .from('questions')
    .select('*, answers(count)', { count: 'exact' })
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Text search
  if (query) {
    queryBuilder = queryBuilder.ilike('question_text', `%${query}%`);
  }

  // Difficulty filter
  if (difficulty && difficulty !== 'all') {
    queryBuilder = queryBuilder.eq('difficulty_level', difficulty);
  }

  const { data: questions, count, error } = await queryBuilder;

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({
    questions,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit)
    }
  });
}
```

### 4. Question Bank - Delete Question
```javascript
// app/api/admin/questions/[id]/route.js
export async function DELETE(request, { params }) {
  const { id } = params;
  const { searchParams } = new URL(request.url);
  const hardDelete = searchParams.get('hard') === 'true';

  if (hardDelete) {
    // Permanent deletion
    // First check if question is used in any quiz
    const { data: usedInQuizzes } = await supabase
      .from('quiz_questions')
      .select('quiz_id')
      .eq('question_id', id);

    if (usedInQuizzes && usedInQuizzes.length > 0) {
      return Response.json(
        { error: 'Cannot delete: Question is used in active quizzes' },
        { status: 400 }
      );
    }

    // Hard delete
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id);

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ success: true, message: 'Question permanently deleted' });
  } else {
    // Soft delete
    const { error } = await supabase
      .from('questions')
      .update({ is_deleted: true })
      .eq('id', id);

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ success: true, message: 'Question soft deleted' });
  }
}
```

### 5. Add Question with Duplicate Check (to Question Bank)
```javascript
// app/api/admin/questions/route.js
export async function POST(request) {
  const { question_text, answers } = await request.json();

  // Check for duplicate (question text match)
  const { data: existingQuestions } = await supabase
    .from('questions')
    .select('id, is_deleted, answers(answer_text)')
    .ilike('question_text', question_text);

  // Helper: Check if answers match (order-agnostic)
  const answersMatch = (newAnswers, existingAnswers) => {
    if (newAnswers.length !== existingAnswers.length) return false;

    const sortedNew = newAnswers.map(a => a.text.toLowerCase()).sort();
    const sortedExisting = existingAnswers.map(a => a.answer_text.toLowerCase()).sort();

    return sortedNew.every((ans, idx) => ans === sortedExisting[idx]);
  };

  // Find exact match
  const exactMatch = existingQuestions?.find(q =>
    answersMatch(answers, q.answers)
  );

  if (exactMatch) {
    if (exactMatch.is_deleted) {
      // SCENARIO 1: Reactivate deleted question
      await supabase
        .from('questions')
        .update({ is_deleted: false })
        .eq('id', exactMatch.id);

      return Response.json({
        success: true,
        action: 'reactivated',
        message: 'Question already exists and has been reactivated',
        question: exactMatch
      });
    } else {
      // SCENARIO 4: Already active
      return Response.json({
        success: false,
        action: 'exists',
        message: 'Question already exists in Question Bank',
        question: exactMatch
      }, { status: 409 });
    }
  }

  // SCENARIO 2 & 3: Create new question
  const { data: newQuestion } = await supabase
    .from('questions')
    .insert({ question_text })
    .select()
    .single();

  // Add answers
  const answerInserts = answers.map(ans => ({
    question_id: newQuestion.id,
    answer_text: ans.text,
    is_correct: ans.is_correct
  }));

  await supabase.from('answers').insert(answerInserts);

  return Response.json({
    success: true,
    action: 'created',
    message: 'New question created',
    question: newQuestion
  });
}
```

### 6. Get Quiz Questions for User
```javascript
// app/api/quiz/[id]/questions/route.js
export async function GET(request, { params }) {
  const { id: quiz_id } = params;

  // Get quiz with its questions
  const { data: quiz } = await supabase
    .from('quizzes')
    .select(`
      *,
      quiz_questions(
        question_id,
        display_order,
        questions(
          id,
          question_text,
          difficulty_level,
          answers(id, answer_text, is_correct)
        )
      )
    `)
    .eq('id', quiz_id)
    .eq('status', 'activated')
    .single();

  if (!quiz) {
    return Response.json({ error: 'Quiz not found' }, { status: 404 });
  }

  // Hide correct answers from user
  const questionsWithoutAnswers = quiz.quiz_questions.map(qq => ({
    ...qq.questions,
    answers: qq.questions.answers.map(({ id, answer_text }) => ({
      id,
      answer_text
    }))
  }));

  return Response.json({
    quiz: {
      id: quiz.id,
      name: quiz.quiz_name,
      exam_name: quiz.exam_name,
      duration: quiz.duration,
      question_count: quiz.quiz_questions.length
    },
    questions: questionsWithoutAnswers
  });
}
```

### 7. Submit User Attempt
```javascript
// app/api/quiz/attempt/route.js
export async function POST(request) {
  const { question_id, answer_id, user_id } = await request.json();

  // Get correct answer
  const { data: answer } = await supabase
    .from('answers')
    .select('is_correct')
    .eq('id', answer_id)
    .single();

  // Record attempt
  await supabase.from('user_attempts').insert({
    user_id,
    question_id,
    selected_answer_id: answer_id,
    is_correct: answer.is_correct
  });

  // Update question stats
  await supabase.rpc('increment_question_stats', {
    q_id: question_id,
    is_correct: answer.is_correct
  });

  // Recalculate difficulty
  const { data: question } = await supabase
    .from('questions')
    .select('total_attempts, correct_attempts')
    .eq('id', question_id)
    .single();

  const difficulty = calculateDifficulty(
    question.correct_attempts,
    question.total_attempts
  );

  await supabase
    .from('questions')
    .update({ difficulty_level: difficulty })
    .eq('id', question_id);

  return Response.json({
    success: true,
    is_correct: answer.is_correct,
    difficulty
  });
}
```

### 8. Results Page - Get Paginated Results
```javascript
// app/api/admin/results/route.js
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  // Get user attempts with user and quiz details
  const { data: results, count, error } = await supabase
    .from('user_attempts')
    .select(`
      id,
      is_correct,
      attempted_at,
      users:user_id (
        id,
        full_name,
        email
      ),
      quizzes:quiz_id (
        id,
        quiz_name,
        exam_name
      )
    `, { count: 'exact' })
    .order('attempted_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  // Calculate score per user per quiz
  // Group by user_id + quiz_id to get aggregated scores
  const processedResults = await Promise.all(
    results.map(async (result) => {
      // Get total questions for this quiz
      const { count: totalQuestions } = await supabase
        .from('quiz_questions')
        .select('*', { count: 'exact', head: true })
        .eq('quiz_id', result.quizzes.id);

      // Get correct answers for this user in this quiz
      const { count: correctAnswers } = await supabase
        .from('user_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', result.users.id)
        .eq('quiz_id', result.quizzes.id)
        .eq('is_correct', true);

      const score = totalQuestions > 0
        ? Math.round((correctAnswers / totalQuestions) * 100)
        : 0;

      return {
        id: result.id,
        user_name: result.users.full_name,
        user_email: result.users.email,
        quiz_name: result.quizzes.exam_name,
        score: `${score}%`,
        date: new Date(result.attempted_at).toLocaleDateString(),
      };
    })
  );

  return Response.json({
    results: processedResults,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  });
}
```

### 9. Results Page - Delete User Attempt (No Stats Impact)
```javascript
// app/api/admin/results/[id]/route.js
export async function DELETE(request, { params }) {
  const { id } = params;

  // IMPORTANT: Just delete the record, DON'T touch question statistics
  const { error } = await supabase
    .from('user_attempts')
    .delete()
    .eq('id', id);

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  // NO calls to update question stats
  // NO decrement of total_attempts or correct_attempts
  // Question difficulty remains unchanged

  return Response.json({
    success: true,
    message: 'User attempt deleted (question stats unchanged)',
  });
}
```

### 10. Results Page - Export to Excel
```javascript
// app/api/admin/results/export/route.js
import ExcelJS from 'exceljs';

export async function GET(request) {
  // Fetch ALL results (no pagination)
  const { data: results } = await supabase
    .from('user_attempts')
    .select(`
      id,
      is_correct,
      attempted_at,
      users:user_id (full_name, email),
      quizzes:quiz_id (quiz_name, exam_name)
    `)
    .order('attempted_at', { ascending: false });

  // Process results to calculate scores
  const processedResults = []; // Same processing as GET endpoint

  // Create Excel workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Quiz Results');

  // Add headers
  worksheet.columns = [
    { header: 'User Name', key: 'user_name', width: 20 },
    { header: 'User Email', key: 'user_email', width: 30 },
    { header: 'Quiz Card Name', key: 'quiz_name', width: 30 },
    { header: 'Score', key: 'score', width: 10 },
    { header: 'Exam Attended Date', key: 'date', width: 15 },
  ];

  // Add data rows
  processedResults.forEach((result) => {
    worksheet.addRow(result);
  });

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();

  // Return as downloadable file
  const filename = `quiz_results_${new Date().toISOString().split('T')[0]}.xlsx`;

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
```

### 11. Assignment System - Assign Quiz to User
```javascript
// app/api/admin/assignments/route.js
export async function POST(request) {
  const { user_email, quiz_id } = await request.json();
  const admin_id = session.user.id;

  // Check if assignment already exists
  const { data: existing } = await supabase
    .from('quiz_assignments')
    .select('*')
    .eq('user_email', user_email)
    .eq('quiz_id', quiz_id)
    .in('status', ['assigned', 'in_progress'])
    .single();

  if (existing) {
    return Response.json(
      { error: 'Quiz already assigned to this user' },
      { status: 400 }
    );
  }

  // Create assignment
  const { data: assignment } = await supabase
    .from('quiz_assignments')
    .insert({
      user_email,
      quiz_id,
      assigned_by: admin_id,
      status: 'assigned',
      current_question_index: 0
    })
    .select()
    .single();

  // Get quiz questions
  const { data: quizQuestions } = await supabase
    .from('quiz_questions')
    .select('question_id')
    .eq('quiz_id', quiz_id)
    .order('display_order');

  // Shuffle questions (Fisher-Yates)
  const shuffled = quizQuestions.sort(() => Math.random() - 0.5);

  // Create progress tracking records
  const progressRecords = shuffled.map((q, index) => ({
    assignment_id: assignment.id,
    question_id: q.question_id,
    question_order: index,
    is_answered: false
  }));

  await supabase.from('user_quiz_progress').insert(progressRecords);

  return Response.json({
    success: true,
    message: 'Quiz assigned successfully',
    assignment
  });
}
```

### 12. Assignment System - Start Quiz (User)
```javascript
// app/api/quiz/start/route.js
export async function POST(request) {
  const { assignment_id } = await request.json();

  // Update assignment status
  const { data: assignment } = await supabase
    .from('quiz_assignments')
    .update({
      status: 'in_progress',
      last_activity_at: new Date().toISOString()
    })
    .eq('id', assignment_id)
    .eq('user_email', session.user.email)
    .select()
    .single();

  if (!assignment) {
    return Response.json({ error: 'Assignment not found' }, { status: 404 });
  }

  return Response.json({
    success: true,
    assignment,
    message: 'Quiz started'
  });
}
```

### 13. Assignment System - Get Current Question
```javascript
// app/api/quiz/[assignment_id]/current/route.js
export async function GET(request, { params }) {
  const { assignment_id } = params;

  // Get assignment
  const { data: assignment } = await supabase
    .from('quiz_assignments')
    .select('*, quizzes(*)')
    .eq('id', assignment_id)
    .eq('user_email', session.user.email)
    .single();

  if (!assignment) {
    return Response.json({ error: 'Assignment not found' }, { status: 404 });
  }

  // Get current question based on question_order
  const { data: progress } = await supabase
    .from('user_quiz_progress')
    .select(`
      *,
      questions(
        id,
        question_text,
        difficulty_level,
        answers(id, answer_text)
      )
    `)
    .eq('assignment_id', assignment_id)
    .eq('question_order', assignment.current_question_index)
    .single();

  // Get total questions
  const { count: totalQuestions } = await supabase
    .from('user_quiz_progress')
    .select('*', { count: 'exact', head: true })
    .eq('assignment_id', assignment_id);

  return Response.json({
    question: progress.questions,
    current_index: assignment.current_question_index,
    total_questions: totalQuestions,
    quiz: assignment.quizzes,
    previously_answered: progress.is_answered,
    selected_answer_id: progress.answer_id
  });
}
```

### 14. Assignment System - Save Answer & Auto-Progress
```javascript
// app/api/quiz/[assignment_id]/answer/route.js
export async function POST(request, { params }) {
  const { assignment_id } = params;
  const { answer_id, question_id } = await request.json();

  // Update progress for this question
  const { error: progressError } = await supabase
    .from('user_quiz_progress')
    .update({
      answer_id,
      is_answered: true,
      answered_at: new Date().toISOString()
    })
    .eq('assignment_id', assignment_id)
    .eq('question_id', question_id);

  if (progressError) {
    return Response.json({ error: progressError.message }, { status: 400 });
  }

  // Get current assignment
  const { data: assignment } = await supabase
    .from('quiz_assignments')
    .select('current_question_index')
    .eq('id', assignment_id)
    .single();

  // Move to next question
  const { error: assignmentError } = await supabase
    .from('quiz_assignments')
    .update({
      current_question_index: assignment.current_question_index + 1,
      last_activity_at: new Date().toISOString()
    })
    .eq('id', assignment_id);

  if (assignmentError) {
    return Response.json({ error: assignmentError.message }, { status: 400 });
  }

  return Response.json({
    success: true,
    message: 'Answer saved',
    next_index: assignment.current_question_index + 1
  });
}
```

### 15. Assignment System - Fresh Reassign
```javascript
// app/api/admin/assignments/[id]/reassign/route.js
export async function POST(request, { params }) {
  const { id: old_assignment_id } = params;

  // Get old assignment details
  const { data: oldAssignment } = await supabase
    .from('quiz_assignments')
    .select('user_email, quiz_id, assigned_by')
    .eq('id', old_assignment_id)
    .single();

  // Hard delete old progress records
  await supabase
    .from('user_quiz_progress')
    .delete()
    .eq('assignment_id', old_assignment_id);

  // Delete old assignment
  await supabase
    .from('quiz_assignments')
    .delete()
    .eq('id', old_assignment_id);

  // Create NEW assignment (same as initial assignment flow)
  const { data: newAssignment } = await supabase
    .from('quiz_assignments')
    .insert({
      user_email: oldAssignment.user_email,
      quiz_id: oldAssignment.quiz_id,
      assigned_by: oldAssignment.assigned_by,
      status: 'assigned',
      current_question_index: 0
    })
    .select()
    .single();

  // Generate NEW random question sequence
  const { data: quizQuestions } = await supabase
    .from('quiz_questions')
    .select('question_id')
    .eq('quiz_id', oldAssignment.quiz_id);

  const shuffled = quizQuestions.sort(() => Math.random() - 0.5);

  const progressRecords = shuffled.map((q, index) => ({
    assignment_id: newAssignment.id,
    question_id: q.question_id,
    question_order: index,
    is_answered: false
  }));

  await supabase.from('user_quiz_progress').insert(progressRecords);

  return Response.json({
    success: true,
    message: 'Quiz reassigned with fresh start',
    assignment: newAssignment
  });
}
```

### 16. Question Bank - Restore Soft-Deleted Question
```javascript
// app/api/admin/questions/restore/route.js
export async function POST(request) {
  const { question_id } = await request.json();

  // Check if question exists and is deleted
  const { data: question } = await supabase
    .from('questions')
    .select('*')
    .eq('id', question_id)
    .eq('is_deleted', true)
    .single();

  if (!question) {
    return Response.json(
      { error: 'Question not found or not deleted' },
      { status: 404 }
    );
  }

  // Restore question with preserved stats
  await supabase
    .from('questions')
    .update({ is_deleted: false })
    .eq('id', question_id);

  return Response.json({
    success: true,
    message: 'Question restored with original stats',
    question
  });
}
```

---

## Database Functions (Supabase)

### Increment Question Stats
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
    correct_attempts = correct_attempts + CASE WHEN is_correct THEN 1 ELSE 0 END
  WHERE id = q_id;
END;
$$ LANGUAGE plpgsql;
```

---

## Testing Checklist

### Question Bank Functionality
- [ ] Admin can add new question to Question Bank
- [ ] Adding exact duplicate (same text + options) reactivates deleted question
- [ ] Adding exact duplicate to active question shows alert (no action)
- [ ] Adding question with different options creates new question
- [ ] Question reactivation preserves all stats (attempts, difficulty)
- [ ] Options order doesn't matter for duplicate detection
- [ ] Admin can search questions
- [ ] Admin can filter by difficulty
- [ ] Admin can edit questions
- [ ] Admin can soft delete questions
- [ ] Admin can hard delete questions (with validation)
- [ ] Admin can view deleted questions
- [ ] Admin can restore deleted questions

### Quiz Card Functionality
- [ ] Admin can create quiz cards
- [ ] Admin can add questions from Question Bank to quiz
- [ ] Admin can remove questions from quiz (doesn't delete from bank)
- [ ] Question count updates automatically
- [ ] Admin can activate/deactivate quizzes
- [ ] Cannot hard delete questions used in active quizzes

### Quiz Assignment Functionality
- [ ] Admin can assign quiz to user by email (user may not exist yet)
- [ ] Admin can view all assignments with status
- [ ] Admin can see assignment progress (X/Y questions answered)
- [ ] Admin can allow resume (keep progress)
- [ ] Admin can fresh reassign (delete old progress, new random sequence)
- [ ] Cannot assign same quiz twice to same user (unless completed)
- [ ] Assignment remains if user hasn't registered yet
- [ ] Random question sequence generated at assignment time
- [ ] Each user gets different question order

### Results Page Functionality
- [ ] Admin can view all user attempts in paginated table
- [ ] Pagination works with lazy loading (20 results per page)
- [ ] Delete user attempt removes record from database
- [ ] Deleting user attempt does NOT affect question statistics
- [ ] Question counters (total_attempts, correct_attempts) remain unchanged after deletion
- [ ] Difficulty level unchanged after user attempt deletion
- [ ] Excel export downloads all results
- [ ] Excel includes: User Name, Email, Quiz Name, Score, Date

### User Functionality
- [ ] User sees only assigned quizzes (email-based)
- [ ] User can start quiz (status: assigned → in_progress)
- [ ] One question per page with Previous/Next buttons
- [ ] Timer pauses on disconnect, resumes on reconnect
- [ ] Auto-save progress after each answer
- [ ] Can edit previous answers before final submission
- [ ] Resume from last question on page refresh/network drop
- [ ] Complete quiz (status: in_progress → completed)
- [ ] Quiz vanishes from available list after completion
- [ ] User can view completed quizzes (view only)
- [ ] Answer submission updates question stats (unless deleted by admin)
- [ ] Difficulty recalculates correctly

### Edge Cases
- [ ] Question with 0 attempts shows medium difficulty
- [ ] Reactivating question brings back exact stats
- [ ] Answer options in different order treated as same question
- [ ] Concurrent attempts update stats properly
- [ ] Cannot hard delete question used in active quiz
- [ ] Removing question from quiz doesn't affect Question Bank
- [ ] Same question can be in multiple quizzes
- [ ] Adding duplicate while deleted question is in active quiz works correctly
- [ ] Case-insensitive matching (e.g., "What is 2+2?" = "what is 2+2?")

---

## Deployment

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Build & Deploy
```bash
npm run build
npm run start
```

---

## UI Component Examples

### Quiz Card Component (React + Tailwind)
```jsx
// components/QuizCard.jsx
export default function QuizCard({ quiz, questionCount }) {
  const statusColor = quiz.status === 'activated' ? 'bg-green-500' : 'bg-gray-400';

  return (
    <div className="relative border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Status Indicator */}
      <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${statusColor}`} />

      {/* Quiz Name */}
      <h2 className="text-2xl font-bold mb-4">{quiz.quiz_name}</h2>

      {/* Quiz Details */}
      <div className="space-y-2 mb-6">
        <p className="text-sm text-gray-600">
          Status: <span className="font-medium">{quiz.status}</span>
        </p>
        <p className="text-sm text-gray-600">
          Exam Name: <span className="font-medium">{quiz.exam_name}</span>
        </p>
        <p className="text-sm text-gray-600">
          Number of Questions: <span className="font-medium">{questionCount}</span>
        </p>
        <p className="text-sm text-gray-600">
          Duration: <span className="font-medium">{quiz.duration} minutes</span>
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded">
          Questions
        </button>
        <button className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded">
          {quiz.status === 'activated' ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </div>
  );
}
```

### Question Bank List Item Component
```jsx
// components/QuestionBankItem.jsx
export default function QuestionBankItem({ question }) {
  const difficultyConfig = {
    easy: { color: 'bg-green-100 text-green-800', emoji: '🟢' },
    medium: { color: 'bg-yellow-100 text-yellow-800', emoji: '🟡' },
    tough: { color: 'bg-red-100 text-red-800', emoji: '🔴' }
  };

  const difficulty = difficultyConfig[question.difficulty_level] || difficultyConfig.medium;
  const successRate = question.total_attempts > 0
    ? ((question.correct_attempts / question.total_attempts) * 100).toFixed(1)
    : 'N/A';

  return (
    <div className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between mb-2">
        {/* Question ID and Difficulty */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">ID: {question.id.slice(0, 8)}</span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${difficulty.color}`}>
            {difficulty.emoji} {question.difficulty_level.toUpperCase()}
          </span>
        </div>

        {/* Stats */}
        <div className="text-xs text-gray-600">
          Attempts: {question.total_attempts} | Correct: {question.correct_attempts}
          {successRate !== 'N/A' && ` (${successRate}%)`}
        </div>
      </div>

      {/* Question Text */}
      <p className="text-sm mb-3 line-clamp-2">{question.question_text}</p>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button className="px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded">
          Edit
        </button>
        <button className="px-3 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded">
          Delete
        </button>
        <button className="px-3 py-1 text-xs bg-gray-500 hover:bg-gray-600 text-white rounded">
          View Details
        </button>
      </div>
    </div>
  );
}
```

### Question Bank Search Component
```jsx
// components/QuestionBankSearch.jsx
'use client';
import { useState } from 'react';

export default function QuestionBankSearch({ onSearch }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [difficulty, setDifficulty] = useState('all');

  const handleSearch = () => {
    onSearch({ query: searchTerm, difficulty });
  };

  return (
    <div className="flex gap-4 items-end mb-6">
      <div className="flex-1">
        <label className="block text-sm font-medium mb-1">Search</label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search questions..."
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>

      <div className="w-48">
        <label className="block text-sm font-medium mb-1">Difficulty</label>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        >
          <option value="all">All</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="tough">Tough</option>
        </select>
      </div>

      <button
        onClick={handleSearch}
        className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
      >
        Search
      </button>
    </div>
  );
}
```

### Results Table Component (with Pagination)
```jsx
// components/ResultsTable.jsx
'use client';
import { useState, useEffect } from 'react';

export default function ResultsTable() {
  const [results, setResults] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchResults(currentPage);
  }, [currentPage]);

  const fetchResults = async (page) => {
    setLoading(true);
    const response = await fetch(`/api/admin/results?page=${page}&limit=20`);
    const data = await response.json();
    setResults(data.results);
    setPagination(data.pagination);
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure? This will NOT affect question statistics.')) {
      return;
    }

    await fetch(`/api/admin/results/${id}`, { method: 'DELETE' });
    fetchResults(currentPage); // Refresh
  };

  const handleExport = () => {
    window.location.href = '/api/admin/results/export';
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      {/* Header with Export Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Quiz Results</h2>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
        >
          📥 Download Excel
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left">User Name</th>
              <th className="px-4 py-3 text-left">User Email</th>
              <th className="px-4 py-3 text-left">Quiz Card Name</th>
              <th className="px-4 py-3 text-left">Score</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={result.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">{result.user_name}</td>
                <td className="px-4 py-3">{result.user_email}</td>
                <td className="px-4 py-3">{result.quiz_name}</td>
                <td className="px-4 py-3">{result.score}</td>
                <td className="px-4 py-3">{result.date}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleDelete(result.id)}
                    className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Page {pagination.page} of {pagination.totalPages} ({pagination.total} total results)
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={currentPage === pagination.totalPages}
            className="px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Key Architectural Decisions

### 1. Why Quiz Cards + Question Bank?
- **Separation of Concerns**: Questions are managed centrally, quizzes are composed from them
- **Reusability**: Same question can appear in multiple quizzes
- **Data Integrity**: Deleting quiz doesn't delete questions
- **Analytics**: Question stats accumulate across all quizzes

### 2. Why Soft Delete?
- **Historical Data**: Preserve all user attempts even if question is modified
- **Analytics**: Track question evolution and performance over time
- **Undo Capability**: Restore questions with all original stats
- **Compliance**: Some regulations require audit trails

### 3. Junction Table Pattern
- **Many-to-Many**: Questions ↔ Quizzes relationship
- **Additional Data**: Store display_order for question sequencing
- **Flexible**: Easy to add/remove questions without affecting source data
- **Scalable**: Efficient queries with proper indexing

---

## Database Indexes (Performance Optimization)

```sql
-- Speed up question searches
CREATE INDEX idx_questions_text ON questions USING gin(to_tsvector('english', question_text));
CREATE INDEX idx_questions_difficulty ON questions(difficulty_level);
CREATE INDEX idx_questions_deleted ON questions(is_deleted);

-- Speed up quiz queries
CREATE INDEX idx_quiz_questions_quiz ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_questions_question ON quiz_questions(question_id);

-- Speed up user attempts
CREATE INDEX idx_user_attempts_user ON user_attempts(user_id);
CREATE INDEX idx_user_attempts_question ON user_attempts(question_id);
CREATE INDEX idx_user_attempts_quiz ON user_attempts(quiz_id);
CREATE INDEX idx_user_attempts_date ON user_attempts(attempted_at);
```

---

## Important Deletion Rules Summary

| Action | Location | What Happens | Question Bank | Quiz Cards |
|--------|----------|--------------|---------------|------------|
| **Remove from Quiz** | Quiz Card | Delete from `quiz_questions` | ✅ Unaffected | ✅ Removed |
| **Soft Delete** | Question Bank | Set `is_deleted = TRUE` | ⚠️ Hidden | ⚠️ Remains in quiz |
| **Hard Delete** | Question Bank | Permanent deletion | ❌ Deleted | ❌ Requires validation |
| **Add Duplicate** | Question Bank | Reactivate if deleted | ✅ Reactivated, stats preserved | ✅ Can be added to quizzes |
| **Edit Options** | Question Bank | Create new question | ✅ New ID, 0 attempts | N/A |

**Critical Rules:**
1. **ONLY** Question Bank can delete questions permanently
2. Quiz Cards can only **unlink** questions (remove from junction table)
3. Hard delete is blocked if question is used in any active quiz
4. Soft delete preserves all stats and attempt history
5. **Adding duplicate question reactivates it** (not creates new one)
6. **Changing any option = new question** (different ID, fresh start)

---

## Future Enhancements

1. **Question Categories** - Organize by topic/subject
2. **Tags System** - Multiple tags per question for better filtering
3. **Timed Quizzes** - Add countdown timer
4. **Leaderboard** - Rank users by performance
5. **Question Reports** - Users can flag problematic questions
6. **Bulk Import** - CSV/JSON question import
7. **AI-Generated Questions** - Use LLM for question generation
8. **Adaptive Difficulty** - Show questions based on user level
9. **Question Versioning** - Track all versions of edited questions
10. **Quiz Templates** - Reusable quiz configurations
11. **Randomization** - Random question order per attempt
12. **Explanation Field** - Add explanations for correct answers

---

## Support & Documentation

For questions or issues:
- Review this documentation
- Check Supabase docs: https://supabase.com/docs
- Check Next.js docs: https://nextjs.org/docs
- Check Tailwind docs: https://tailwindcss.com/docs

---

## Quick Start Guide

1. **Setup Database**: Run all SQL schemas in Supabase
2. **Create Question Bank**: Add your first questions
3. **Create Quiz Card**: Design your first quiz
4. **Add Questions to Quiz**: Link questions from Question Bank
5. **Activate Quiz**: Make it available to users
6. **Test User Flow**: Attempt quiz and verify stats update

---

*Last Updated: [Date]*
*Version: 1.0*