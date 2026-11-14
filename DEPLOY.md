# Deploying Flame in Freefall to Azure

The app runs as one container on Azure Container Apps. The container serves the built React app and the FastAPI backend from one URL, and adds the API key on the server side, the same way the Vite proxy does in development (`backend/web.py`).

Every push to `main` runs [.github/workflows/deploy.yml](.github/workflows/deploy.yml):

1. Lint the frontend.
2. Build the Docker image, which also builds the frontend.
3. Run the backend tests inside that image.
4. Push the image to Azure Container Registry, tagged with the commit ID.
5. Point the Container App at the new image and wait until `/health` and the home page respond.

If any step fails, the site keeps running the previous revision. To roll back by hand, open the Container App in the Azure portal, go to **Revisions and replicas**, and activate an earlier revision.

## Azure resources

| Resource | Name | Region |
| --- | --- | --- |
| Resource group | `rg-flame-freefall` | West Europe (label only) |
| Container registry | `flamefreefall123` | North Europe |
| Container Apps environment | `cae-flame-freefall` | North Europe |
| Container App | `flame-in-freefall` | North Europe |

The database stays on Supabase and the language model on Groq. Neither runs on Azure.

## One-time setup

Run these in [Azure Cloud Shell](https://shell.azure.com) (Bash). They only need to run once.

### 1. Container Apps environment

```bash
az containerapp env create --name cae-flame-freefall --resource-group rg-flame-freefall --location northeurope --logs-destination none
```

### 2. The Container App, with its secrets

The app starts with a placeholder image; the first workflow run replaces it. Paste the real values from `backend/.env` in place of the three `PASTE_…` placeholders. Keep the single quotes. The values are stored as Container App secrets and never go into GitHub.

```bash
az containerapp create --name flame-in-freefall --resource-group rg-flame-freefall --environment cae-flame-freefall \
  --image mcr.microsoft.com/k8se/quickstart:latest --target-port 8000 --ingress external \
  --cpu 1 --memory 2Gi --min-replicas 1 --max-replicas 1 --system-assigned \
  --secrets database-url='PASTE_DATABASE_URL' rag-api-key='PASTE_RAG_API_KEY' groq-api-key='PASTE_GROQ_API_KEY' \
  --env-vars DATABASE_URL=secretref:database-url RAG_API_KEY=secretref:rag-api-key GROQ_API_KEY=secretref:groq-api-key \
    LLM_PROVIDER=groq GROQ_MODEL=openai/gpt-oss-20b EMBEDDING_MODEL=BAAI/bge-small-en-v1.5 \
    MIN_SEMANTIC_SIMILARITY=0.5 RAG_MAX_ATTEMPTS=3
```

`--max-replicas 1` keeps the cost fixed and keeps the backend's per-process rate limit meaningful.

### 3. Let the app pull images from the registry

```bash
acr_id=$(az acr show --name flamefreefall123 --query id --output tsv)
principal=$(az containerapp show --name flame-in-freefall --resource-group rg-flame-freefall --query identity.principalId --output tsv)
az role assignment create --assignee-object-id "$principal" --assignee-principal-type ServicePrincipal --role AcrPull --scope "$acr_id"
az containerapp registry set --name flame-in-freefall --resource-group rg-flame-freefall --server flamefreefall123.azurecr.io --identity system
```

### 4. Let GitHub Actions deploy (OpenID Connect, no stored password)

```bash
app_id=$(az ad app create --display-name github-flame-in-freefall --query appId --output tsv)
az ad sp create --id "$app_id"
az ad app federated-credential create --id "$app_id" --parameters '{"name":"github-main","issuer":"https://token.actions.githubusercontent.com","subject":"repo:Bodda59/Ignis_9th_NASA_Space_App_Cairo_Hackathon:ref:refs/heads/main","audiences":["api://AzureADTokenExchange"]}'
rg_id=$(az group show --name rg-flame-freefall --query id --output tsv)
acr_id=$(az acr show --name flamefreefall123 --query id --output tsv)
az role assignment create --assignee "$app_id" --role Contributor --scope "$rg_id"
az role assignment create --assignee "$app_id" --role AcrPush --scope "$acr_id"
echo "AZURE_CLIENT_ID=$app_id"
az account show --query "{AZURE_TENANT_ID:tenantId, AZURE_SUBSCRIPTION_ID:id}" --output table
```

The last two commands print the three values GitHub needs.

### 5. GitHub repository secrets

A repository admin opens **Settings → Secrets and variables → Actions → New repository secret** and adds:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

### 6. First deploy

Merge the workflow into `main`, or start it from the **Actions** tab with **Run workflow**. The run prints the site address in the **Smoke test** step. You can also get it with:

```bash
az containerapp show --name flame-in-freefall --resource-group rg-flame-freefall --query properties.configuration.ingress.fqdn --output tsv
```

## Changing a secret later

```bash
az containerapp secret set --name flame-in-freefall --resource-group rg-flame-freefall --secrets groq-api-key='NEW_VALUE'
az containerapp revision restart --name flame-in-freefall --resource-group rg-flame-freefall \
  --revision $(az containerapp show --name flame-in-freefall --resource-group rg-flame-freefall --query properties.latestRevisionName --output tsv)
```

## Cost

With one replica always running (1 vCPU, 2 GiB), Container Apps costs about $72 a month at published list rates, which the Azure free account credit covers. To cut it to almost nothing after judging, let the app scale to zero; the first visit after an idle period then waits while the container starts:

```bash
az containerapp update --name flame-in-freefall --resource-group rg-flame-freefall --min-replicas 0
```

To remove everything, delete the resource group:

```bash
az group delete --name rg-flame-freefall
```
