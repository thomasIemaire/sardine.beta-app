# [BACK] Endpoint de suppression d'une clé API

## Contexte

L'utilisateur peut supprimer définitivement une clé API (active ou révoquée) depuis la page Administration. La suppression retire la clé de la base de données — elle ne peut plus être listée ni utilisée.

## Endpoint

**`DELETE /organizations/{org_id}/api-keys/{key_id}`**

- Auth requise (Bearer token)
- L'utilisateur doit être **administrateur** de l'organisation

### Logique

1. Vérifier que la clé appartient bien à `org_id`
2. Supprimer le document de la collection
3. Si la clé était active au moment de la suppression : logger l'événement (audit)

### Réponse `204`

Pas de corps de réponse.

### Erreurs

| Code | Cas |
|------|-----|
| 401  | Non authentifié |
| 403  | Pas administrateur de l'organisation |
| 404  | Organisation ou clé introuvable |
