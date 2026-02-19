from pydantic import BaseModel


class ApiKeysResponse(BaseModel):
    anthropic_key_set: bool
    anthropic_key_masked: str | None

    openai_key_set: bool
    openai_key_masked: str | None

    xai_key_set: bool
    xai_key_masked: str | None

    model_config = {"from_attributes": True}


class ApiKeysUpdate(BaseModel):
    """
    Кожне поле:
    - None    → не змінювати
    - ""      → очистити (видалити ключ)
    - "sk-..."→ зберегти новий ключ
    """
    anthropic_key: str | None = None
    openai_key: str | None = None
    xai_key: str | None = None
