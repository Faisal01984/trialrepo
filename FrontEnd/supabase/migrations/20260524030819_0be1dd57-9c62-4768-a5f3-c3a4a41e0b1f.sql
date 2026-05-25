
-- =========================================================
-- 1) Harden handle_new_user: always default to 'student'
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _level text;
  _ai_class boolean;
BEGIN
  _level := NULLIF(NEW.raw_user_meta_data->>'assigned_grade', '');
  IF _level IS NOT NULL AND _level NOT IN ('Beginner','Intermediate','Advanced') THEN
    _level := NULL;
  END IF;
  _ai_class := COALESCE((NEW.raw_user_meta_data->>'special_class')::boolean, false);

  INSERT INTO public.profiles (id, full_name, assigned_grade, special_class)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), _level, _ai_class);

  -- Always student; teacher promotion must happen out-of-band
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$function$;

-- =========================================================
-- 2) user_roles: block any write by authenticated users
-- =========================================================
DROP POLICY IF EXISTS "Deny role inserts" ON public.user_roles;
DROP POLICY IF EXISTS "Deny role updates" ON public.user_roles;
DROP POLICY IF EXISTS "Deny role deletes" ON public.user_roles;

CREATE POLICY "Deny role inserts" ON public.user_roles
  AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Deny role updates" ON public.user_roles
  AS RESTRICTIVE FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny role deletes" ON public.user_roles
  AS RESTRICTIVE FOR DELETE TO authenticated USING (false);

REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated, anon;

-- =========================================================
-- 3) Notifications tables (previously referenced but missing)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  lesson_id uuid,
  lesson_title text,
  subject text,
  target_level text,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.student_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notification_id, student_id)
);
ALTER TABLE public.student_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers insert own notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = teacher_id AND public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Teachers view own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = teacher_id);
CREATE POLICY "Students view received notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.student_notifications sn
    WHERE sn.notification_id = notifications.id AND sn.student_id = auth.uid()
  ));

CREATE POLICY "Teachers insert student_notifications for own" ON public.student_notifications
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.id = notification_id AND n.teacher_id = auth.uid()
  ));
CREATE POLICY "Students view own student_notifications" ON public.student_notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = student_id);
CREATE POLICY "Students update own student_notifications" ON public.student_notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

-- =========================================================
-- 4) Move webhook_url to teacher_integrations
-- =========================================================
CREATE TABLE IF NOT EXISTS public.teacher_integrations (
  teacher_id uuid PRIMARY KEY,
  webhook_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.teacher_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers view own integrations" ON public.teacher_integrations
  FOR SELECT TO authenticated USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers insert own integrations" ON public.teacher_integrations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = teacher_id AND public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Teachers update own integrations" ON public.teacher_integrations
  FOR UPDATE TO authenticated
  USING (auth.uid() = teacher_id AND public.has_role(auth.uid(), 'teacher'))
  WITH CHECK (auth.uid() = teacher_id AND public.has_role(auth.uid(), 'teacher'));

INSERT INTO public.teacher_integrations (teacher_id, webhook_url)
SELECT id, webhook_url FROM public.profiles WHERE webhook_url IS NOT NULL
ON CONFLICT (teacher_id) DO NOTHING;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS webhook_url;

-- =========================================================
-- 5) Tighten profile teacher-view policies
-- =========================================================
DROP POLICY IF EXISTS "Teachers view student profiles via homework" ON public.profiles;
DROP POLICY IF EXISTS "Teachers view student profiles via quiz attempts" ON public.profiles;

CREATE OR REPLACE FUNCTION public.get_lesson_students(_lesson_id uuid)
RETURNS TABLE(id uuid, full_name text, roll_number text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.roll_number
  FROM public.profiles p
  WHERE EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.id = _lesson_id AND l.teacher_id = auth.uid()
  ) AND (
    EXISTS (SELECT 1 FROM public.homework_submissions hs WHERE hs.lesson_id = _lesson_id AND hs.student_id = p.id)
    OR EXISTS (SELECT 1 FROM public.quiz_attempts qa WHERE qa.lesson_id = _lesson_id AND qa.student_id = p.id)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_students_by_level(_level text)
RETURNS TABLE(id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'teacher')
    AND (
      _level = 'All'
      OR p.assigned_grade = _level
      OR (_level = 'AI Class' AND p.special_class = true)
    );
$$;

-- =========================================================
-- 6) Homework storage: only teachers of the lesson
-- =========================================================
DROP POLICY IF EXISTS "Teachers read student homework" ON storage.objects;

CREATE POLICY "Teachers read homework for own lessons" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'homework'
    AND public.has_role(auth.uid(), 'teacher')
    AND EXISTS (
      SELECT 1
      FROM public.homework_submissions hs
      JOIN public.lessons l ON l.id = hs.lesson_id
      WHERE hs.file_path = name AND l.teacher_id = auth.uid()
    )
  );

-- =========================================================
-- 7) Server-side quiz grading via BEFORE INSERT trigger
-- =========================================================
ALTER TABLE public.quiz_attempts
  DROP CONSTRAINT IF EXISTS quiz_attempts_score_valid;
ALTER TABLE public.quiz_attempts
  ADD CONSTRAINT quiz_attempts_score_valid CHECK (score >= 0 AND total >= 0 AND score <= total);

CREATE OR REPLACE FUNCTION public.recompute_quiz_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  quiz jsonb;
  q jsonb;
  i int := 0;
  s int := 0;
  ans jsonb;
  ans_int int;
  expected text;
  user_txt text;
  matched int;
  kw_total int;
  kws text[];
  k text;
BEGIN
  SELECT content->'quiz' INTO quiz FROM public.lessons WHERE id = NEW.lesson_id;
  IF quiz IS NULL OR jsonb_typeof(quiz) <> 'array' THEN
    NEW.score := 0;
    NEW.total := 0;
    RETURN NEW;
  END IF;

  FOR q IN SELECT * FROM jsonb_array_elements(quiz) LOOP
    ans := NEW.answers -> i;
    IF q->>'type' = 'mcq' THEN
      BEGIN
        ans_int := (ans #>> '{}')::int;
      EXCEPTION WHEN OTHERS THEN
        ans_int := NULL;
      END;
      IF ans_int IS NOT NULL AND ans_int = (q->>'answerIndex')::int THEN
        s := s + 1;
      END IF;
    ELSE
      user_txt := lower(coalesce(ans #>> '{}', ''));
      SELECT array_agg(lower(value)) INTO kws
        FROM jsonb_array_elements_text(coalesce(q->'keywords','[]'::jsonb));
      kw_total := coalesce(array_length(kws, 1), 0);
      IF kw_total = 0 THEN
        expected := lower(coalesce(q->>'expectedAnswer',''));
        IF expected <> '' AND position(expected in user_txt) > 0 THEN
          s := s + 1;
        END IF;
      ELSE
        matched := 0;
        FOREACH k IN ARRAY kws LOOP
          IF k <> '' AND position(k in user_txt) > 0 THEN
            matched := matched + 1;
          END IF;
        END LOOP;
        IF matched::float / kw_total >= 0.6 THEN
          s := s + 1;
        END IF;
      END IF;
    END IF;
    i := i + 1;
  END LOOP;

  NEW.score := s;
  NEW.total := jsonb_array_length(quiz);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quiz_attempts_recompute_score ON public.quiz_attempts;
CREATE TRIGGER quiz_attempts_recompute_score
  BEFORE INSERT ON public.quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION public.recompute_quiz_score();

-- =========================================================
-- 8) Strip answer keys for non-teacher lesson reads
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_lesson_for_viewer(_lesson_id uuid)
RETURNS public.lessons
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.lessons;
  content jsonb;
  quiz jsonb;
  new_quiz jsonb := '[]'::jsonb;
  q jsonb;
  ws jsonb;
BEGIN
  SELECT * INTO row FROM public.lessons WHERE id = _lesson_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF NOT (
    row.teacher_id = auth.uid()
    OR row.target_grade = 'All'
    OR row.target_grade = public.get_assigned_grade(auth.uid())
    OR (row.target_grade = 'AI Class' AND public.is_special_class(auth.uid()))
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  -- Teachers (owners) see everything
  IF row.teacher_id = auth.uid() THEN
    RETURN row;
  END IF;

  content := coalesce(row.content, '{}'::jsonb);
  content := content - 'answerKey';

  quiz := content->'quiz';
  IF quiz IS NOT NULL AND jsonb_typeof(quiz) = 'array' THEN
    FOR q IN SELECT * FROM jsonb_array_elements(quiz) LOOP
      q := q - 'answerIndex' - 'expectedAnswer' - 'keywords' - 'explanation' - 'rubric';
      new_quiz := new_quiz || jsonb_build_array(q);
    END LOOP;
    content := jsonb_set(content, '{quiz}', new_quiz);
  END IF;

  ws := content->'worksheet';
  IF ws IS NOT NULL THEN
    IF ws ? 'fillInBlanks' AND jsonb_typeof(ws->'fillInBlanks') = 'array' THEN
      content := jsonb_set(content, '{worksheet,fillInBlanks}',
        coalesce((SELECT jsonb_agg(item - 'answer') FROM jsonb_array_elements(ws->'fillInBlanks') item), '[]'::jsonb));
    END IF;
    IF ws ? 'trueOrFalse' AND jsonb_typeof(ws->'trueOrFalse') = 'array' THEN
      content := jsonb_set(content, '{worksheet,trueOrFalse}',
        coalesce((SELECT jsonb_agg(item - 'answer') FROM jsonb_array_elements(ws->'trueOrFalse') item), '[]'::jsonb));
    END IF;
    IF ws ? 'shortAnswer' AND jsonb_typeof(ws->'shortAnswer') = 'array' THEN
      content := jsonb_set(content, '{worksheet,shortAnswer}',
        coalesce((SELECT jsonb_agg(item - 'answer') FROM jsonb_array_elements(ws->'shortAnswer') item), '[]'::jsonb));
    END IF;
  END IF;

  row.content := content;
  RETURN row;
END;
$$;
