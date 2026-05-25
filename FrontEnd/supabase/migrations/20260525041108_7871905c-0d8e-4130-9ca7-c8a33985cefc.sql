-- Tighten direct lesson table reads: students must use sanitized RPCs for lesson content/metadata.
DROP POLICY IF EXISTS "Lessons visible by audience" ON public.lessons;
DROP POLICY IF EXISTS "Teachers view own lessons" ON public.lessons;

CREATE POLICY "Teachers view own lessons"
ON public.lessons
FOR SELECT
TO authenticated
USING (
  auth.uid() = teacher_id
  AND public.has_role(auth.uid(), 'teacher'::public.app_role)
);

-- Keep answer-key-bearing content inaccessible through direct table column reads.
REVOKE SELECT ON public.lessons FROM authenticated, anon;
REVOKE SELECT (content) ON public.lessons FROM authenticated, anon;
GRANT SELECT (
  id, teacher_id, title, subject, grade, topic, objectives,
  difficulty, language, duration, target_grade, created_at, updated_at
) ON public.lessons TO authenticated;

-- Safe metadata listing for dashboards/library. This never returns the content JSON.
CREATE OR REPLACE FUNCTION public.list_lessons_for_viewer()
RETURNS TABLE (
  id uuid,
  teacher_id uuid,
  title text,
  subject text,
  grade text,
  topic text,
  duration integer,
  objectives text,
  difficulty text,
  language text,
  target_grade text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    l.id,
    l.teacher_id,
    l.title,
    l.subject,
    l.grade,
    l.topic,
    l.duration,
    l.objectives,
    l.difficulty,
    l.language,
    l.target_grade,
    l.created_at,
    l.updated_at
  FROM public.lessons l
  WHERE
    (
      public.has_role(auth.uid(), 'teacher'::public.app_role)
      AND l.teacher_id = auth.uid()
    )
    OR
    (
      NOT public.has_role(auth.uid(), 'teacher'::public.app_role)
      AND (
        l.target_grade = 'All'
        OR l.target_grade = public.get_assigned_grade(auth.uid())
        OR (l.target_grade = 'AI Class' AND public.is_special_class(auth.uid()))
      )
    )
  ORDER BY l.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.count_lessons_for_viewer()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*) FROM public.list_lessons_for_viewer();
$$;

-- Harden full-content functions with an explicit teacher role check for owner-only full content.
CREATE OR REPLACE FUNCTION public.get_lesson_full(_lesson_id uuid)
RETURNS public.lessons
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.lessons
  WHERE id = _lesson_id
    AND teacher_id = auth.uid()
    AND public.has_role(auth.uid(), 'teacher'::public.app_role);
$$;

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
  viewer uuid := auth.uid();
  viewer_is_teacher boolean := public.has_role(auth.uid(), 'teacher'::public.app_role);
BEGIN
  SELECT * INTO row FROM public.lessons WHERE id = _lesson_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF viewer IS NULL OR NOT (
    (viewer_is_teacher AND row.teacher_id = viewer)
    OR row.target_grade = 'All'
    OR row.target_grade = public.get_assigned_grade(viewer)
    OR (row.target_grade = 'AI Class' AND public.is_special_class(viewer))
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  -- Teacher owners see the complete content, including answer keys.
  IF viewer_is_teacher AND row.teacher_id = viewer THEN
    RETURN row;
  END IF;

  -- Students receive lesson content with answer keys and grading rubrics removed.
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

REVOKE ALL ON FUNCTION public.list_lessons_for_viewer() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.count_lessons_for_viewer() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_lesson_full(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_lesson_for_viewer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_lessons_for_viewer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_lessons_for_viewer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lesson_full(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lesson_for_viewer(uuid) TO authenticated;

-- Require the teacher role on webhook URL reads, matching insert/update policy strength.
DROP POLICY IF EXISTS "Teachers view own integrations" ON public.teacher_integrations;
CREATE POLICY "Teachers view own integrations"
ON public.teacher_integrations
FOR SELECT
TO authenticated
USING (
  auth.uid() = teacher_id
  AND public.has_role(auth.uid(), 'teacher'::public.app_role)
);