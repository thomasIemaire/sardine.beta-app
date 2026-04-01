# [BACK] Endpoint de révocation d'une clé API

## Contexte

Une clé révoquée ne peut plus être utilisée pour s'authentifier, mais reste visible dans la liste avec le statut "Révoquée". L'action est irréversible depuis le front (pas de bouton "réactiver").

## Endpoint

**`PATCH /organizations/{org_id}/api-keys/{key_id}/revoke`**

- Auth requise (Bearer token)
- L'utilisateur doit être **administrateur** de l'organisation
- Body vide — pas de payload nécessaire

### Logique

1. Vérifier que la clé appartient bien à `org_id`
2. Vérifier que le statut est `1` (active) — si déjà révoquée, retourner `409`
3. Passer `status` à `0` et mettre à jour `updated_at`

### Réponse `200`

```json
{
  "id": "...",
  "name": "Production",
  "prefix": "srd_a3f8c2e1",
  "status": 0,
  "status_label": "Révoquée",
  "created_by": "...",
  "created_at": "2026-01-15T10:00:00Z"
}
```

### Erreurs

| Code | Cas |
|------|-----|
| 401  | Non authentifié |
| 403  | Pas administrateur de l'organisation |
| 404  | Organisation ou clé introuvable |
| 409  | Clé déjà révoquée |
