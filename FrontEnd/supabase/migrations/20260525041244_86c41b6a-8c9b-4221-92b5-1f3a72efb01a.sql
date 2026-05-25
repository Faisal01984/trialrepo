-- Remove default public EXECUTE access from SECURITY DEFINER helpers.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_assigned_grade(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_special_class(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_student_level(uuid, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_lesson_for_viewer(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.recompute_quiz_score() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.prevent_grade_self_escalation() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_teacher_progress() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_lesson_students(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_students_by_level(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_lesson_full(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_lessons_for_viewer() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.count_lessons_for_viewer() FROM PUBLIC, anon;

-- Signed-in app users may execute the specific helpers used by RLS policies and app RPC calls.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_assigned_grade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_special_class(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_student_level(uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lesson_for_viewer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_progress() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lesson_students(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_students_by_level(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lesson_full(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_lessons_for_viewer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_lessons_for_viewer() TO authenticated;