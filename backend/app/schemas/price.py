from pydantic import BaseModel


class PriceIn(BaseModel):
    item: str
    price_inr: float


class PriceOut(BaseModel):
    id: str
    item: str
    price_inr: float

    model_config = {"from_attributes": True}


class PriceMap(BaseModel):
    """Full price map for a household — item -> price_inr."""
    prices: dict[str, float]
