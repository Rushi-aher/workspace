


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."create_user_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    -- Create a profile with a random identifier.
    INSERT INTO public.profiles (
        id,
        member_code,
        full_name
    )
    VALUES (
        NEW.id,
        'MEM-' || upper(
            substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)
        ),
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_user_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_workspace_with_owner"("workspace_name" "text", "workspace_description" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    current_user_id uuid;
    new_workspace_id uuid;
BEGIN
    current_user_id := auth.uid();

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'You must be logged in to create a workspace.';
    END IF;

    IF workspace_name IS NULL OR trim(workspace_name) = '' THEN
        RAISE EXCEPTION 'Workspace name is required.';
    END IF;

    INSERT INTO public.workspaces (
        name,
        description,
        created_by
    )
    VALUES (
        trim(workspace_name),
        NULLIF(trim(workspace_description), ''),
        current_user_id
    )
    RETURNING id INTO new_workspace_id;

    INSERT INTO public.workspace_members (
        workspace_id,
        user_id,
        role
    )
    VALUES (
        new_workspace_id,
        current_user_id,
        'owner'
    );

    RETURN json_build_object(
        'id', new_workspace_id,
        'name', trim(workspace_name)
    );
END;
$$;


ALTER FUNCTION "public"."create_workspace_with_owner"("workspace_name" "text", "workspace_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_next_ticket_number"("p_project_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    -- Stores the next number assigned to the project.
    next_number INTEGER;
BEGIN
    -- Only allow logged-in users.
    IF (SELECT auth.uid()) IS NULL THEN
        RAISE EXCEPTION 'You must be logged in to create a ticket.';
    END IF;

    -- Verify that the user belongs to the workspace containing this project.
    IF NOT EXISTS (
        SELECT 1
        FROM public.projects AS p
        JOIN public.workspace_members AS wm
            ON wm.workspace_id = p.workspace_id
        WHERE p.id = p_project_id
          AND wm.user_id = (SELECT auth.uid())
    ) THEN
        RAISE EXCEPTION 'You do not have access to this project.';
    END IF;

    -- Create the counter if it does not exist.
    -- Otherwise, increment it safely without generating duplicate numbers.
    INSERT INTO public.project_ticket_counters AS counter (
        project_id,
        last_number
    )
    VALUES (
        p_project_id,
        1
    )
    ON CONFLICT (project_id)
    DO UPDATE
        SET last_number = counter.last_number + 1
    RETURNING last_number INTO next_number;

    -- Return the number assigned to this ticket.
    RETURN next_number;
END;
$$;


ALTER FUNCTION "public"."get_next_ticket_number"("p_project_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "member_code" "text" NOT NULL,
    "full_name" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "added_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "project_members_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."project_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_ticket_counters" (
    "project_id" "uuid" NOT NULL,
    "last_number" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "project_ticket_counters_last_number_check" CHECK (("last_number" >= 0))
);


ALTER TABLE "public"."project_ticket_counters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "project_key" "text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "ticket_number" integer NOT NULL,
    "status" "text" DEFAULT 'To Do'::"text" NOT NULL,
    "priority" "text" DEFAULT 'Medium'::"text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tickets_priority_check" CHECK (("priority" = ANY (ARRAY['Low'::"text", 'Medium'::"text", 'High'::"text", 'Urgent'::"text"]))),
    CONSTRAINT "tickets_status_check" CHECK (("status" = ANY (ARRAY['To Do'::"text", 'In Progress'::"text", 'Done'::"text"])))
);


ALTER TABLE "public"."tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspace_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "workspace_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."workspace_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."workspaces" OWNER TO "postgres";


ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_member_code_key" UNIQUE ("member_code");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_project_id_user_id_key" UNIQUE ("project_id", "user_id");



ALTER TABLE ONLY "public"."project_ticket_counters"
    ADD CONSTRAINT "project_ticket_counters_pkey" PRIMARY KEY ("project_id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_workspace_id_project_key_key" UNIQUE ("workspace_id", "project_key");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_project_id_ticket_number_key" UNIQUE ("project_id", "ticket_number");



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_workspace_id_user_id_key" UNIQUE ("workspace_id", "user_id");



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_ticket_counters"
    ADD CONSTRAINT "project_ticket_counters_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can create workspaces" ON "public"."workspaces" FOR INSERT TO "authenticated" WITH CHECK (("created_by" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Authenticated users can view profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Members can view their workspaces" ON "public"."workspaces" FOR SELECT TO "authenticated" USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR "private"."is_workspace_member"("id")));



CREATE POLICY "Users can create their own membership" ON "public"."workspace_members" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("role" = 'owner'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."workspaces" "w"
  WHERE (("w"."id" = "workspace_members"."workspace_id") AND ("w"."created_by" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view their own memberships" ON "public"."workspace_members" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "private"."is_workspace_member"("workspace_id")));



CREATE POLICY "Workspace members can add members" ON "public"."workspace_members" FOR INSERT TO "authenticated" WITH CHECK ((("role" = 'member'::"text") AND "private"."is_workspace_member"("workspace_id")));



CREATE POLICY "Workspace members can add project memberships" ON "public"."project_members" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."projects" "p"
     JOIN "public"."workspace_members" "actor" ON (("actor"."workspace_id" = "p"."workspace_id")))
     JOIN "public"."workspace_members" "target" ON (("target"."workspace_id" = "p"."workspace_id")))
  WHERE (("p"."id" = "project_members"."project_id") AND ("actor"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("target"."user_id" = "project_members"."user_id")))));



CREATE POLICY "Workspace members can create projects" ON "public"."projects" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."workspace_members" "wm"
  WHERE (("wm"."workspace_id" = "projects"."workspace_id") AND ("wm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Workspace members can create tickets" ON "public"."tickets" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM ("public"."projects" "p"
     JOIN "public"."workspace_members" "wm" ON (("wm"."workspace_id" = "p"."workspace_id")))
  WHERE (("p"."id" = "tickets"."project_id") AND ("wm"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Workspace members can delete projects" ON "public"."projects" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workspace_members" "wm"
  WHERE (("wm"."workspace_id" = "projects"."workspace_id") AND ("wm"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Workspace members can remove project memberships" ON "public"."project_members" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."projects" "p"
     JOIN "public"."workspace_members" "wm" ON (("wm"."workspace_id" = "p"."workspace_id")))
  WHERE (("p"."id" = "project_members"."project_id") AND ("wm"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Workspace members can update projects" ON "public"."projects" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workspace_members" "wm"
  WHERE (("wm"."workspace_id" = "projects"."workspace_id") AND ("wm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workspace_members" "wm"
  WHERE (("wm"."workspace_id" = "projects"."workspace_id") AND ("wm"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Workspace members can update tickets" ON "public"."tickets" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."projects" "p"
     JOIN "public"."workspace_members" "wm" ON (("wm"."workspace_id" = "p"."workspace_id")))
  WHERE (("p"."id" = "tickets"."project_id") AND ("wm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."projects" "p"
     JOIN "public"."workspace_members" "wm" ON (("wm"."workspace_id" = "p"."workspace_id")))
  WHERE (("p"."id" = "tickets"."project_id") AND ("wm"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Workspace members can view project memberships" ON "public"."project_members" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."projects" "p"
     JOIN "public"."workspace_members" "wm" ON (("wm"."workspace_id" = "p"."workspace_id")))
  WHERE (("p"."id" = "project_members"."project_id") AND ("wm"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Workspace members can view projects" ON "public"."projects" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workspace_members" "wm"
  WHERE (("wm"."workspace_id" = "projects"."workspace_id") AND ("wm"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Workspace members can view tickets" ON "public"."tickets" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."projects" "p"
     JOIN "public"."workspace_members" "wm" ON (("wm"."workspace_id" = "p"."workspace_id")))
  WHERE (("p"."id" = "tickets"."project_id") AND ("wm"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_ticket_counters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tickets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workspace_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workspaces" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_profile"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_workspace_with_owner"("workspace_name" "text", "workspace_description" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_workspace_with_owner"("workspace_name" "text", "workspace_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_workspace_with_owner"("workspace_name" "text", "workspace_description" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_next_ticket_number"("p_project_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_next_ticket_number"("p_project_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_ticket_number"("p_project_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."project_members" TO "authenticated";
GRANT ALL ON TABLE "public"."project_members" TO "service_role";



GRANT ALL ON TABLE "public"."project_ticket_counters" TO "anon";
GRANT ALL ON TABLE "public"."project_ticket_counters" TO "authenticated";
GRANT ALL ON TABLE "public"."project_ticket_counters" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."tickets" TO "anon";
GRANT ALL ON TABLE "public"."tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."tickets" TO "service_role";



GRANT ALL ON TABLE "public"."workspace_members" TO "anon";
GRANT ALL ON TABLE "public"."workspace_members" TO "authenticated";
GRANT ALL ON TABLE "public"."workspace_members" TO "service_role";



GRANT ALL ON TABLE "public"."workspaces" TO "anon";
GRANT ALL ON TABLE "public"."workspaces" TO "authenticated";
GRANT ALL ON TABLE "public"."workspaces" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







