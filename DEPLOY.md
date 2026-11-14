# Deploying Flame in Freefall to Azure

The app runs as one container on Azure Container Apps. The container serves the built React app and the FastAPI backend from one URL, and adds the API key on the server side, the same way the Vite proxy does in development (`backend/web.py`).

Every push to `main` runs [.github/workflows/deploy.yml](.github/workflows/deploy.yml):

1. Lint the frontend.
2. Build the Docker image, which also builds the frontend.
3. Run the backend tests inside that image.
4. Push the image to Azure Container Registry, tagged with the commit ID.
5. Point the Container App at the new image and wait until `/health` and the home page respond.

If any step fails, the site keeps running the previous revision. To roll back by hand, open the Container App in the Azure portal, go to **Revisions and replicas**, and activate an earlier revision.

## Settings, not code

No Azure name, secret or model setting is written into the code or the workflow:

- **App secrets** (database URL, API keys) are Container App secrets.
- **App settings** (`LLM_PROVIDER`, `GROQ_MODEL`) are Container App environment variables, copied from `backend/.env`.
- **Azure names** are GitHub repository variables, and the Azure login IDs are GitHub repository secrets.
- **Versions** come from the lock files. The Docker build reads the PyTorch version from `backend/uv.lock`, and the embedding model from the app's own setting.

The database stays on Supabase and the language model on Groq. Neither runs on Azure.

## One-time setup

Run these in [Azure Cloud Shell](https://shell.azure.com) (Bash). They only need to run once.

### 0. Your names

Set these once at the start of the Cloud Shell session; every command below uses them. `ACR` must be globally unique, lowercase letters and digits only. `LOCATION` must be a region that accepts new customers on your subscription.

```bash
RG=rg-flame-freefall
LOCATION=northeurope
ACR=flamefreefall123
ENVIRONMENT=cae-flame-freefall
APP=flame-in-freefall
REPO=Bodda59/Ignis_9th_NASA_Space_App_Cairo_Hackathon
```

### 1. Resource group, registry and Container Apps environment

Skip any that already exist.

```bash
az group create --name "$RG" --location "$LOCATION"
az acr create --name "$ACR" --resource-group "$RG" --location "$LOCATION" --sku Standard
az containerapp env create --name "$ENVIRONMENT" --resource-group "$RG" --location "$LOCATION" --logs-destination none
```

### 2. The Container App, with its secrets and settings

The app starts with a placeholder image; the first workflow run replaces it. Replace each `PASTE_…` with the value from `backend/.env`. Keep the single quotes.

```bash
az containerapp create --name "$APP" --resource-group "$RG" --environment "$ENVIRONMENT" \
  --image mcr.microsoft.com/k8se/quickstart:latest --target-port 8000 --ingress external \
  --cpu 1 --memory 2Gi --min-replicas 1 --max-replicas 1 --system-assigned \
  --secrets database-url='PASTE_DATABASE_URL' rag-api-key='PASTE_RAG_API_KEY' groq-api-key='PASTE_GROQ_API_KEY' \
  --env-vars DATABASE_URL=secretref:database-url RAG_API_KEY=secretref:rag-api-key GROQ_API_KEY=secretref:groq-api-key \
    LLM_PROVIDER='PASTE_LLM_PROVIDER' GROQ_MODEL='PASTE_GROQ_MODEL'
```

Any other setting from `backend/.env` can be added to `--env-vars` the same way; settings left out use the app's defaults. `--max-replicas 1` keeps the cost fixed and keeps the backend's per-process rate limit meaningful.

### 3. Let the app pull images from the registry

```bash
acr_id=$(az acr show --name "$ACR" --query id --output tsv)
principal=$(az containerapp show --name "$APP" --resource-group "$RG" --query identity.principalId --output tsv)
az role assignment create --assignee-object-id "$principal" --assignee-principal-type ServicePrincipal --role AcrPull --scope "$acr_id"
az containerapp registry set --name "$APP" --resource-group "$RG" --server "$ACR.azurecr.io" --identity system
```

### 4. Let GitHub Actions deploy (OpenID Connect, no stored password)

```bash
app_id=$(az ad app create --display-name "github-$APP" --query appId --output tsv)
az ad sp create --id "$app_id"
az ad app federated-credential create --id "$app_id" --parameters "{\"name\":\"github-main\",\"issuer\":\"https://token.actions.githubusercontent.com\",\"subject\":\"repo:$REPO:ref:refs/heads/main\",\"audiences\":[\"api://AzureADTokenExchange\"]}"
rg_id=$(az group show --name "$RG" --query id --output tsv)
acr_id=$(az acr show --name "$ACR" --query id --output tsv)
az role assignment create --assignee "$app_id" --role Contributor --scope "$rg_id"
az role assignment create --assignee "$app_id" --role AcrPush --scope "$acr_id"
echo "Secrets:   AZURE_CLIENT_ID=$app_id  AZURE_TENANT_ID=$(az account show --query tenantId --output tsv)  AZURE_SUBSCRIPTION_ID=$(az account show --query id --output tsv)"
echo "Variables: AZURE_REGISTRY=$ACR.azurecr.io  AZURE_RESOURCE_GROUP=$RG  AZURE_CONTAINER_APP=$APP  IMAGE_NAME=$APP"
```

The last two lines print everything GitHub needs.

### 5. GitHub repository settings

A repository admin opens **Settings → Secrets and variables → Actions** and adds what step 4 printed:

- On the **Secrets** tab: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`.
- On the **Variables** tab: `AZURE_REGISTRY`, `AZURE_RESOURCE_GROUP`, `AZURE_CONTAINER_APP`, `IMAGE_NAME`.

If one is missing, the workflow stops at its first step and names it.

### 6. First deploy

Merge the workflow into `main`, or start it from the **Actions** tab with **Run workflow**. The run prints the site address in the **Smoke test** step. You can also get it with:

```bash
az containerapp show --name "$APP" --resource-group "$RG" --query properties.configuration.ingress.fqdn --output tsv
```

## Changing a secret or setting later

```bash
az containerapp secret set --name "$APP" --resource-group "$RG" --secrets groq-api-key='NEW_VALUE'
az containerapp update --name "$APP" --resource-group "$RG" --set-env-vars GROQ_MODEL='NEW_MODEL'
```

A changed secret takes effect when the app restarts; the `update` command, or the next deploy, restarts it.

## Cost

With one replica always running (1 vCPU, 2 GiB), Container Apps costs about $72 a month at published list rates, which the Azure free account credit covers. To cut it to almost nothing after judging, let the app scale to zero; the first visit after an idle period then waits while the container starts:

```bash
az containerapp update --name "$APP" --resource-group "$RG" --min-replicas 0
```

To remove everything, delete the resource group:

```bash
az group delete --name "$RG"
```
