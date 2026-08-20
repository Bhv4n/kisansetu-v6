import uuid
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.db.session import get_db, SessionLocal
from app.core.deps import get_current_user
from app.core.security import decode_token
from app.models.ops import ChatThread, ChatMessage
from app.models.core import User, BuyerProfile, SellerProfile

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


class ConnectionManager:
    def __init__(self):
        self.active: dict[str, list[WebSocket]] = {}

    async def connect(self, thread_id: str, ws: WebSocket):
        await ws.accept()
        self.active.setdefault(thread_id, []).append(ws)

    def disconnect(self, thread_id: str, ws: WebSocket):
        if thread_id in self.active and ws in self.active[thread_id]:
            self.active[thread_id].remove(ws)

    async def broadcast(self, thread_id: str, message: dict):
        for ws in self.active.get(thread_id, []):
            await ws.send_json(message)


manager = ConnectionManager()


def serialize_message(m: ChatMessage):
    return {"id": str(m.id), "thread_id": str(m.thread_id), "sender_id": str(m.sender_id), "body": m.body, "created_at": m.created_at.isoformat()}


def _assert_thread_party(thread: ChatThread, user: User, db: Session) -> None:
    if user.role in ("ADMIN", "FIELD_OFFICER"):
        return
    buyer = db.get(BuyerProfile, thread.buyer_id)
    seller = db.get(SellerProfile, thread.seller_id)
    allowed = {buyer.user_id if buyer else None, seller.user_id if seller else None}
    if user.id not in allowed:
        raise HTTPException(403, "You do not have access to this conversation")


@router.get("/{thread_id}")
def get_thread_history(thread_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    thread = db.get(ChatThread, thread_id)
    if not thread:
        raise HTTPException(404, "Thread not found")
    _assert_thread_party(thread, user, db)
    messages = db.query(ChatMessage).filter(ChatMessage.thread_id == thread_id).order_by(ChatMessage.created_at).all()
    return {"thread_id": str(thread.id), "messages": [serialize_message(m) for m in messages]}


@router.post("/{thread_id}/messages")
def post_message(thread_id: uuid.UUID, payload: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    thread = db.get(ChatThread, thread_id)
    if not thread:
        raise HTTPException(404, "Thread not found")
    _assert_thread_party(thread, user, db)
    msg = ChatMessage(thread_id=thread_id, sender_id=user.id, body=payload["body"])
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return serialize_message(msg)


@router.websocket("/ws/{thread_id}")
async def chat_websocket(websocket: WebSocket, thread_id: str, token: str = ""):
    payload = decode_token(token)
    if not payload:
        await websocket.close(code=4401)
        return

    verify_db = SessionLocal()
    try:
        thread = verify_db.get(ChatThread, uuid.UUID(thread_id))
        user = verify_db.get(User, uuid.UUID(payload["sub"]))
        if not thread or not user:
            await websocket.close(code=4404)
            return
        try:
            _assert_thread_party(thread, user, verify_db)
        except HTTPException:
            await websocket.close(code=4403)
            return
    finally:
        verify_db.close()

    await manager.connect(thread_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            db = SessionLocal()
            try:
                msg = ChatMessage(thread_id=uuid.UUID(thread_id), sender_id=uuid.UUID(payload["sub"]), body=data["body"])
                db.add(msg)
                db.commit()
                db.refresh(msg)
                await manager.broadcast(thread_id, serialize_message(msg))
            finally:
                db.close()
    except WebSocketDisconnect:
        manager.disconnect(thread_id, websocket)
