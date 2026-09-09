drop table if exists template_requests;
drop table if exists template_preferences;
drop table if exists templates;
drop function if exists template_prompt_tokens_valid(text[]);
delete from schema_migrations where name='0800_templates.sql';
