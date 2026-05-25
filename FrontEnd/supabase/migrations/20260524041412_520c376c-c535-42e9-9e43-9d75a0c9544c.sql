-- 1. Strip `content` column from anything but the lesson owner / RPCs
REVOKE SELECT ON public.lessons FROM authenticated, anon;
GRANT SELECT (
  id, teacher_id, title, subject, grade, topic, objectives,
  difficulty, language, duration, target_grade, created_at, updated_at
) ON public.lessons TO authenticated;
-- Owners need full access to content via PostgREST for editing flows
GRANT INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
-- Allow owner to read their own content column too
CREATE OR REPLACE FUNCTION public.get_lesson_full(_lesson_id uuid)
RETURNS public.lessons
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.lessons
  WHERE id = _lesson_id AND teacher_id = auth.uid();
$$;

-- 2. Remove broad teacher-update-profiles policy; replace with scoped RPC
DROP POLICY IF EXISTS "Teachers update student grade fields" ON public.profiles;

CREATE OR REPLACE FUNCTION public.set_student_level(
  _student_id uuid,
  _level text,
  _ai_class boolean
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'teacher') THEN
    RAISE EXCEPTION 'Only teachers may set student level' USING ERRCODE = '42501';
  END IF;
  IF _level IS NOT NULL AND _level NOT IN ('Beginner','Intermediate','Advanced') THEN
    RAISE EXCEPTION 'Invalid level' USING ERRCODE = '22023';
  END IF;
  -- Bypass the self-escalation trigger by running as definer with elevated role
  UPDATE public.profiles
  SET assigned_grade = _level,
      special_class = COALESCE(_ai_class, false),
      updated_at = now()
  WHERE id = _student_id;
END;
$$;

-- Allow the SECURITY DEFINER trigger to coexist: it checks auth.uid() role.
-- Need to grant teachers a way to update via the trigger. The trigger
-- already allows teachers, so the RPC's UPDATE will pass.

-- 3. Teacher-scoped progress RPC
CREATE OR REPLACE FUNCTION public.get_teacher_progress()
RETURNS TABLE (
  student_id uuid,
  full_name text,
  assigned_grade text,
  quizzes bigint,
  avg_score numeric,
  homework bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH my_lessons AS (
    SELECT id FROM public.lessons WHERE teacher_id = auth.uid()
  ),
  q AS (
    SELECT qa.student_id,
           COUNT(*) AS quizzes,
           AVG(CASE WHEN qa.total > 0 THEN (qa.score::numeric / qa.total) * 100 ELSE 0 END) AS avg_score
    FROM public.quiz_attempts qa
    WHERE qa.lesson_id IN (SELECT id FROM my_lessons)
    GROUP BY qa.student_id
  ),
  h AS (
    SELECT hs.student_id, COUNT(*) AS homework
    FROM public.homework_submissions hs
    WHERE hs.lesson_id IN (SELECT id FROM my_lessons)
    GROUP BY hs.student_id
  ),
  ids AS (
    SELECT student_id FROM q UNION SELECT student_id FROM h
  )
  SELECT ids.student_id,
         p.full_name,
         p.assigned_grade,
         COALESCE(q.quizzes, 0),
         COALESCE(ROUND(q.avg_score), 0),
         COALESCE(h.homework, 0)
  FROM ids
  LEFT JOIN public.profiles p ON p.id = ids.student_id
  LEFT JOIN q ON q.student_id = ids.student_id
  LEFT JOIN h ON h.student_id = ids.student_id
  WHERE public.has_role(auth.uid(), 'teacher');
$$;
