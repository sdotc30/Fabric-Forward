from app import db, Recipient
from datetime import datetime
import logging

def delete_expired_requests():
    now = datetime.now()
    try:
        expired = Recipient.query.filter(Recipient.expiry_time < now).all()
        count = len(expired)

        for request in expired:
            db.session.delete(request)

        db.session.commit()
        print(f"🗑️ Deleted {count} expired food requests.")
    except Exception as e:
        db.session.rollback()
        logging.error(f"Cleanup Error: {str(e)}")

if __name__ == "__main__":
    delete_expired_requests()
