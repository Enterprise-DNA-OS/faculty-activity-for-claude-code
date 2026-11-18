DO $$ DECLARE d1 uuid;d2 uuid;f1 uuid;f2 uuid;f3 uuid;c uuid;BEGIN
 IF EXISTS(SELECT 1 FROM departments WHERE code='DEMO-SCI') THEN RETURN; END IF;
 INSERT INTO departments(code,name) VALUES('DEMO-SCI','Harbour School of Science') RETURNING id INTO d1;
 INSERT INTO departments(code,name) VALUES('DEMO-ART','Harbour School of Arts') RETURNING id INTO d2;
 INSERT INTO faculty(code,name,department_id,role,purpose,review_on,review_evidence,notification_basis,notification_evidence)
 VALUES('F001','Aroha Bennett',d1,'Lecturer','Annual teaching, research and service reporting',current_date+180,'Fictional policy v1','Direct collection','Fictional staff notice v1') RETURNING id INTO f1;
 INSERT INTO faculty(code,name,department_id,role,purpose,review_on,review_evidence,notification_basis,notification_evidence)
 VALUES('F002','Theo Marshall',d1,'Senior Lecturer','',current_date-30,'','','') RETURNING id INTO f2;
 INSERT INTO faculty(code,name,department_id,role,purpose,review_on,review_evidence,notification_basis,notification_evidence)
 VALUES('F003','Aroha Patel',d2,'Lecturer','Annual activity reporting',current_date+180,'Fictional policy v1','Direct collection','Fictional staff notice v1') RETURNING id INTO f3;
 INSERT INTO cycles(code,name,starts_on,ends_on,due_on) VALUES('DEMO-ANNUAL','Fictional completed reporting period',current_date-365,current_date-14,current_date-7) RETURNING id INTO c;
 INSERT INTO annual_returns(faculty_id,cycle_id) VALUES(f1,c),(f2,c),(f3,c);
 INSERT INTO activities(code,faculty_id,cycle_id,kind,title,occurred_on,hours,reference,evidence,state,verified_by,verified_at) VALUES
 ('A001',f1,c,'teaching','Coastal science field course',current_date-45,42,'SCI201','Fictional course allocation 201','verified','Demo coordinator',now()),
 ('A002',f1,c,'research','Estuary restoration methods',current_date-90,0,'doi:demo-estuary','Fictional accepted manuscript','verified','Demo coordinator',now()),
 ('A003',f1,c,'service','School curriculum committee',current_date-60,12,'COM-01','Fictional attendance record','verified','Demo coordinator',now()),
 ('A004',f2,c,'research','Estuary restoration methods',current_date-90,0,'doi:demo-estuary','','draft',null,null),
 ('A005',f2,c,'teaching','Laboratory supervision',current_date-35,36,'SCI110','','draft',null,null),
 ('A006',f3,c,'service','Community archive workshop',current_date-60,8,'ART-OUTREACH','Fictional event programme','verified','Demo coordinator',now());
 INSERT INTO notes(faculty_id,body,actor) VALUES(f2,'Check the shared publication credit and missing teaching allocation.','Demo coordinator');
END $$;
