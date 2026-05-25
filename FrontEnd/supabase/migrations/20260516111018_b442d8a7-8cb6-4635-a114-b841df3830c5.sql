CREATE POLICY "Teachers view student profiles via homework"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.homework_submissions hs
    JOIN public.lessons l ON l.id = hs.lesson_id
    WHERE hs.student_id = profiles.id AND l.teacher_id = auth.uid()
  )
);