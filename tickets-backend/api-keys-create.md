# [BACK] Endpoint de création d'une clé API

## Contexte

L'utilisateur peut générer une clé API pour une organisation depuis la page Administration. La clé complète n'est retournée **qu'une seule fois** au moment de la création — le front affiche un bandeau d'avertissement et demande à l'utilisateur de la copier immédiatement.

## Endpoint

**`POST /organizations/{org_id}/api-keys/`**

- Auth requise (Bearer token)
- L'utilisateur doit être **administrateur** de l'organisation (pas juste membre)

### Body

```json
{
  "name": "Production"
}
```

| Champ | Type   | Requis | Description |
|-------|--------|--------|-------------|
| name  | string | oui    | Nom descriptif de la clé (max 64 caractères) |

### Logique de génération

1. Générer un token aléatoire de 48 caractères alphanumériques (+ préfixe `srd_`)
   → format final : `srd_<48 chars>` (52 caractères)
2. Extraire le préfixe = 12 premiers caractères (`srd_xxxxxxxx`)
3. Hasher le token complet en SHA-256 → stocker dans `hashed_key`
4. Stocker le préfixe dans `prefix`
5. **Ne jamais stocker le token en clair**

### Réponse `201`

```json
{
  "id": "...",
  "name": "Production",
  "prefix": "srd_a3f8c2e1",
  "token": "srd_a3f8c2e1d4f7b2c9e0a1b3d5f8c2e4a6b8d0f2a4c6e8b0d2f4a6c8e0b2d4f6",
  "status": 1,
  "status_label": "Active",
  "created_by": "...",
  "created_at": "2026-03-31T12:00:00Z"
}
```

> Le champ `token` est **uniquement présent dans cette réponse de création**. Il n'existe pas dans `ApiKeyRead`.

### Utilisation de la clé par les clients API

Les appels authentifiés avec une clé API passent le token dans le header :
`Authorization: ApiKey srd_a3f8c2e1d4f7...`

Le middleware d'auth doit :
1. Détecter le schéma `ApiKey` (vs `Bearer`)
2. Extraire le préfixe des 12 premiers caractères pour pré-filtrer en base
3. Hasher le token complet et comparer au `hashed_key` stocké
4. Vérifier que la clé est `status = 1` (active)

### Erreurs

| Code | Cas |
|------|-----|
| 401  | Non authentifié |
| 403  | Pas administrateur de l'organisation |
| 404  | Organisation introuvable |
| 422  | Body invalide (name manquant ou trop long) |
