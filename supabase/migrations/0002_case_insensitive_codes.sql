CREATE UNIQUE INDEX departments_code_casefold ON departments(lower(code));
CREATE UNIQUE INDEX faculty_code_casefold ON faculty(lower(code));
CREATE UNIQUE INDEX cycles_code_casefold ON cycles(lower(code));
CREATE UNIQUE INDEX activities_code_casefold ON activities(lower(code));
