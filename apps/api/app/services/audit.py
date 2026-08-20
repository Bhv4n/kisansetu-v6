import uuid
from sqlalchemy.orm import Session

from app.models.ops import AuditLog, Notification


def log_action(db: Session, actor_id, action: str, entity_type: str, entity_id=None, before=None, after=None):
    entry = AuditLog(
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        before_json=before,
        after_json=after,
    )
    db.add(entry)
    return entry


def notify(db: Session, user_id, title: str, body: str = None, link: str = None):
    n = Notification(user_id=user_id, title=title, body=body, link=link)
    db.add(n)
    return n
