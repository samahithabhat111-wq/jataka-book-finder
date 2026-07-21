
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE public.app_role AS ENUM ('admin', 'astrologer');
CREATE TYPE public.jataka_status AS ENUM ('preparing', 'ready', 'collected');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "user_roles_admin_manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.jatakas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jataka_number TEXT NOT NULL UNIQUE,
  client_name TEXT,
  date_of_birth DATE NOT NULL,
  time_of_birth TIME NOT NULL,
  father_name TEXT,
  mother_name TEXT,
  phone TEXT,
  place TEXT,
  status public.jataka_status NOT NULL DEFAULT 'preparing',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jatakas TO authenticated;
GRANT ALL ON public.jatakas TO service_role;
ALTER TABLE public.jatakas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jatakas_select_auth" ON public.jatakas FOR SELECT TO authenticated USING (true);
CREATE POLICY "jatakas_admin_insert" ON public.jatakas FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "jatakas_admin_update" ON public.jatakas FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "jatakas_admin_delete" ON public.jatakas FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX jatakas_jataka_number_trgm ON public.jatakas USING gin (jataka_number gin_trgm_ops);
CREATE INDEX jatakas_client_name_trgm ON public.jatakas USING gin (client_name gin_trgm_ops);
CREATE INDEX jatakas_phone_trgm ON public.jatakas USING gin (phone gin_trgm_ops);
CREATE INDEX jatakas_father_trgm ON public.jatakas USING gin (father_name gin_trgm_ops);
CREATE INDEX jatakas_mother_trgm ON public.jatakas USING gin (mother_name gin_trgm_ops);
CREATE INDEX jatakas_place_trgm ON public.jatakas USING gin (place gin_trgm_ops);
CREATE INDEX jatakas_created_at_idx ON public.jatakas (created_at DESC);
CREATE INDEX jatakas_dob_idx ON public.jatakas (date_of_birth);
CREATE INDEX jatakas_status_idx ON public.jatakas (status);

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER jatakas_set_updated_at BEFORE UPDATE ON public.jatakas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE is_first BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO is_first;
  IF is_first THEN INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'astrologer');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
