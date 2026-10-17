insert into surveys(id,code,name,owner,purpose,retention_days) values
('10000000-0000-0000-0000-000000000001','SERVICE','Service follow-up','Mia','Review service feedback and follow-up work',90),
('10000000-0000-0000-0000-000000000002','ONBOARD','Onboarding review','Ravi','Improve onboarding handover',180) on conflict do nothing;
insert into questions(id,survey_id,code,name,kind) values
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','NPS','How likely are you to recommend us?','nps'),
('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','CSAT','How satisfied were you?','csat'),
('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','COMMENT','What should we change?','text'),
('20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000002','NPS','Would you recommend our onboarding?','nps') on conflict do nothing;
insert into responses(id,survey_id,source_id,respondent,segment,received_on,review_due,verified_on,verification_reference) values
('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','SR-101','Alex Field','North',current_date-12,current_date+78,current_date-11,'Demo source checked'),
('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','SR-102','Alex Finch','North',current_date-5,current_date+85,null,null),
('30000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','SR-103','Jamie Reed','South',current_date-100,current_date-10,null,null),
('30000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','SR-104','Anonymous','South',current_date-2,current_date+88,null,null),
('30000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000002','OB-201','Casey Bell','Partners',current_date-8,current_date+172,current_date-7,'Demo source checked') on conflict do nothing;
insert into answers(id,survey_id,response_id,question_id,score,answer_text)
select ('40000000-0000-0000-0000-'||lpad(v.n::text,12,'0'))::uuid,r.survey_id,r.id,q.id,v.score,v.body
from (values
(1,'SR-101','NPS',3,''),(2,'SR-102','NPS',9,''),(3,'SR-103','NPS',5,''),(4,'SR-104','NPS',8,''),(5,'OB-201','NPS',10,''),
(6,'SR-101','CSAT',2,''),(7,'SR-102','CSAT',5,''),(8,'SR-103','CSAT',2,''),(9,'SR-104','CSAT',4,''),
(10,'SR-101','COMMENT',null,'Two handovers and still no delivery date.'),(11,'SR-102','COMMENT',null,'Clear updates from the branch.'),
(12,'SR-103','COMMENT',null,'Please confirm the replacement booking.')) as v(n,source,question,score,body)
join responses r on r.source_id=v.source join questions q on q.survey_id=r.survey_id and q.code=v.question on conflict do nothing;
insert into actions(id,response_id,title,owner,due_on,status,closed_on,outcome,evidence) values
('50000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','Confirm delivery and record next step','Mia',current_date-3,'open',null,null,null),
('50000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000003','Review replacement booking','Ravi',current_date+2,'open',null,null,null),
('50000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000002','Record branch praise','Mia',current_date-2,'closed',current_date-2,'Shared internally by operator','Demo meeting note') on conflict do nothing;
