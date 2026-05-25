-- Revoke EXECUTE from authenticated/anon/public on internal SECURITY DEFINER functions
-- These are used internally (in RLS policies or triggers) and should not be invokable via PostgREST.

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_special_class(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_assigned_grade(uuid) FROM PUBLIC, anon, authenticated;

-- Trigger functions: must never be invoked directly
REVOKE EXECUTE ON FUNCTION public.recompute_quiz_score() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_grade_self_escalation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- Teacher-only RPCs: keep authenticated EXECUTE (they self-check teacher role),
-- but revoke from anon explicitly for clarity.
REVOKE EXECUTE ON FUNCTION public.get_teacher_progress() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_students_by_level(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_student_level(uuid, text, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_lesson_students(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_lesson_full(uuid) FROM PUBLIC, anon;

-- Viewer RPCs: keep authenticated (students + teachers use them), revoke anon
REVOKE EXECUTE ON FUNCTION public.get_lesson_for_viewer(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_lessons_for_viewer() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.count_lessons_for_viewer() FROM PUBLIC, anon;