"""Tool: edit_conditional_order — Edit a pending conditional order."""

import json
from sqlalchemy.orm import Session
from models import User, PendingOrder

def run(db: Session, user: User, order_id: int, action: str, quantity: int, conditions: list[dict]) -> dict:
    order = db.query(PendingOrder).filter(PendingOrder.id == order_id, PendingOrder.user_id == user.id).first()
    if not order:
        return {"error": f"Pending order #{order_id} not found."}
        
    if action not in ("buy", "sell"):
        return {"error": f"Invalid action: {action}"}
        
    order.action = action.lower()
    order.quantity = quantity
    order.conditions = json.dumps(conditions)
    
    db.commit()
    
    return {"success": True, "message": f"Successfully updated order #{order_id}."}
