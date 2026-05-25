
-- Role enum + table
CREATE TYPE public.app_role AS ENUM ('teacher', 'student');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  webhook_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Auto-create profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'student');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Lessons
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  topic TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 45,
  objectives TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  language TEXT NOT NULL DEFAULT 'English',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE INDEX lessons_teacher_idx ON public.lessons(teacher_id);
CREATE INDEX lessons_created_idx ON public.lessons(created_at DESC);

CREATE POLICY "Authenticated can view lessons" ON public.lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers insert own lessons" ON public.lessons FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = teacher_id AND public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Teachers update own lessons" ON public.lessons FOR UPDATE TO authenticated
  USING (auth.uid() = teacher_id AND public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Teachers delete own lessons" ON public.lessons FOR DELETE TO authenticated
  USING (auth.uid() = teacher_id AND public.has_role(auth.uid(), 'teacher'));

-- Quiz attempts
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  score INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX qa_student_idx ON public.quiz_attempts(student_id);
CREATE INDEX qa_lesson_idx ON public.quiz_attempts(lesson_id);

CREATE POLICY "Students insert own attempts" ON public.quiz_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students view own attempts" ON public.quiz_attempts FOR SELECT TO authenticated
  USING (auth.uid() = student_id OR EXISTS (
    SELECT 1 FROM public.lessons l WHERE l.id = lesson_id AND l.teacher_id = auth.uid()
  ));

-- Homework submissions
CREATE TABLE public.homework_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
CREATE INDEX hs_student_idx ON public.homework_submissions(student_id);
CREATE INDEX hs_lesson_idx ON public.homework_submissions(lesson_id);

CREATE POLICY "Students insert own submissions" ON public.homework_submissions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students view own submissions" ON public.homework_submissions FOR SELECT TO authenticated
  USING (auth.uid() = student_id OR EXISTS (
    SELECT 1 FROM public.lessons l WHERE l.id = lesson_id AND l.teacher_id = auth.uid()
  ));
CREATE POLICY "Students delete own submissions" ON public.homework_submissions FOR DELETE TO authenticated
  USING (auth.uid() = student_id);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('homework', 'homework', false);

CREATE POLICY "Students upload own homework" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'homework' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users read own homework" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'homework' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Teachers read student homework" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'homework' AND public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Students delete own homework" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'homework' AND auth.uid()::text = (storage.foldername(name))[1]);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER lessons_touch BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
