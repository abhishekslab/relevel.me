# Experience Point (XP) System Design

**Version:** 1.0
**Last Updated:** 2025-10-20
**Status:** Design Document

---

## Table of Contents

1. [Overview & Philosophy](#overview--philosophy)
2. [Global XP System](#global-xp-system)
3. [Skill-Specific XP System](#skill-specific-xp-system)
4. [Daily Reflection System](#daily-reflection-system)
5. [Streak System](#streak-system)
6. [Hours Tracking & Skill Practice](#hours-tracking--skill-practice)
7. [Mathematical Formulas](#mathematical-formulas)
8. [Database Schema](#database-schema)
9. [Gamification Elements](#gamification-elements)
10. [Implementation Roadmap](#implementation-roadmap)

---

## Overview & Philosophy

### Core Concept

relevel.me uses a **dual XP system** that combines:
- **Global XP**: Represents overall growth through reflection and meta-learning
- **Skill XP**: Tracks mastery in specific skills through deliberate practice

This design aligns with the Artha narrative: *reflection feeds growth, practice shapes mastery*.

### Design Principles

1. **Consistency over intensity** — Reward daily habits through streaks
2. **Reflection amplifies learning** — Meta-skills grow through evening reflections
3. **Mastery takes time** — Follow the 10,000-hour rule for skill progression
4. **Transparent progression** — Clear formulas, no hidden mechanics
5. **Intrinsic motivation** — XP represents real capability, not arbitrary points

---

## Global XP System

### What is Global XP?

Global XP represents the user's **meta-learning capability** — their ability to reflect, maintain discipline, and grow holistically. It's earned through:

- **Daily reflections** (primary source)
- **Completing evening calls with Artha**
- **Meta-skill milestones** (Discipline, Retention, Self-Awareness)
- **Streak bonuses**

### Global Level Progression

Users have a single global level that represents their overall journey.

| Level | Total XP Required | Cumulative XP |
|-------|-------------------|---------------|
| 1     | 0                 | 0             |
| 2     | 100               | 100           |
| 3     | 200               | 300           |
| 5     | 500               | 1,500         |
| 10    | 1,500             | 8,500         |
| 20    | 4,000             | 42,000        |
| 50    | 15,000            | 350,000       |
| 100   | 40,000            | 1,850,000     |

**Formula:** `XP_needed = 100 × level^1.5`

### Global XP Sources

| Activity | Base XP | Notes |
|----------|---------|-------|
| Daily reflection | 50 XP | Core daily activity |
| Evening call completed | 100 XP | Full reflection session |
| 7-day streak milestone | 200 XP | Bonus on 7th day |
| 30-day streak milestone | 1,000 XP | Bonus on 30th day |
| 100-day streak milestone | 5,000 XP | Bonus on 100th day |
| Meta-skill level up | 50 XP × level | Scales with skill level |

### Benefits of Global Levels

- **Level 5**: Unlock fog-of-war expansion (reveal adjacent skills)
- **Level 10**: Unlock artifact system
- **Level 20**: Custom skill creation
- **Level 30**: Advanced analytics dashboard
- **Level 50**: Mentor mode (help others)
- **Level 100**: Artha's Echo (special title + cosmetics)

---

## Skill-Specific XP System

### The 10,000 Hour Mastery Model

Each skill has its own level and XP, tied directly to **hours of deliberate practice**.

### Mastery Tiers

| Tier | Hours Range | Skill Level | Description |
|------|-------------|-------------|-------------|
| **Novice** | 0-100h | 1-10 | Foundation phase, high learning rate |
| **Intermediate** | 100-1,000h | 10-30 | Competency building, steady progress |
| **Advanced** | 1,000-5,000h | 30-60 | Specialization, diminishing returns |
| **Expert** | 5,000-10,000h | 60-90 | Deep mastery, fine-tuning |
| **Master** | 10,000h+ | 90-99 | Continuous refinement |

### Hours to Level Conversion

**Formula:** `Level = floor(10 + 20 × log10(hours + 1))`

Examples:
- **1 hour** → Level 1
- **10 hours** → Level 11
- **100 hours** → Level 30
- **1,000 hours** → Level 50
- **10,000 hours** → Level 70

### XP to Hours Conversion

**1 hour of practice = 100 XP**

This makes the system intuitive:
- 1 hour → 100 XP
- 10 hours → 1,000 XP
- 100 hours → 10,000 XP

### Skill Level Progression Formula (Current Implementation)

The existing `xpToNextPct()` function uses:

```javascript
function xpToNextPct(level, xp) {
  const need = Math.pow(level + 1, 1.7)
  const have = Math.pow(level, 1.7)
  const pct = ((xp/100 - have) / Math.max(0.001, (need - have))) * 100
  return pct
}
```

This power curve (`1.7`) provides:
- Fast early progression (motivation)
- Increasing time investment for higher levels (realistic mastery)

### Skill Categories & Biomes

Skills are organized into biomes on the worldboard:

| Biome | Category | Examples |
|-------|----------|----------|
| **Meadow** | Meta-skills (Foundation) | Retention, Discipline, Focus |
| **Forest** | Communication | Writing, Speaking, Active Listening |
| **Desert** | Resilience | Emotional Ambiguity, Stress Management |
| **Mist** | Creative | Drawing, Music, Creative Writing |
| **Tech** | Programming | JavaScript, Python, Algorithms |
| **Peaks** | Advanced/Specialized | System Design, Leadership |

---

## Daily Reflection System

### Purpose

Daily reflections are the **core loop** of relevel.me. They:
1. Award **global XP** (50-100 XP)
2. Build **meta-skills** (Discipline, Self-Awareness, Retention)
3. Create the habit of **intentional practice review**

### How Reflections Work

Every evening, users receive a call from **Artha** (AI agent) that:
- Reviews the day's skill practice
- Asks reflection questions
- Extracts insights from the conversation
- Awards XP based on engagement quality

### Reflection Quality Tiers

| Quality | XP Awarded | Criteria |
|---------|------------|----------|
| Quick check-in | 25 XP | < 2 min call, surface-level answers |
| Standard reflection | 50 XP | 3-5 min call, thoughtful responses |
| Deep reflection | 100 XP | 5+ min call, insights + action items |

### Meta-Skills Developed

Reflections specifically grow these three meta-skills:

1. **Discipline** (meadow biome)
   - +10 XP per daily reflection streak
   - Levels up every 30 consecutive days

2. **Knowledge Retention** (meadow biome)
   - +5 XP when recalling previous session content
   - Spaced repetition bonus

3. **Self-Awareness** (desert biome)
   - +15 XP for identifying emotional patterns
   - Grows with depth of reflection

### Integration with Evening Calls

The `calls` table tracks:
- Call completion status
- Transcript analysis (for quality assessment)
- Timestamp (for streak tracking)

After each successful call:
```sql
INSERT INTO reflections (user_id, call_id, quality_score, xp_awarded, meta_skills_xp)
VALUES (user_id, call_id, quality_score, base_xp * streak_multiplier, jsonb_object)
```

---

## Streak System

### Overview

Streaks reward **consistency** with **temporary XP multipliers** that boost all XP gains.

### Streak Types

| Streak Type | Description | Multiplier |
|-------------|-------------|------------|
| Reflection streak | Consecutive days with reflection | Primary |
| Practice streak | Days with any skill practice logged | Secondary |
| Combined streak | Both reflection + practice | Stacks |

### Multiplier Tiers

| Streak Length | Multiplier | Applied To |
|---------------|------------|------------|
| 0-6 days | 1.0× (baseline) | All XP |
| 7-13 days | 1.05× (+5%) | All XP |
| 14-29 days | 1.10× (+10%) | All XP |
| 30-59 days | 1.15× (+15%) | All XP |
| 60-99 days | 1.20× (+20%) | All XP |
| 100+ days | 1.25× (+25%) | All XP |

### Streak Milestones

Bonus XP awarded when hitting milestones (one-time):

| Milestone | Bonus XP | Reward |
|-----------|----------|--------|
| 7 days | 200 XP | Badge: "Week Warrior" |
| 30 days | 1,000 XP | Badge: "Monthly Master" |
| 100 days | 5,000 XP | Badge: "Century Sage" |
| 365 days | 25,000 XP | Badge: "Year of Growth" + special artifact |

### Streak Tracking

```sql
-- User table additions
ALTER TABLE users ADD COLUMN current_streak INT DEFAULT 0;
ALTER TABLE users ADD COLUMN longest_streak INT DEFAULT 0;
ALTER TABLE users ADD COLUMN last_reflection_date DATE;
```

**Logic:**
- Streak increments if reflection happens on `current_date`
- Streak resets to 0 if `last_reflection_date < current_date - 1`
- Streak freeze items can prevent one reset (artifact system)

### UI Indicators

- **HUD Badge**: Flame icon with streak count
- **Multiplier Display**: `+10% XP` shown during XP gain animations
- **Milestone Countdown**: "2 days until 30-day milestone!"

### Artifact: Sigil of Streaks

Already exists in the system:
```javascript
{ id: 'a2', name: 'Sigil of Streaks', effect: { streak_boost: 1 } }
```

**Enhanced Effect:** Grants 1 "streak freeze" — miss a day without losing streak.

---

## Hours Tracking & Skill Practice

### How Practice Hours Are Logged

Two methods:

1. **Manual Entry** (initial implementation)
   - User logs hours for a skill after practice session
   - Must specify: skill, duration, brief notes

2. **Automatic Tracking** (future)
   - Integration with time tracking tools (Toggl, RescueTime)
   - Code editor plugins (VS Code, JetBrains)
   - Mobile app with session timers

### Session Requirements

To prevent gaming the system:

| Requirement | Value | Reason |
|-------------|-------|--------|
| Minimum session | 15 minutes | Prevent spam logging |
| Maximum session | 8 hours | Cap daily gains |
| Daily cap per skill | 12 hours | Encourage breadth |
| Cool-down between sessions | 5 minutes | Prevent double-logging |

### Practice Quality Factors (Future)

Could incorporate quality multipliers:

- **Focused practice** (deliberate, uncomfortable): 1.2×
- **Passive practice** (maintenance, comfortable): 0.8×
- **With feedback/mentor**: 1.5×
- **Teaching others**: 1.3×

### Hours to XP Conversion

```javascript
function calculateSkillXP(hours, quality_multiplier = 1.0) {
  const base_xp = hours * 100
  const streak_multiplier = getStreakMultiplier(user.current_streak)
  return Math.floor(base_xp * quality_multiplier * streak_multiplier)
}
```

**Example:**
- Log 2 hours of JavaScript practice
- 7-day streak active (1.05× multiplier)
- XP awarded: `2 × 100 × 1.05 = 210 XP` to JavaScript skill

---

## Mathematical Formulas

### Global Level Formula

**XP required for next level:**
```
xp_needed = 100 × level^1.5
```

**Cumulative XP for level N:**
```
cumulative_xp = Σ(100 × i^1.5) for i = 1 to N-1
```

### Skill Level Formula (Hours-Based)

**Level from hours:**
```
level = floor(10 + 20 × log10(hours + 1))
```

**Hours needed for level:**
```
hours = 10^((level - 10) / 20) - 1
```

### Current Skill XP Progress (Existing Function)

```javascript
function xpToNextPct(level, xp) {
  const xp_needed_current = Math.pow(level, 1.7)
  const xp_needed_next = Math.pow(level + 1, 1.7)
  const progress = ((xp / 100) - xp_needed_current) / (xp_needed_next - xp_needed_current)
  return Math.max(0, Math.min(100, progress * 100))
}
```

### Streak Multiplier Formula

```javascript
function getStreakMultiplier(streak_days) {
  if (streak_days < 7) return 1.0
  if (streak_days < 14) return 1.05
  if (streak_days < 30) return 1.10
  if (streak_days < 60) return 1.15
  if (streak_days < 100) return 1.20
  return 1.25
}
```

### XP Award Formula (With All Modifiers)

```javascript
function calculateTotalXP(base_xp, user) {
  const streak_mult = getStreakMultiplier(user.current_streak)
  const artifact_mult = getArtifactMultiplier(user.active_artifacts)
  const meta_skill_bonus = getMetaSkillBonus(user.meta_skills)

  return Math.floor(base_xp * streak_mult * artifact_mult + meta_skill_bonus)
}
```

---

## Database Schema

### New Tables

#### `reflections` Table

```sql
CREATE TABLE reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  reflection_date DATE NOT NULL,
  duration_seconds INT, -- call duration
  quality_score DECIMAL(3, 2), -- 0.00 to 1.00
  xp_awarded INT NOT NULL,
  meta_skills_xp JSONB, -- {"discipline": 10, "retention": 5}
  streak_day INT, -- what day in streak was this?
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reflections_user_date ON reflections(user_id, reflection_date DESC);
```

#### `skills` Table

```sql
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- 'JS', 'RETENTION', etc.
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'Programming', 'Metaskill', etc.
  biome TEXT NOT NULL, -- 'meadow', 'tech', etc.
  description TEXT,
  is_meta_skill BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `user_skills` Table

```sql
CREATE TABLE user_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  level INT DEFAULT 1,
  xp INT DEFAULT 0,
  total_hours DECIMAL(10, 2) DEFAULT 0, -- total practice time
  discovered BOOLEAN DEFAULT FALSE, -- fog-of-war
  last_practiced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, skill_id)
);

CREATE INDEX idx_user_skills_user ON user_skills(user_id);
CREATE INDEX idx_user_skills_discovered ON user_skills(user_id, discovered);
```

#### `practice_sessions` Table

```sql
CREATE TABLE practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  duration_hours DECIMAL(10, 2) NOT NULL,
  xp_awarded INT NOT NULL,
  quality_multiplier DECIMAL(3, 2) DEFAULT 1.00,
  notes TEXT,
  session_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_practice_sessions_user_date ON practice_sessions(user_id, session_date DESC);
```

#### `artifacts` Table (Enhancement)

```sql
CREATE TABLE artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  effect JSONB NOT NULL, -- {"xp_multiplier": 1.05, "streak_freeze": 1}
  rarity TEXT, -- 'common', 'rare', 'legendary'
  unlock_condition JSONB, -- {"global_level": 10}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  artifact_id UUID REFERENCES artifacts(id) ON DELETE CASCADE,
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL = permanent
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, artifact_id)
);
```

### Updated `users` Table

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS global_level INT DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS global_xp INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_streak INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS longest_streak INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_reflection_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_practice_hours DECIMAL(10, 2) DEFAULT 0;
```

### Views for Analytics

```sql
CREATE VIEW user_progress_summary AS
SELECT
  u.id,
  u.name,
  u.global_level,
  u.global_xp,
  u.current_streak,
  u.total_practice_hours,
  COUNT(DISTINCT us.skill_id) as skills_discovered,
  AVG(us.level) as avg_skill_level
FROM users u
LEFT JOIN user_skills us ON u.id = us.user_id AND us.discovered = TRUE
GROUP BY u.id;
```

---

## Gamification Elements

### Skill Shrines (Existing System)

The worldboard displays skills as shrines positioned across biomes. Current implementation already includes:

- **Fog-of-war** — Undiscovered skills are hidden
- **Biome regions** — Visual grouping by category
- **Shrine glow** — Discovered skills have visual effects

### Checkpoints (Quest System)

Integration with existing checkpoint system:

```javascript
// Existing structure
interface Checkpoint {
  id: UUID
  user_id: UUID
  skill_id: UUID
  due_at: string
  status: 'pending' | 'completed' | 'missed'
  items_count?: number
}
```

**XP Rewards for Checkpoints:**
- Complete on time: `25 XP × skill_level`
- Complete early: `+50% bonus`
- Complete late: `-25% penalty`

### Artifacts (Power-Ups)

Existing artifacts system can be enhanced:

| Artifact | Effect | Unlock Condition |
|----------|--------|------------------|
| Notebook of Clarity | +5% retention XP | Complete 10 reflections |
| Sigil of Streaks | Streak freeze × 1 | 7-day streak |
| Hourglass of Focus | +10% skill XP for 1 day | Global level 10 |
| Mentor's Compass | Share skills with others | Global level 30 |
| Artha's Echo | +25% all XP, custom title | Global level 100 |

### Titles & Badges

Earned through milestones:

**Titles (displayed on profile):**
- "The Novice" (default)
- "The Dedicated" (30-day streak)
- "The Polymath" (10 skills at level 20+)
- "The Master" (1 skill at level 70+)
- "Artha's Reflection" (level 100)

**Badges (shown in achievements):**
- Streak milestones (7, 30, 100, 365 days)
- Skill mastery tiers
- Total hours milestones (100h, 1000h, 10000h)
- Reflection quality achievements

### Social Features (Future)

- **Leaderboards** — Weekly practice hours, longest streaks
- **Skill Sharing** — Share your skill trees with others
- **Mentorship** — High-level users can guide beginners
- **Guilds** — Group challenges and shared goals

---

## Implementation Roadmap

### Phase 1: Core Tracking (MVP)

**Goal:** Get the basic dual XP system working

**Tasks:**
1. Create database migrations for new tables
2. Implement practice session logging API
3. Add hours → XP conversion logic
4. Update UI to show both global + skill XP
5. Basic level-up animations

**Duration:** 2-3 weeks

**Success Criteria:**
- Users can log practice hours
- XP updates correctly for skills and global level
- Dashboard shows accurate progress

---

### Phase 2: Reflection Integration

**Goal:** Connect evening calls to XP system

**Tasks:**
1. Add reflection quality scoring (call transcript analysis)
2. Award global XP after each call
3. Build meta-skill tracking (Discipline, Retention, Self-Awareness)
4. Create reflection history view
5. Add reflection reminders/notifications

**Duration:** 2 weeks

**Success Criteria:**
- Reflections award 50-100 global XP
- Meta-skills level up based on reflection consistency
- Users can see reflection history

---

### Phase 3: Streaks & Multipliers

**Goal:** Reward consistency

**Tasks:**
1. Implement streak tracking (reflection + practice)
2. Add XP multipliers based on streak length
3. Build streak milestone rewards
4. Create visual streak indicators (flame icon, countdown)
5. Add streak freeze mechanism (via artifacts)

**Duration:** 1-2 weeks

**Success Criteria:**
- Streaks calculate correctly
- Multipliers apply to all XP gains
- Milestone bonuses awarded automatically

---

### Phase 4: Advanced Features

**Goal:** Polish the gamification

**Tasks:**
1. Expand artifact system (more power-ups)
2. Add titles and badges
3. Build achievements page
4. Implement unlock conditions for skills
5. Create analytics dashboard (progress over time)
6. Add social features (leaderboards, sharing)

**Duration:** 3-4 weeks

**Success Criteria:**
- Full artifact collection available
- Users earn titles and badges
- Analytics provide insights
- (Optional) Social features functional

---

### Phase 5: Automation & Refinement

**Goal:** Reduce friction, improve accuracy

**Tasks:**
1. Integrate automatic time tracking (editor plugins, APIs)
2. Add quality multipliers for practice
3. Build spaced repetition system for checkpoints
4. Implement skill recommendations (ML)
5. Performance optimization for large skill trees

**Duration:** Ongoing

**Success Criteria:**
- Less manual logging required
- Practice quality affects XP
- System scales to 100+ skills per user

---

## Appendix A: Example User Journey

### Week 1: The Beginner

- **Day 1:** Signs up, starts with 3 discovered skills (Retention, Discipline, JavaScript)
- **Day 1 Evening:** First call with Artha → 50 global XP awarded
- **Day 2:** Logs 2 hours of JavaScript practice → 200 skill XP
- **Day 7:** Completes 7-day reflection streak → 200 bonus XP + "Week Warrior" badge

**Progress:**
- Global: Level 2 (150 XP)
- JavaScript: Level 12 (1,400 XP from 14 hours)
- Streak: 7 days (1.05× multiplier active)

---

### Month 1: Building Momentum

- **Day 30:** Hits 30-day streak → 1,000 bonus XP + "Monthly Master" badge
- **Total Practice:** 60 hours across 5 skills
- **Meta-Skills:** Discipline level 3, Retention level 2

**Progress:**
- Global: Level 8 (4,200 XP)
- JavaScript: Level 25 (6,000 XP from 60 hours)
- Streak: 30 days (1.15× multiplier)
- Unlocked: Artifact system (global level 10 reached)

---

### Year 1: The Committed Learner

- **Day 365:** Completes year-long streak → 25,000 bonus XP + special artifact
- **Total Practice:** 800 hours (averaging 2.2 hours/day)
- **Skills Mastered:** 3 skills at Advanced tier (1,000+ hours each)

**Progress:**
- Global: Level 42 (125,000 XP)
- Top Skill: JavaScript Level 52 (10,000 XP from 1,200 hours)
- Streak: 365 days (1.25× multiplier)
- Title: "Artha's Dedicated Scholar"

---

## Appendix B: Comparison with Other Systems

| System | Focus | Progression | Strengths | Weaknesses |
|--------|-------|-------------|-----------|------------|
| **Duolingo** | Language learning | XP per lesson, daily streaks | Highly addictive, clear goals | Shallow learning, gamification over mastery |
| **Habitica** | Habit tracking | XP for completing tasks | Flexible, RPG elements | No skill depth, arbitrary XP |
| **Codewars** | Coding challenges | Kata points, rank system | Skill-based, competitive | Limited scope, no time tracking |
| **relevel.me** | Holistic skill mastery | Dual XP (global + skill), hours-based | Mastery-focused, reflection integration, clear progression | Complex system, requires consistency |

**Key Differentiators:**
- **Hours-based progression** ties XP to real practice time
- **Reflection integration** encourages meta-cognition
- **Dual XP system** balances breadth (global) and depth (skills)
- **10,000-hour model** provides realistic long-term goals

---

## Appendix C: Anti-Gaming Measures

### Potential Exploits

1. **Logging fake hours**
   - *Mitigation:* Require session notes, implement spot checks via reflections

2. **Multiple accounts for artifacts**
   - *Mitigation:* Artifacts are non-transferable, tied to auth_user_id

3. **Streak farming with minimal effort**
   - *Mitigation:* Quality scoring on reflections, minimum session durations

4. **Macro/automation for XP gains**
   - *Mitigation:* CAPTCHA on high-frequency actions, anomaly detection

### Fairness Principles

- **No pay-to-win** — All XP must be earned through practice/reflection
- **Transparent formulas** — Users can calculate their own progression
- **Mistakes forgiven** — Grace periods, streak freezes for rare misses
- **Focus on growth** — Leaderboards optional, emphasis on personal bests

---

## Conclusion

This XP system balances **gamification** with **genuine skill development**. By tying progression to actual practice hours and reflections, relevel.me creates a sustainable, long-term growth framework.

The dual XP model ensures users develop both:
- **Breadth** through global levels and meta-skills
- **Depth** through skill-specific mastery

With streaks, artifacts, and clear progression paths, the system motivates consistency while maintaining transparency and fairness.

**Next steps:** Review this document with the team, prioritize Phase 1 features, and begin database migrations.

---

**Document Status:** ✅ Ready for Implementation
**Feedback:** Please add comments or questions in the Issues section
