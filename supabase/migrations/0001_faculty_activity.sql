CREATE TABLE departments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE CHECK (btrim(code)<>''),
 name text NOT NULL CHECK (btrim(name)<>''), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE faculty (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE CHECK (btrim(code)<>''), name text NOT NULL CHECK (btrim(name)<>''),
 department_id uuid NOT NULL REFERENCES departments, role text NOT NULL DEFAULT 'Academic', active boolean NOT NULL DEFAULT true,
 purpose text NOT NULL DEFAULT '', review_on date, review_evidence text NOT NULL DEFAULT '',
 notification_basis text NOT NULL DEFAULT '', notification_evidence text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE cycles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE CHECK (btrim(code)<>''), name text NOT NULL CHECK (btrim(name)<>''),
 starts_on date NOT NULL, ends_on date NOT NULL, due_on date NOT NULL,
 CHECK (starts_on<=ends_on AND due_on>=ends_on), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE annual_returns (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), faculty_id uuid NOT NULL REFERENCES faculty, cycle_id uuid NOT NULL REFERENCES cycles,
 state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft','submitted','approved')),
 no_activity_reason text NOT NULL DEFAULT '', submitted_at timestamptz, approved_at timestamptz, approved_by text,
 snapshot jsonb, UNIQUE(faculty_id,cycle_id),
 CHECK (state='draft' OR (submitted_at IS NOT NULL AND snapshot IS NOT NULL)),
 CHECK (state<>'approved' OR (approved_at IS NOT NULL AND btrim(approved_by)<>'')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE activities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE CHECK (btrim(code)<>''),
 faculty_id uuid NOT NULL REFERENCES faculty, cycle_id uuid NOT NULL REFERENCES cycles,
 kind text NOT NULL CHECK (kind IN ('teaching','research','service')), title text NOT NULL CHECK (btrim(title)<>''),
 occurred_on date NOT NULL, hours numeric(12,2) NOT NULL DEFAULT 0 CHECK (hours>=0),
 reference text NOT NULL DEFAULT '', evidence text NOT NULL DEFAULT '',
 state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft','verified','withdrawn')),
 verified_by text, verified_at timestamptz,
 CHECK (state<>'verified' OR (btrim(evidence)<>'' AND btrim(verified_by)<>'' AND verified_at IS NOT NULL)),
 FOREIGN KEY (faculty_id,cycle_id) REFERENCES annual_returns(faculty_id,cycle_id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), faculty_id uuid NOT NULL REFERENCES faculty, body text NOT NULL CHECK (btrim(body)<>''),
 actor text NOT NULL CHECK (btrim(actor)<>''), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE import_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), batch_key text NOT NULL UNIQUE, content_hash text NOT NULL UNIQUE,
 counts jsonb NOT NULL, actor text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), action text NOT NULL, actor text NOT NULL CHECK (btrim(actor)<>''),
 record_type text NOT NULL, record_id uuid, reason text NOT NULL DEFAULT '', before_record jsonb, after_record jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activities_return ON activities(faculty_id,cycle_id);
CREATE INDEX audit_record ON audit(record_type,record_id,created_at);
CREATE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE FUNCTION refuse_audit_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Audit records are append only'; END $$;
CREATE TRIGGER audit_append_only BEFORE UPDATE OR DELETE ON audit FOR EACH ROW EXECUTE FUNCTION refuse_audit_change();
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['departments','faculty','cycles','annual_returns','activities','notes','import_batches'] LOOP
 EXECUTE format('CREATE TRIGGER touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_updated_at()',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['departments','faculty','cycles','annual_returns','activities','notes','import_batches','audit'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t); EXECUTE format('REVOKE ALL ON %I FROM PUBLIC',t);
 END LOOP; END $$;
CREATE FUNCTION check_activity_cycle() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c cycles; r annual_returns; BEGIN
 SELECT * INTO c FROM cycles WHERE id=NEW.cycle_id;
 IF NEW.occurred_on<c.starts_on OR NEW.occurred_on>c.ends_on THEN RAISE EXCEPTION 'Activity date outside reporting cycle'; END IF;
 SELECT * INTO r FROM annual_returns WHERE faculty_id=NEW.faculty_id AND cycle_id=NEW.cycle_id;
 IF r.state<>'draft' THEN RAISE EXCEPTION 'Reopen the annual return before changing activities'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER activity_cycle BEFORE INSERT OR UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION check_activity_cycle();
CREATE VIEW activity_register AS
 SELECT a.id,a.code,f.code faculty_code,f.name faculty,d.name department,c.code cycle,a.kind,a.title,a.occurred_on,a.hours,a.reference,a.evidence,a.state,a.verified_by,a.verified_at
 FROM activities a JOIN faculty f ON f.id=a.faculty_id JOIN departments d ON d.id=f.department_id JOIN cycles c ON c.id=a.cycle_id;
CREATE VIEW return_register AS
 SELECT r.id,f.code faculty_code,f.name faculty,d.name department,c.code cycle,c.starts_on,c.ends_on,c.due_on,r.state,
 count(a.id) FILTER(WHERE a.state<>'withdrawn')::integer activities,
 count(a.id) FILTER(WHERE a.state='draft')::integer unverified,
 count(a.id) FILTER(WHERE a.state<>'withdrawn' AND btrim(a.evidence)='')::integer missing_evidence,
 greatest(current_date-c.due_on,0) overdue_days,r.no_activity_reason,r.submitted_at,r.approved_by
 FROM annual_returns r JOIN faculty f ON f.id=r.faculty_id JOIN departments d ON d.id=f.department_id JOIN cycles c ON c.id=r.cycle_id
 LEFT JOIN activities a ON a.faculty_id=r.faculty_id AND a.cycle_id=r.cycle_id
 GROUP BY r.id,f.code,f.name,d.name,c.code,c.starts_on,c.ends_on,c.due_on;
CREATE VIEW compliance_findings AS
 SELECT f.id record_id,f.code record_code,'IPP1-purpose' rule,'Record the necessary collection purpose' issue,'https://www.privacy.org.nz/privacy-principles/1/' source FROM faculty f WHERE btrim(purpose)=''
 UNION ALL SELECT id,code,'IPP9-review','Review retention purpose and applicable disposal authority','https://www.privacy.org.nz/privacy-principles/9/' FROM faculty WHERE review_on IS NULL OR review_on<current_date OR btrim(review_evidence)=''
 UNION ALL SELECT id,code,'IPP3A-notice','Record notice or the applicable exception and evidence','https://www.privacy.org.nz/privacy-principles/3a/' FROM faculty WHERE btrim(notification_basis)='' OR btrim(notification_evidence)=''
 UNION ALL SELECT id,code,'IPP8-accuracy','Check supporting evidence before using this activity','https://www.privacy.org.nz/privacy-principles/8/' FROM activities WHERE state='draft'
 UNION ALL SELECT id,faculty_code || '/' || cycle,'LOCAL-return-due','Annual return is past the institution deadline','Institution policy: cycles.due_on' FROM return_register WHERE state='draft' AND overdue_days>0;
CREATE VIEW department_summary AS
 SELECT department,cycle,count(*)::integer returns,count(*) FILTER(WHERE state='draft')::integer draft,
 count(*) FILTER(WHERE state='submitted')::integer awaiting_review,count(*) FILTER(WHERE state='approved')::integer approved,
 sum(activities)::integer activities,sum(missing_evidence)::integer missing_evidence
 FROM return_register GROUP BY department,cycle;
