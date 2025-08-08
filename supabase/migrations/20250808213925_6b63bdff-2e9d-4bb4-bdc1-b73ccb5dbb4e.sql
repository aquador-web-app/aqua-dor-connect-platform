-- Create a public storage bucket for content assets
insert into storage.buckets (id, name, public)
values ('content', 'content', true)
on conflict (id) do nothing;

-- Storage policies for the 'content' bucket
-- Allow public read access to objects in the 'content' bucket
create policy "Public can read content bucket"
  on storage.objects
  for select
  using (bucket_id = 'content');

-- Allow admins and co-admins to insert into the 'content' bucket
create policy "Admins can upload to content bucket"
  on storage.objects
  for insert
  with check (
    bucket_id = 'content' and (has_role(auth.uid(), 'admin') or has_role(auth.uid(), 'co_admin'))
  );

-- Allow admins and co-admins to update objects in the 'content' bucket
create policy "Admins can update content bucket"
  on storage.objects
  for update
  using (
    bucket_id = 'content' and (has_role(auth.uid(), 'admin') or has_role(auth.uid(), 'co_admin'))
  )
  with check (
    bucket_id = 'content' and (has_role(auth.uid(), 'admin') or has_role(auth.uid(), 'co_admin'))
  );

-- Allow admins and co-admins to delete objects in the 'content' bucket
create policy "Admins can delete from content bucket"
  on storage.objects
  for delete
  using (
    bucket_id = 'content' and (has_role(auth.uid(), 'admin') or has_role(auth.uid(), 'co_admin'))
  );