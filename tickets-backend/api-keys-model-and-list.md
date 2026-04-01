# [BACK] Modèle ApiKey et endpoint de liste par organisation

## Contexte

La page Administration du front affiche les clés API associées à une organisation. Il faut un modèle Beanie `ApiKey` et un endpoint pour lister les clés d'une organisation.

## Modèle attendu

```python
class ApiKey(Document):
    organization_id: PydanticObjectId
    name: str                        # Nom donné par l'utilisateur (ex: "Production")
    prefix: str                      # 12 premiers caractères de la clé (ex: "srd_a3f8c2e1")
    hashed_key: str                  # SHA-256 du token complet, jamais exposé
    status: int = 1                  # 1 = active, 0 = revoked
    created_by: PydanticObjectId
    created_at: datetime
    updated_at: datetime
```

> La clé complète n'est **jamais stockée** en clair. Seul le préfixe est conservé pour identification visuelle.

## Schema de réponse `ApiKeyRead`

```python
class ApiKeyRead(BaseModel):
    id: str
    name: str
    prefix: str          # ex: "srd_a3f8c2e1"
    status: int          # 1 = active, 0 = revoked
    status_label: str    # "Active" | "Révoquée"
    created_by: str
    created_at: datetime
```

## Endpoint

**`GET /organizations/{org_id}/api-keys/`**

- Auth requise (Bearer token)
- L'utilisateur doit être membre de l'organisation
- Retourne la liste paginée des clés (page + page_size)
- Trier par `created_at` desc par défaut

### Réponse `200`

```json
{
  "items": [
    {
      "id": "...",
      "name": "Production",
      "prefix": "srd_a3f8c2e1",
      "status": 1,
      "status_label": "Active",
      "created_by": "...",
      "created_at": "2026-01-15T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20,
  "total_pages": 1
}
```

### Erreurs

| Code | Cas |
|------|-----|
| 401  | Non authentifié |
| 403  | Non membre de l'organisation |
| 404  | Organisation introuvable |
