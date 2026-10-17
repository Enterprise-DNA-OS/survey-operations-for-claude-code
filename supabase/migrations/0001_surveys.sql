create table surveys (
 id uuid primary key default gen_random_uuid(), code text not null unique check (length(trim(code))>0),
 name text not null, owner text not null, purpose text not null, retention_days integer not null check(retention_days between 1 and 3650),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table questions (
 id uuid primary key default gen_random_uuid(), survey_id uuid not null references surveys(id), code text not null,
 name text not null, kind text not null check(kind in ('nps','csat','text')), unique(survey_id,code), unique(id,survey_id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table responses (
 id uuid primary key default gen_random_uuid(), survey_id uuid not null references surveys(id), source_id text not null,
 respondent text not null default 'Anonymous', segment text not null default 'Unassigned', received_on date not null,
 review_due date not null, verified_on date, verification_reference text,
 source_row jsonb not null default '{}'::jsonb, source_hash text,
 unique(survey_id,source_id), unique(id,survey_id),
 check(verified_on is null or (verified_on>=received_on and length(trim(verification_reference))>0)),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table answers (
 id uuid primary key default gen_random_uuid(), survey_id uuid not null, response_id uuid not null, question_id uuid not null,
 score integer, answer_text text not null default '', unique(response_id,question_id),
 foreign key(response_id,survey_id) references responses(id,survey_id),
 foreign key(question_id,survey_id) references questions(id,survey_id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table actions (
 id uuid primary key default gen_random_uuid(), response_id uuid not null references responses(id),
 title text not null, owner text not null, due_on date not null,
 status text not null default 'open' check(status in ('open','closed')),
 closed_on date, outcome text, evidence text,
 check((status='open' and closed_on is null) or (status='closed' and closed_on is not null and length(trim(outcome))>0 and length(trim(evidence))>0)),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table notes (
 id uuid primary key default gen_random_uuid(), response_id uuid not null references responses(id), actor text not null, body text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table audit_events (
 id uuid primary key default gen_random_uuid(), actor text not null, event text not null, record_id uuid, detail jsonb not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index responses_survey_date on responses(survey_id,received_on);
create index responses_review_due on responses(review_due);
create index answers_question on answers(question_id);
create index answers_survey on answers(survey_id);
create index actions_response on actions(response_id);
create index actions_open_due on actions(due_on) where status='open';
create index notes_response on notes(response_id);
create function touch_updated() returns trigger language plpgsql as $$begin new.updated_at=now(); return new; end$$;
create function validate_answer() returns trigger language plpgsql as $$
declare k text;
begin
 select kind into k from questions where id=new.question_id and survey_id=new.survey_id;
 if k='nps' and (new.score is null or new.score<0 or new.score>10) then raise exception 'NPS score must be 0 to 10'; end if;
 if k='csat' and (new.score is null or new.score<1 or new.score>5) then raise exception 'CSAT score must be 1 to 5'; end if;
 if k='text' and new.score is not null then raise exception 'Text answers have no numeric score'; end if;
 return new;
end$$;
create trigger answer_range before insert or update on answers for each row execute function validate_answer();
do $$declare t text; begin foreach t in array array['surveys','questions','responses','answers','actions','notes','audit_events'] loop
 execute format('create trigger touch before update on %I for each row execute function touch_updated()',t);
 execute format('alter table %I enable row level security',t);
 execute format('revoke all on %I from public',t);
end loop; end$$;
create view scorecards as
select s.code survey,q.code question,q.kind,r.segment,count(*)::integer answered,
 round(avg(a.score),2) average_score,
 case when q.kind='nps' then round(100.0*(count(*) filter(where a.score>=9)-count(*) filter(where a.score<=6))/count(*),2) end nps,
 case when q.kind='csat' then round(100.0*count(*) filter(where a.score>=4)/count(*),2) end csat_percent
from answers a join questions q on q.id=a.question_id join responses r on r.id=a.response_id join surveys s on s.id=r.survey_id
where q.kind in ('nps','csat') group by s.code,q.code,q.kind,r.segment;
create view detractor_queue as
select r.id,r.source_id,s.code survey,r.respondent,r.segment,r.received_on,
 min(a.score) lowest_nps, count(distinct ac.id) filter(where ac.status='open')::integer open_actions
from responses r join surveys s on s.id=r.survey_id join answers a on a.response_id=r.id join questions q on q.id=a.question_id
left join actions ac on ac.response_id=r.id
where q.kind='nps' and a.score<=6 group by r.id,s.code;
create view action_queue as
select a.id,r.source_id,a.title,a.owner,a.due_on,current_date-a.due_on days_overdue,r.segment,s.code survey
from actions a join responses r on r.id=a.response_id join surveys s on s.id=r.survey_id where a.status='open';
create view privacy_queue as
select r.id,r.source_id,r.respondent,s.code survey,r.review_due,r.verified_on,
 r.review_due<current_date retention_review_due,r.verified_on is null accuracy_check_missing
from responses r join surveys s on s.id=r.survey_id where r.review_due<current_date or r.verified_on is null;
revoke all on scorecards,detractor_queue,action_queue,privacy_queue from public;
