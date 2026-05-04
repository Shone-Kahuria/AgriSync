import os
from pydantic_settings import BaseSettings

# Disable CrewAI telemetry before any crewai import — avoids 30s network timeout
os.environ.setdefault("CREWAI_TELEMETRY_OPT_OUT", "true")
os.environ.setdefault("OTEL_SDK_DISABLED", "true")


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://agrisync:agrisync@db:5432/agrisync"
    use_mock_vision: bool = True          # set False on AMD MI300X node
    llava_model_id: str = "YuchengShi/LLaVA-v1.5-7B-Plant-Leaf-Diseases-Detection"
    mistral_model_id: str = "mistralai/Mistral-7B-Instruct-v0.2"
    africas_talking_api_key: str = ""
    africas_talking_username: str = "sandbox"
    rocm_visible_devices: str = "0"

    class Config:
        env_file = ".env"


settings = Settings()
