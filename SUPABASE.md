# Compteurs de votes — mise en place

La bande de l'accueil se classe selon les votes des visiteurs. Tant que Supabase
n'est pas configuré, les votes restent dans le navigateur de chacun : le site
fonctionne, mais rien n'est partagé. Voici comment brancher les compteurs
partagés. Compter dix minutes.

## 1. Créer le projet

1. Compte gratuit sur <https://supabase.com>
2. **New project** — choisir la région `West EU (Ireland)` ou `Central EU (Frankfurt)`
3. Noter le mot de passe de la base (il ne sert pas ici, mais on ne le revoit plus)

## 2. Créer la table et la fonction

Ouvrir **SQL Editor** dans le tableau de bord, coller ceci, puis **Run** :

```sql
create table if not exists public.track_likes (
  slug  text primary key,
  likes integer not null default 0
);

alter table public.track_likes enable row level security;

-- Tout le monde peut lire les compteurs.
create policy "lecture publique"
  on public.track_likes for select
  using (true);

-- Personne n'écrit directement dans la table : on passe par la fonction,
-- qui est la seule à pouvoir incrémenter, et jamais en dessous de zéro.
create or replace function public.bump_like(p_slug text, p_delta int)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v integer;
begin
  if p_delta not in (-1, 1) then
    raise exception 'delta invalide';
  end if;

  insert into public.track_likes (slug, likes)
  values (p_slug, greatest(0, p_delta))
  on conflict (slug) do update
    set likes = greatest(0, public.track_likes.likes + p_delta)
  returning likes into v;

  return v;
end;
$$;

grant execute on function public.bump_like(text, int) to anon;
```

## 3. Récupérer les clés

**Project Settings → API** :

- `Project URL` → par exemple `https://abcdefgh.supabase.co`
- `anon public` → une longue chaîne commençant par `eyJ`

## 4. Les coller dans le site

Dans `assets/js/site-data.js` :

```js
supabase: {
  url:     "https://abcdefgh.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIs..."
},
```

Puis `git add . && git commit -m "votes: supabase" && git push`.

## Questions courantes

**La clé anon est visible dans le code source, c'est un problème ?**
Non, elle est publique par conception. Les règles de sécurité (RLS) ci-dessus
n'autorisent que deux choses : lire les compteurs, et appeler `bump_like` avec
un delta de +1 ou −1. Rien d'autre n'est possible avec cette clé.

**Peut-on voter plusieurs fois ?**
Le site retient le vote dans le navigateur : un vote par piste, annulable.
Quelqu'un de motivé peut contourner ça en vidant son stockage local. Pour un
site de groupe c'est suffisant. Si le besoin s'en fait sentir, on ajoutera une
limite par adresse IP côté base.

**Quotas ?**
L'offre gratuite couvre 500 Mo de base et 5 Go de trafic par mois. Un compteur
de sept pistes en consomme une fraction dérisoire. Attention en revanche : un
projet Supabase gratuit est mis en pause après une semaine sans requête. Une
simple visite le réveille.

**Comment remettre les compteurs à zéro ?**
Dans le SQL Editor : `update public.track_likes set likes = 0;`

**Que se passe-t-il si Supabase est injoignable ?**
Le site affiche le dernier état connu, mis en cache dans le navigateur, et les
votes continuent de fonctionner localement. Rien ne casse.
