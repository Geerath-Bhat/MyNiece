import csv
import io
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models.expense import Expense
from app.models.baby import Baby
from app.models.user import User
from app.schemas.expense import ExpenseIn, ExpenseOut, ExpensePatch, ExpenseSummaryOut

router = APIRouter(prefix="/expenses", tags=["expenses"])

CATEGORIES = ("diapers", "medicine", "products", "doctor", "other")


def _assert_baby(db: Session, baby_id: str, user: User) -> Baby:
    baby = db.query(Baby).get(baby_id)
    if not baby or baby.household_id != user.household_id:
        raise HTTPException(404, "Baby not found")
    return baby


@router.get("", response_model=dict)
def list_expenses(baby_id: str, month: str | None = None, category: str | None = None,
                  limit: int = 50,
                  user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _assert_baby(db, baby_id, user)
    q = db.query(Expense).filter(Expense.baby_id == baby_id)
    if month:  # YYYY-MM
        y, m = month.split("-")
        q = q.filter(Expense.date >= date(int(y), int(m), 1))
        next_m = int(m) % 12 + 1
        next_y = int(y) + (1 if int(m) == 12 else 0)
        q = q.filter(Expense.date < date(next_y, next_m, 1))
    if category:
        q = q.filter(Expense.category == category)
    items = q.order_by(Expense.date.desc()).limit(limit).all()
    total = sum(float(i.amount) for i in items)
    return {"total_amount": total, "items": [ExpenseOut.model_validate(i) for i in items]}


@router.post("", response_model=ExpenseOut, status_code=201)
def create_expense(body: ExpenseIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _assert_baby(db, body.baby_id, user)
    e = Expense(user_id=user.id, **body.model_dump())
    db.add(e)
    db.commit()
    db.refresh(e)
    return e


@router.patch("/{expense_id}", response_model=ExpenseOut)
def patch_expense(expense_id: str, body: ExpensePatch,
                  user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    e = db.query(Expense).get(expense_id)
    if not e:
        raise HTTPException(404)
    _assert_baby(db, e.baby_id, user)
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(e, k, v)
    db.commit()
    db.refresh(e)
    return e


@router.delete("/{expense_id}", status_code=204)
def delete_expense(expense_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    e = db.query(Expense).get(expense_id)
    if not e:
        raise HTTPException(404)
    _assert_baby(db, e.baby_id, user)
    db.delete(e)
    db.commit()


@router.get("/summary", response_model=ExpenseSummaryOut)
def expense_summary(baby_id: str, month: str | None = None,
                    user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _assert_baby(db, baby_id, user)
    q = db.query(Expense).filter(Expense.baby_id == baby_id)
    if month:
        y, m = month.split("-")
        q = q.filter(Expense.date >= date(int(y), int(m), 1))
        next_m = int(m) % 12 + 1
        next_y = int(y) + (1 if int(m) == 12 else 0)
        q = q.filter(Expense.date < date(next_y, next_m, 1))
    items = q.all()
    by_cat: dict[str, float] = {c: 0.0 for c in CATEGORIES}
    for i in items:
        by_cat[i.category] = by_cat.get(i.category, 0.0) + float(i.amount)
    return ExpenseSummaryOut(total=sum(by_cat.values()), by_category=by_cat)


@router.get("/export")
def export_expenses(baby_id: str, from_date: date | None = None, to_date: date | None = None,
                    user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _assert_baby(db, baby_id, user)
    q = db.query(Expense).filter(Expense.baby_id == baby_id)
    if from_date:
        q = q.filter(Expense.date >= from_date)
    if to_date:
        q = q.filter(Expense.date <= to_date)
    items = q.order_by(Expense.date).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Category", "Amount", "Note"])
    for i in items:
        writer.writerow([i.date, i.category, float(i.amount), i.note or ""])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=expenses.csv"},
    )
