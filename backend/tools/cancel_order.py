"""Tool: cancel_order — Delete a pending order."""

from sqlalchemy.orm import Session
from models import User, PendingOrder

def run(db: Session, user: User, order_id: int) -> dict:
    order = db.query(PendingOrder).filter(PendingOrder.id == order_id, PendingOrder.user_id == user.id).first()
    if not order:
        return {"error": f"Pending order #{order_id} not found."}
        
    db.delete(order)
    db.commit()
    
    return {"success": True, "message": f"Successfully cancelled order #{order_id}."}
