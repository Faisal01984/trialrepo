-- Ensure quiz scores are computed server-side from answers.
DROP TRIGGER IF EXISTS quiz_attempts_recompute_score ON public.quiz_attempts;
CREATE TRIGGER quiz_attempts_recompute_score
BEFORE INSERT OR UPDATE ON public.quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION public.recompute_quiz_score();

-- Ensure student level / AI Class enrollment cannot be self-edited.
DROP TRIGGER IF EXISTS profiles_prevent_grade_self_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_grade_self_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_grade_self_escalation();

-- Make protected profile columns non-updatable through ordinary authenticated client writes.
REVOKE UPDATE (assigned_grade, special_class) ON public.profiles FROM authenticated, anon;