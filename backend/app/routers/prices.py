from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user, require_verified
from app.models.household_price import HouseholdPrice
from app.models.user import User
from app.schemas.price import PriceIn, PriceOut, PriceMap

router = APIRouter(prefix="/prices", tags=["prices"])


@router.get("", response_model=PriceMap)
def get_prices(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all item prices for the user's household."""
    rows = db.query(HouseholdPrice).filter(HouseholdPrice.household_id == user.household_id).all()
    return PriceMap(prices={r.item: float(r.price_inr) for r in rows})


@router.put("/{item}", response_model=PriceOut)
def set_price(
    item: str,
    body: PriceIn,
    user: User = Depends(require_verified),
    db: Session = Depends(get_db),
):
    """Set or update price for an item. Delete to disable auto-expense."""
    existing = db.query(HouseholdPrice).filter(
        HouseholdPrice.household_id == user.household_id,
        HouseholdPrice.item == item,
    ).first()

    if existing:
        existing.price_inr = body.price_inr
        db.commit()
        db.refresh(existing)
        return existing

    new_price = HouseholdPrice(household_id=user.household_id, item=item, price_inr=body.price_inr)
    db.add(new_price)
    db.commit()
    db.refresh(new_price)
    return new_price


@router.delete("/{item}", status_code=204)
def delete_price(item: str, user: User = Depends(require_verified), db: Session = Depends(get_db)):
    """Remove a price (disables auto-expense for this item)."""
    db.query(HouseholdPrice).filter(
        HouseholdPrice.household_id == user.household_id,
        HouseholdPrice.item == item,
    ).delete()
    db.commit()
