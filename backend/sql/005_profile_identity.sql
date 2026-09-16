alter table public.profiles
add column date_of_birth date;

alter table public.profiles
add constraint profiles_display_name_length
check (display_name is null or char_length(trim(display_name)) between 2 and 100);

alter table public.profiles
add constraint profiles_date_of_birth_not_future
check (date_of_birth is null or date_of_birth <= current_date);
