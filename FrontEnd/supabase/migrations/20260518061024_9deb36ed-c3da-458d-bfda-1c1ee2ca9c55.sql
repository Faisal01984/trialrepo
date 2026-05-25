
-- Security definer helpers to avoid RLS recursion between lessons <-> profiles
CREATE OR REPLACE FUNCTION public.get_assigned_grade(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT assigned_grade FROM public.profiles WHERE id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.is_special_class(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(special_class, false) FROM public.profiles WHERE id = _user_id
$$;

DROP POLICY IF EXISTS "Lessons visible by audience" ON public.lessons;

CREATE POLICY "Lessons visible by audience"
ON public.lessons
FOR SELECT
TO authenticated
USING (
  teacher_id = auth.uid()
  OR target_grade = 'All'
  OR target_grade = public.get_assigned_grade(auth.uid())
  OR (target_grade = 'AI Class' AND public.is_special_class(auth.uid()))
);
