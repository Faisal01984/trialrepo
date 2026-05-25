-- Prevent students from self-escalating grade / AI Class enrollment.
-- Only teachers or service_role may change these fields after the row is created.
CREATE OR REPLACE FUNCTION public.prevent_grade_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role bypasses (auth.uid() IS NULL for service-role calls)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Teachers can edit any student's grade fields
  IF public.has_role(auth.uid(), 'teacher') THEN
    RETURN NEW;
  END IF;

  -- For everyone else, disallow changes to assigned_grade / special_class
  IF NEW.assigned_grade IS DISTINCT FROM OLD.assigned_grade THEN
    RAISE EXCEPTION 'Changing assigned_grade is not permitted. Contact your teacher.'
      USING ERRCODE = '42501';
  END IF;
  IF NEW.special_class IS DISTINCT FROM OLD.special_class THEN
    RAISE EXCEPTION 'Changing AI Class enrollment is not permitted. Contact your teacher.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_grade_self_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_grade_self_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_grade_self_escalation();

-- Allow teachers to update any student's profile grade fields via RLS
CREATE POLICY "Teachers update student grade fields"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'teacher'))
WITH CHECK (public.has_role(auth.uid(), 'teacher'));
