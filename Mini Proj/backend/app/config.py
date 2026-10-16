import os
from pathlib import Path

# Load .env from project root or backend directory if present
for env_path in [Path(__file__).resolve().parents[2] / ".env", Path(__file__).resolve().parents[1] / ".env"]:
    if env_path.exists():
        with env_path.open(encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k_str = k.strip()
                    if k_str not in os.environ:
                        os.environ[k_str] = v.strip().strip('"').strip("'")

if "JWT_SECRET_KEY" not in os.environ or len(os.environ["JWT_SECRET_KEY"]) < 32:
    os.environ["JWT_SECRET_KEY"] = "iT9oEsYdeXmfkVZqD75h0ok7gcsFdYyk-6CuMWQxk2k1wcnnUHJVLX0D-3dwU-1YZDFxxftMkpAQlg9M6khMaw"


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://bmc:bmc@db:5432/bmc",
)
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
_REPO_ARTIFACTS = Path(__file__).resolve().parents[2] / "artifacts"
_env_artifacts = os.getenv("ARTIFACTS_DIR")
ARTIFACTS_DIR = (
    Path(_env_artifacts)
    if _env_artifacts and Path(_env_artifacts).exists()
    else (_REPO_ARTIFACTS if _REPO_ARTIFACTS.exists() else Path("/artifacts"))
)
THRESHOLD = float(os.getenv("CLUSTER_SIMILARITY_THRESHOLD", "0.75"))
MAX_CLUSTER_RADIUS_KM = float(os.getenv("MAX_CLUSTER_RADIUS_KM", "3.0"))
SAME_LOCATION_RADIUS_KM = float(os.getenv("SAME_LOCATION_RADIUS_KM", "0.75"))
SAME_LOCATION_SEMANTIC_THRESHOLD = float(
    os.getenv("SAME_LOCATION_SEMANTIC_THRESHOLD", "0.55")
)
SEED_ON_STARTUP = os.getenv("SEED_ON_STARTUP", "true").lower() == "true"
SYNC_LIVE_DEMO = os.getenv("SYNC_LIVE_DEMO", "true").lower() == "true"
EMBEDDING_MODEL = "paraphrase-multilingual-MiniLM-L12-v2"
