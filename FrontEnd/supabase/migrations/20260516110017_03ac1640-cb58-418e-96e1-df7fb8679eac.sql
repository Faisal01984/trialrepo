ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS roll_number text;

-- Allow teachers to view student profiles for lessons they own (to see who submitted quiz attempts)
CREATE POLICY "Teachers view student profiles via quiz attempts"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_attempts qa
    JOIN public.lessons l ON l.id = qa.lesson_id
    WHERE qa.student_id = profiles.id AND l.teacher_id = auth.uid()
  )
);