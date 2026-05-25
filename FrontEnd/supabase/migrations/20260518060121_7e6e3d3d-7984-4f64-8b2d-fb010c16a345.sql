-- Profile fields for student grade/class
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS assigned_grade text,
  ADD COLUMN IF NOT EXISTS special_class boolean NOT NULL DEFAULT false;

-- roll_number already exists; add a uniqueness constraint when populated
CREATE UNIQUE INDEX IF NOT EXISTS profiles_roll_number_unique
  ON public.profiles(roll_number)
  WHERE roll_number IS NOT NULL;

-- Lessons: target audience
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS target_grade text NOT NULL DEFAULT 'All';

-- Tighten lesson visibility: teachers see their own, students see matching audience
DROP POLICY IF EXISTS "Authenticated can view lessons" ON public.lessons;

CREATE POLICY "Lessons visible by audience"
ON public.lessons
FOR SELECT
TO authenticated
USING (
  teacher_id = auth.uid()
  OR target_grade = 'All'
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        (lessons.target_grade = p.assigned_grade)
        OR (lessons.target_grade = 'AI Class' AND p.special_class = true)
      )
  )
);
