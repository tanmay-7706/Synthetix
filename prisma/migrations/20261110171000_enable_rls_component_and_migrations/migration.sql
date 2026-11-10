-- Record default-deny Row-Level Security across all five public tables (matching live Supabase state)
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Workspace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Version" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Component" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
