import os
from pydantic_settings import BaseSettings

# Disable CrewAI telemetry before any crewai import — avoids 30s network timeout
os.environ.setdefault("CREWAI_TELEMETRY_OPT_OUT", "true")
os.environ.setdefault("OTEL_SDK_DISABLED", "true")


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://agrisync:agrisync@db:5432/agrisync"
    # False = real vision inference; True = fast deterministic mock
    use_mock_vision: bool = True
    # Vision model: "llama32" (Track 3 primary, AMD MI300X) or "llava" (domain-finetuned)
    vision_model: str = "llama32"
    llama32_model_id: str = "meta-llama/Llama-3.2-11B-Vision-Instruct"
    llava_model_id: str = "YuchengShi/LLaVA-v1.5-7B-Plant-Leaf-Diseases-Detection"
    mistral_model_id: str = "mistralai/Mistral-7B-Instruct-v0.2"
    huggingface_token: str = ""           # required for gated models (Llama 3.2)
    africas_talking_api_key: str = ""
    africas_talking_username: str = "sandbox"
    rocm_visible_devices: str = "0"
    # Security — set API_KEY in production; empty string disables auth check (dev/demo)
    api_key: str = ""
    # CORS — comma-separated allowed origins; "*" allows all (dev/demo)
    frontend_url: str = "*"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
