
-- Normalize existing data to the new skill-based level system
UPDATE public.lessons
SET target_grade = 'All'
WHERE target_grade NOT IN ('Beginner','Intermediate','Advanced','AI Class','All');

UPDATE public.profiles
SET assigned_grade = NULL
WHERE assigned_grade IS NOT NULL
  AND assigned_grade NOT IN ('Beginner','Intermediate','Advanced');

-- Update the new-user trigger to capture level + AI class from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role public.app_role;
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

  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'student');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  RETURN NEW;
END;
$function$;
